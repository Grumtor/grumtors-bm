import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, hashPassword } from '@/lib/auth'

// Helper function to charge pending requests
async function chargePendingRequests(userId: string, availableCredits: number) {
  const pendingRequests = await prisma.bMRequest.findMany({
    where: { userId, creditsPending: true },
    orderBy: { createdAt: 'asc' },
  })

  let remainingCredits = availableCredits

  for (const req of pendingRequests) {
    if (!req.creditsCharged) continue
    if (remainingCredits >= req.creditsCharged) {
      remainingCredits -= req.creditsCharged

      await prisma.$transaction([
        prisma.bMRequest.update({
          where: { id: req.id },
          data: { creditsPending: false },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { credits: { decrement: req.creditsCharged } },
        }),
        prisma.transaction.create({
          data: {
            userId,
            type: 'SEARCH_DEBIT',
            amount: -req.creditsCharged,
            description: `Débit différé: ${req.instagramInput}`,
            balanceAfter: remainingCredits,
            requestId: req.id,
          },
        }),
      ])
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || ''

    // If userId is provided, return detailed user info
    if (userId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          telegram: true,
          credits: true,
          isUnlimited: true,
          isPremium: true,
          isAdmin: true,
          createdAt: true,
        },
      })

      if (!targetUser) {
        return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
      }

      const [requests, brandings, transactions] = await Promise.all([
        prisma.bMRequest.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            businessManager: { select: { bmLink: true, bmId: true, bmName: true } },
          },
        }),
        prisma.branding.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          select: { id: true, name: true, username: true, displayName: true, profilePic: true, createdAt: true },
        }),
        prisma.transaction.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ])

      return NextResponse.json({ user: targetUser, requests, brandings, transactions })
    }

    // List all users
    const where = search
      ? { OR: [
          { username: { contains: search, mode: 'insensitive' as const } }, 
          { telegram: { contains: search, mode: 'insensitive' as const } }
        ] }
      : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          username: true,
          telegram: true,
          credits: true,
          isUnlimited: true,
          isPremium: true,
          isAdmin: true,
          createdAt: true,
          _count: { select: { requests: true, transactions: true, brandings: true } },
        },
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      users: users.map(u => ({ 
        ...u, 
        totalRequests: u._count.requests, 
        totalTransactions: u._count.transactions,
        totalBrandings: u._count.brandings,
      })),
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Admin get users error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await getCurrentUser(req)
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, action, amount, value, newPassword } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    if (action === 'add_credits' && typeof amount === 'number' && amount > 0) {
      const newBalance = targetUser.credits + amount
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { credits: newBalance } }),
        prisma.transaction.create({
          data: { 
            userId, 
            type: 'ADMIN_CREDIT', 
            amount, 
            description: `Crédits ajoutés par @${admin.username}`, 
            balanceAfter: newBalance 
          },
        }),
      ])
      
      // Auto-charge pending requests
      await chargePendingRequests(userId, newBalance)
      
      // Get updated balance
      const updatedUser = await prisma.user.findUnique({ where: { id: userId } })
      return NextResponse.json({ success: true, newBalance: updatedUser?.credits || newBalance })
    }

    if (action === 'remove_credits' && typeof amount === 'number' && amount > 0) {
      const newBalance = Math.max(0, targetUser.credits - amount)
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { credits: newBalance } }),
        prisma.transaction.create({
          data: { 
            userId, 
            type: 'ADMIN_DEBIT', 
            amount: -amount, 
            description: `Crédits retirés par @${admin.username}`, 
            balanceAfter: newBalance 
          },
        }),
      ])
      return NextResponse.json({ success: true, newBalance })
    }

    if (action === 'set_unlimited') {
      await prisma.user.update({ where: { id: userId }, data: { isUnlimited: !!value } })
      return NextResponse.json({ success: true })
    }

    if (action === 'set_premium') {
      await prisma.user.update({ where: { id: userId }, data: { isPremium: !!value } })
      return NextResponse.json({ success: true })
    }

    if (action === 'set_admin') {
      if (userId === admin.id && !value) {
        return NextResponse.json({ error: 'Vous ne pouvez pas retirer vos propres droits admin' }, { status: 400 })
      }
      await prisma.user.update({ where: { id: userId }, data: { isAdmin: !!value } })
      return NextResponse.json({ success: true })
    }

    if (action === 'change_password' && newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 })
      }
      const passwordHash = await hashPassword(newPassword)
      await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
      return NextResponse.json({ success: true, message: 'Mot de passe modifié' })
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  } catch (error) {
    console.error('Admin update user error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
