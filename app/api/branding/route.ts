import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (!user.isPremium && !user.isAdmin) return NextResponse.json({ error: 'Accès réservé aux utilisateurs Premium' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const branding = await prisma.branding.findFirst({ where: { id, userId: user.id } })
      if (!branding) return NextResponse.json({ error: 'Branding non trouvé' }, { status: 404 })
      return NextResponse.json({ branding })
    }

    const brandings = await prisma.branding.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, username: true, displayName: true, profilePic: true, createdAt: true, updatedAt: true },
    })

    return NextResponse.json({ brandings })
  } catch (error) {
    console.error('Get brandings error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (!user.isPremium && !user.isAdmin) return NextResponse.json({ error: 'Accès réservé aux utilisateurs Premium' }, { status: 403 })

    const body = await req.json()
    const { name, username, displayName, bio, website, profilePic, followers, following, posts, isVerified, highlights, reels, postsData, stories } = body

    if (!name) return NextResponse.json({ error: 'Nom du projet requis' }, { status: 400 })

    const branding = await prisma.branding.create({
      data: { userId: user.id, name, username, displayName, bio, website, profilePic, followers, following, posts, isVerified: isVerified || false, highlights, reels, postsData, stories },
    })

    return NextResponse.json({ success: true, branding })
  } catch (error) {
    console.error('Create branding error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (!user.isPremium && !user.isAdmin) return NextResponse.json({ error: 'Accès réservé aux utilisateurs Premium' }, { status: 403 })

    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    const existing = await prisma.branding.findFirst({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'Branding non trouvé' }, { status: 404 })

    const branding = await prisma.branding.update({ where: { id }, data: updates })
    return NextResponse.json({ success: true, branding })
  } catch (error) {
    console.error('Update branding error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    const existing = await prisma.branding.findFirst({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'Branding non trouvé' }, { status: 404 })

    await prisma.branding.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete branding error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
