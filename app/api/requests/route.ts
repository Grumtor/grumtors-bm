import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

function cleanInstagramInput(input: string): { display: string; searchKey: string } {
  const trimmed = input.trim()
  
  // If it's a full URL, keep it as display but extract key for dedup
  if (trimmed.includes('instagram.com') || trimmed.includes('instagr.am')) {
    return { display: trimmed, searchKey: trimmed.toLowerCase() }
  }
  
  // If it starts with @, keep it
  if (trimmed.startsWith('@')) {
    return { display: trimmed, searchKey: trimmed.toLowerCase() }
  }
  
  // Otherwise add @ prefix
  return { display: `@${trimmed}`, searchKey: `@${trimmed.toLowerCase()}` }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    const { instagramInput } = body

    if (!instagramInput || typeof instagramInput !== 'string') {
      return NextResponse.json({ error: 'Compte Instagram requis' }, { status: 400 })
    }

    const { display, searchKey } = cleanInstagramInput(instagramInput)

    if (!display || display.length < 2) {
      return NextResponse.json({ error: 'Compte Instagram invalide' }, { status: 400 })
    }

    // Check for existing pending request with same search key
    const existingPending = await prisma.bMRequest.findFirst({
      where: { userId: user.id, instagramUsername: searchKey, status: 'PENDING' },
    })

    if (existingPending) {
      return NextResponse.json({ error: 'Une demande est déjà en cours pour ce compte' }, { status: 400 })
    }

    const request = await prisma.bMRequest.create({
      data: {
        userId: user.id,
        instagramInput: display,
        instagramUsername: searchKey,
      },
    })

    return NextResponse.json({
      success: true,
      request: {
        id: request.id,
        instagramInput: request.instagramInput,
        status: request.status,
        createdAt: request.createdAt,
      },
      message: 'Votre demande a été soumise. Vous serez notifié une fois traitée.',
    })
  } catch (error) {
    console.error('Request submission error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = { userId: user.id }
    if (status) where.status = status

    const [requests, total] = await Promise.all([
      prisma.bMRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          businessManager: {
            select: { id: true, bmId: true, bmName: true, bmLink: true },
          },
        },
      }),
      prisma.bMRequest.count({ where }),
    ])

    const formattedRequests = requests.map(r => {
      const canSeeBM = !r.creditsPending && r.status !== 'PENDING'
      return {
        id: r.id,
        instagramInput: r.instagramInput,
        status: r.status,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
        creditsCharged: r.creditsCharged,
        creditsPending: r.creditsPending,
        businessManager: canSeeBM && r.businessManager ? r.businessManager : null,
        hasBM: r.status === 'APPROVED',
      }
    })

    return NextResponse.json({ requests: formattedRequests, total, limit, offset })
  } catch (error) {
    console.error('Get requests error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
