import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { generateToken, hashPassword } from '@/lib/auth'
import { z } from 'zod'

const registerSchema = z.object({
  username: z.string()
    .min(3, 'Le pseudo doit contenir au moins 3 caractères')
    .max(20, 'Le pseudo ne peut pas dépasser 20 caractères')
    .regex(/^[a-zA-Z0-9_]+$/, 'Le pseudo ne peut contenir que des lettres, chiffres et underscores'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  telegram: z.string().regex(/^@?[a-zA-Z0-9_]{5,32}$/, 'Format Telegram invalide').optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password, telegram } = registerSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Ce pseudo est déjà utilisé' }, { status: 400 })
    }

    const token = generateToken()
    const passwordHash = await hashPassword(password)

    // Get signup bonus from settings
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } })
    const signupBonus = settings?.signupBonus || 10

    const telegramHandle = telegram ? (telegram.startsWith('@') ? telegram : `@${telegram}`) : null

    const user = await prisma.user.create({
      data: {
        token,
        passwordHash,
        username: username.toLowerCase(),
        telegram: telegramHandle,
        credits: signupBonus,
      },
    })

    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'SIGNUP_BONUS',
        amount: signupBonus,
        description: 'Bonus de bienvenue',
        balanceAfter: signupBonus,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès',
      token: token,
      username: user.username,
      credits: user.credits,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
