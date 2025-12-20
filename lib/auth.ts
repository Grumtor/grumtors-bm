import { NextRequest } from 'next/server'
import prisma from './prisma'
import bcrypt from 'bcryptjs'

export function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 48; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return `grm_${result}`
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function getCurrentUser(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  if (!token.startsWith('grm_')) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      username: true,
      telegram: true,
      credits: true,
      isUnlimited: true,
      isPremium: true,
      isAdmin: true,
    },
  })

  return user
}
