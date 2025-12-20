import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  token: z.string().min(1, 'Token requis').startsWith('grm_', 'Token invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, password } = loginSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        passwordHash: true,
        username: true,
        telegram: true,
        credits: true,
        isUnlimited: true,
        isPremium: true,
        isAdmin: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Token ou mot de passe incorrect' }, { status: 401 })
    }

    const isValid = await verifyPassword(password, user.passwordHash)

    if (!isValid) {
      return NextResponse.json({ error: 'Token ou mot de passe incorrect' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        token: user.token,
        username: user.username,
        telegram: user.telegram,
        credits: user.credits,
        isUnlimited: user.isUnlimited,
        isPremium: user.isPremium,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
