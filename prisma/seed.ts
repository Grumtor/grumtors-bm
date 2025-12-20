const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 48; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return `grm_${result}`
}

async function main() {
  console.log('🌱 Seeding database...')

  await prisma.settings.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      creditsPerSearch: 10,
      failedSearchCredits: 2,
      signupBonus: 10,
      maintenanceMode: false,
      telegramContact: '@Grumtor',
    },
  })
  console.log('✅ Settings created')

  const adminPassword = 'admin123456'
  const token = generateToken()
  const passwordHash = bcrypt.hashSync(adminPassword, 12)

  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  })

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        token,
        passwordHash,
        username: 'admin',
        isAdmin: true,
        isPremium: true,
        credits: 999999,
        isUnlimited: true,
      },
    })

    console.log('✅ Admin user created')
    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔐 ADMIN CREDENTIALS (SAVE THESE!)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Token:    ' + token)
    console.log('Password: ' + adminPassword)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  } else {
    console.log('ℹ️  Admin user already exists')
  }

  console.log('')
  console.log('🎉 Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
