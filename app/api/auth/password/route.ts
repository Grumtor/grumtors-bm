import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPassword, hashPassword } from '@/lib/auth'
import { z } from 'zod'

const changePasswordSchema = z.object({
  token: z.string().min(1, 'Token requis').startsWith('grm_', 'Token invalide'),
  username: z.string().min(1, 'Pseudo requis'),
  oldPassword: z.string().min(1, 'Ancien mot de passe requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, username, oldPassword, newPassword } = changePasswordSchema.parse(body)

    // Find user by token AND username (double verification)
    const user = await prisma.user.findFirst({
      where: { 
        token,
        username: username.toLowerCase(),
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Token ou pseudo incorrect' }, { status: 401 })
    }

    // Verify old password
    const isValidPassword = await verifyPassword(oldPassword, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Ancien mot de passe incorrect' }, { status: 401 })
    }

    // Hash and update new password
    const newPasswordHash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Mot de passe modifié avec succès' 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
