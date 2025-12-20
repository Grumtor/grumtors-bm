import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// Tags format: { "Category1": ["value1", "value2"], "Category2": ["value3"] }

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!user.isPremium && !user.isAdmin) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const filterCategory = searchParams.get('filterCategory') || ''
    const filterValue = searchParams.get('filterValue') || ''

    // Get user's approved requests with BM info
    const approvedRequests = await prisma.bMRequest.findMany({
      where: { 
        userId: user.id, 
        status: 'APPROVED',
        businessManagerId: { not: null }
      },
      include: {
        businessManager: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get personal BM data (tags)
    const personalBMs = await prisma.personalBM.findMany({
      where: { userId: user.id },
    })

    // Create a map for quick lookup
    const personalBMMap = new Map(personalBMs.map(p => [p.instagramUsername, p]))

    // Combine data
    let items = approvedRequests.map(req => {
      const personal = personalBMMap.get(req.instagramUsername)
      return {
        id: req.id,
        instagramInput: req.instagramInput,
        instagramUsername: req.instagramUsername,
        bmLink: req.businessManager?.bmLink,
        bmId: req.businessManager?.bmId,
        bmName: req.businessManager?.bmName,
        tags: personal?.tags || {},
        personalBMId: personal?.id,
        createdAt: req.createdAt,
      }
    })

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      items = items.filter(i => 
        i.instagramInput?.toLowerCase().includes(searchLower) ||
        i.instagramUsername?.toLowerCase().includes(searchLower) ||
        i.bmName?.toLowerCase().includes(searchLower)
      )
    }

    // Apply tag filter
    if (filterCategory && filterValue) {
      items = items.filter(i => {
        const tags = i.tags as Record<string, string[]> || {}
        return tags[filterCategory]?.includes(filterValue)
      })
    }

    // Get user's filter categories
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    })

    const filterCategories = (userSettings?.filterCategories as Record<string, string[]>) || {}

    return NextResponse.json({ items, filterCategories })
  } catch (error) {
    console.error('Get collection error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}

// Update tags for an item
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!user.isPremium && !user.isAdmin) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const body = await req.json()
    const { instagramUsername, tags } = body

    if (!instagramUsername) {
      return NextResponse.json({ error: 'Instagram username required' }, { status: 400 })
    }

    // Upsert personal BM
    const personalBM = await prisma.personalBM.upsert({
      where: { 
        userId_instagramUsername: { 
          userId: user.id, 
          instagramUsername 
        } 
      },
      update: { tags },
      create: {
        userId: user.id,
        instagramUsername,
        tags,
      },
    })

    return NextResponse.json({ success: true, item: personalBM })
  } catch (error) {
    console.error('Update tags error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}

// Manage filter categories
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!user.isPremium && !user.isAdmin) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const body = await req.json()
    const { action, categoryName, valueName } = body

    // Get current settings
    let userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    })

    let filterCategories = (userSettings?.filterCategories as Record<string, string[]>) || {}

    if (action === 'addCategory' && categoryName) {
      if (!filterCategories[categoryName]) {
        filterCategories[categoryName] = []
      }
    } else if (action === 'removeCategory' && categoryName) {
      delete filterCategories[categoryName]
    } else if (action === 'addValue' && categoryName && valueName) {
      if (!filterCategories[categoryName]) {
        filterCategories[categoryName] = []
      }
      if (!filterCategories[categoryName].includes(valueName)) {
        filterCategories[categoryName].push(valueName)
      }
    } else if (action === 'removeValue' && categoryName && valueName) {
      if (filterCategories[categoryName]) {
        filterCategories[categoryName] = filterCategories[categoryName].filter((v: string) => v !== valueName)
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Save settings
    userSettings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: { filterCategories },
      create: { userId: user.id, filterCategories },
    })

    return NextResponse.json({ success: true, filterCategories })
  } catch (error) {
    console.error('Manage filters error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
