import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'PENDING'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || ''

    const where: any = {}
    if (status !== 'ALL') where.status = status
    
    // Search by username or instagram input
    if (search) {
      where.OR = [
        { instagramInput: { contains: search, mode: 'insensitive' } },
        { instagramUsername: { contains: search, mode: 'insensitive' } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [requests, total, pendingCount] = await Promise.all([
      prisma.bMRequest.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
        include: {
          user: { select: { id: true, username: true, credits: true, isPremium: true, isUnlimited: true } },
          businessManager: true,
        },
      }),
      prisma.bMRequest.count({ where }),
      prisma.bMRequest.count({ where: { status: 'PENDING' } }),
    ])

    return NextResponse.json({ 
      requests: requests.map(r => ({
        ...r,
        instagramDisplay: r.instagramInput || r.instagramUsername,
      })), 
      total, 
      pendingCount, 
      limit, 
      offset 
    })
  } catch (error) {
    console.error('Admin get requests error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { requestId, action, bmLink, bmId, bmName } = body

    if (!requestId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }

    const request = await prisma.bMRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    })

    if (!request) {
      return NextResponse.json({ error: 'Demande non trouvée' }, { status: 404 })
    }

    const settings = await prisma.settings.findUnique({ where: { id: 'global' } })
    const creditsForSuccess = settings?.creditsPerSearch || 10
    const creditsForFail = settings?.failedSearchCredits || 2

    const creditsToCharge = action === 'approve' ? creditsForSuccess : creditsForFail
    const userCredits = request.user.credits
    const isPremiumOrUnlimited = request.user.isPremium || request.user.isUnlimited
    const hasEnoughCredits = isPremiumOrUnlimited || userCredits >= creditsToCharge

    let businessManagerId: string | null = null

    if (action === 'approve') {
      if (!bmLink && !bmId && !bmName) {
        return NextResponse.json({ error: 'Lien BM ou ID/Nom du BM requis' }, { status: 400 })
      }

      let bm = await prisma.businessManager.findUnique({
        where: { instagramUsername: request.instagramUsername },
      })

      if (bm) {
        bm = await prisma.businessManager.update({
          where: { id: bm.id },
          data: { 
            bmLink: bmLink || bm.bmLink, 
            bmId: bmId || bm.bmId, 
            bmName: bmName || bm.bmName,
            instagramInput: request.instagramInput,
          },
        })
      } else {
        bm = await prisma.businessManager.create({
          data: {
            instagramUsername: request.instagramUsername,
            instagramInput: request.instagramInput,
            bmLink, 
            bmId, 
            bmName,
            createdBy: user.id,
          },
        })
      }
      businessManagerId = bm.id
    }

    const updatedRequest = await prisma.bMRequest.update({
      where: { id: requestId },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: user.id,
        businessManagerId,
        creditsCharged: creditsToCharge,
        creditsPending: !hasEnoughCredits,
      },
    })

    if (hasEnoughCredits && !isPremiumOrUnlimited) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: request.userId }, data: { credits: { decrement: creditsToCharge } } }),
        prisma.transaction.create({
          data: {
            userId: request.userId,
            type: 'SEARCH_DEBIT',
            amount: -creditsToCharge,
            description: action === 'approve' 
              ? `BM trouvé: ${request.instagramInput}` 
              : `Pas de BM: ${request.instagramInput}`,
            balanceAfter: userCredits - creditsToCharge,
            requestId: request.id,
          },
        }),
      ])
    }

    return NextResponse.json({ 
      success: true, 
      request: updatedRequest, 
      creditsCharged: hasEnoughCredits ? creditsToCharge : 0, 
      creditsPending: !hasEnoughCredits 
    })
  } catch (error) {
    console.error('Admin review request error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { requestId, action } = body

    if (!requestId) {
      return NextResponse.json({ error: 'requestId requis' }, { status: 400 })
    }

    const request = await prisma.bMRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    })

    if (!request) {
      return NextResponse.json({ error: 'Demande non trouvée' }, { status: 404 })
    }

    if (action === 'undo') {
      if (request.creditsCharged && !request.creditsPending) {
        await prisma.$transaction([
          prisma.user.update({ where: { id: request.userId }, data: { credits: { increment: request.creditsCharged } } }),
          prisma.transaction.create({
            data: {
              userId: request.userId,
              type: 'REFUND',
              amount: request.creditsCharged,
              description: `Remboursement: ${request.instagramInput}`,
              balanceAfter: request.user.credits + request.creditsCharged,
              requestId: request.id,
            },
          }),
        ])
      }

      await prisma.bMRequest.update({
        where: { id: requestId },
        data: { 
          status: 'PENDING', 
          reviewedAt: null, 
          reviewedBy: null, 
          businessManagerId: null, 
          creditsCharged: null, 
          creditsPending: false 
        },
      })

      return NextResponse.json({ success: true, message: 'Demande remise en attente' })
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  } catch (error) {
    console.error('Admin patch request error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
