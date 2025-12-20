import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        token: true,
        username: true,
        telegram: true,
        credits: true,
        isUnlimited: true,
        isPremium: true,
        isAdmin: true,
        createdAt: true,
        _count: { select: { requests: true, transactions: true } },
      },
    })

    if (!fullUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const [pendingRequests, approvedRequests, rejectedRequests] = await Promise.all([
      prisma.bMRequest.count({ where: { userId: user.id, status: 'PENDING' } }),
      prisma.bMRequest.count({ where: { userId: user.id, status: 'APPROVED' } }),
      prisma.bMRequest.count({ where: { userId: user.id, status: 'REJECTED' } }),
    ])

    return NextResponse.json({
      user: {
        id: fullUser.id,
        token: fullUser.token,
        username: fullUser.username,
        telegram: fullUser.telegram,
        credits: fullUser.credits,
        isUnlimited: fullUser.isUnlimited,
        isPremium: fullUser.isPremium,
        isAdmin: fullUser.isAdmin,
        createdAt: fullUser.createdAt,
        totalRequests: fullUser._count.requests,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
      },
      transactions,
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
