'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Search, Crown, Plus, Trash2, ExternalLink, X, Instagram, Filter, Tag, MessageCircle, MoreVertical, Settings, ChevronDown } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { useAuth, useLanguage } from '@/app/providers'
import { formatRelativeTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface CollectionItem {
  id: string
  instagramInput: string | null
  instagramUsername: string
  bmLink: string | null
  bmId: string | null
  bmName: string | null
  tags: Record<string, string[]>
  personalBMId: string | null
  createdAt: string
}

interface FilterCategories {
  [category: string]: string[]
}

export default function CollectionPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { t } = useLanguage()

  const [items, setItems] = useState<CollectionItem[]>([])
  const [filterCategories, setFilterCategories] = useState<FilterCategories>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [activeFilter, setActiveFilter] = useState({ category: '', value: '' })
  const [showFilterManager, setShowFilterManager] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newValueName, setNewValueName] = useState('')
  const [selectedCategoryForValue, setSelectedCategoryForValue] = useState('')

  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [tagMenuOpen, setTagMenuOpen] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login')
    else if (!isLoading && user && !user.isPremium && !user.isAdmin) {
      router.push('/dashboard')
      toast.error('Premium access required')
    }
  }, [isLoading, user, router])

  useEffect(() => { if (user && (user.isPremium || user.isAdmin)) fetchData() }, [user])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setTagMenuOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (activeFilter.category && activeFilter.value) {
        params.append('filterCategory', activeFilter.category)
        params.append('filterValue', activeFilter.value)
      }

      const res = await fetch(`/api/collection?${params}`, { headers: { 'Authorization': `Bearer ${user.token}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(data.items || [])
      setFilterCategories(data.filterCategories || {})
    } catch (error: any) { toast.error(error.message) }
    finally { setLoading(false) }
  }

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchData() }

  const applyFilter = (category: string, value: string) => {
    if (activeFilter.category === category && activeFilter.value === value) {
      setActiveFilter({ category: '', value: '' })
    } else {
      setActiveFilter({ category, value })
    }
  }

  useEffect(() => { if (user) fetchData() }, [activeFilter])

  const addCategory = async () => {
    if (!user || !newCategoryName.trim()) return
    try {
      const res = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ action: 'addCategory', categoryName: newCategoryName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFilterCategories(data.filterCategories)
      setNewCategoryName('')
      toast.success('Category added!')
    } catch (error: any) { toast.error(error.message) }
  }

  const removeCategory = async (categoryName: string) => {
    if (!user || !confirm(`Delete category "${categoryName}"?`)) return
    try {
      const res = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ action: 'removeCategory', categoryName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFilterCategories(data.filterCategories)
      if (activeFilter.category === categoryName) setActiveFilter({ category: '', value: '' })
      toast.success('Category deleted')
    } catch (error: any) { toast.error(error.message) }
  }

  const addValue = async () => {
    if (!user || !selectedCategoryForValue || !newValueName.trim()) return
    try {
      const res = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ action: 'addValue', categoryName: selectedCategoryForValue, valueName: newValueName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFilterCategories(data.filterCategories)
      setNewValueName('')
      toast.success('Filter added!')
    } catch (error: any) { toast.error(error.message) }
  }

  const removeValue = async (categoryName: string, valueName: string) => {
    if (!user) return
    try {
      const res = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ action: 'removeValue', categoryName, valueName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFilterCategories(data.filterCategories)
      toast.success('Filter removed')
    } catch (error: any) { toast.error(error.message) }
  }

  const toggleTag = async (item: CollectionItem, category: string, value: string) => {
    if (!user) return
    const currentTags = item.tags || {}
    const categoryTags = currentTags[category] || []
    
    let newCategoryTags: string[]
    if (categoryTags.includes(value)) {
      newCategoryTags = categoryTags.filter((v: string) => v !== value)
    } else {
      newCategoryTags = [...categoryTags, value]
    }

    const newTags = { ...currentTags, [category]: newCategoryTags }
    if (newCategoryTags.length === 0) delete newTags[category]

    try {
      const res = await fetch('/api/collection', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ instagramUsername: item.instagramUsername, tags: newTags }),
      })
      if (!res.ok) throw new Error('Error')
      
      // Update local state
      setItems(items.map(i => i.id === item.id ? { ...i, tags: newTags } : i))
    } catch { toast.error('Error updating tags') }
  }

  const isLink = (text: string | null) => text && (text.includes('instagram.com') || text.includes('instagr.am'))

  if (isLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  if (!user || (!user.isPremium && !user.isAdmin)) return null

  const categoryList = Object.keys(filterCategories)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="btn btn-ghost p-2"><ArrowLeft className="w-5 h-5" /></Link>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{t('myCollection')}</span>
                <span className="badge badge-premium"><Crown className="w-3 h-3" /> {t('premium')}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowFilterManager(true)} className="btn btn-secondary"><Settings className="w-4 h-4" /> Filters</button>
              <a href="https://t.me/Grumtor" target="_blank" rel="noopener noreferrer" className="btn btn-ghost p-2"><MessageCircle className="w-5 h-5" /></a>
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10 w-full" placeholder={`${t('search')}...`} />
            </div>
            <button type="submit" className="btn btn-primary"><Search className="w-4 h-4" /></button>
          </div>
        </form>

        {/* Active Filters */}
        {categoryList.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-muted-foreground flex items-center gap-1"><Filter className="w-4 h-4" /></span>
            {categoryList.map(cat => (
              <div key={cat} className="relative group">
                <button className="btn btn-secondary py-1 px-3 text-sm flex items-center gap-1">
                  {cat} <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute top-full left-0 mt-1 bg-card border rounded-lg shadow-lg py-1 min-w-[120px] hidden group-hover:block z-20">
                  {filterCategories[cat]?.map(val => (
                    <button key={val} onClick={() => applyFilter(cat, val)} className={`w-full text-left px-3 py-1.5 text-sm hover:bg-secondary transition ${activeFilter.category === cat && activeFilter.value === val ? 'bg-primary/10 text-primary' : ''}`}>
                      {val}
                    </button>
                  ))}
                  {(!filterCategories[cat] || filterCategories[cat].length === 0) && (
                    <p className="px-3 py-1.5 text-sm text-muted-foreground">No filters</p>
                  )}
                </div>
              </div>
            ))}
            {activeFilter.category && (
              <button onClick={() => setActiveFilter({ category: '', value: '' })} className="btn btn-ghost py-1 px-2 text-sm text-red-500">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        )}

        {activeFilter.value && (
          <div className="mb-4 px-3 py-2 bg-primary/10 rounded-lg inline-flex items-center gap-2">
            <span className="text-sm">Filtered by: <strong>{activeFilter.category}</strong> → {activeFilter.value}</span>
            <button onClick={() => setActiveFilter({ category: '', value: '' })} className="hover:text-red-500"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b bg-secondary/30 flex items-center justify-between">
            <h2 className="font-semibold">{items.length} BM{items.length !== 1 ? 's' : ''}</h2>
          </div>
          {items.length > 0 ? (
            <div className="divide-y">
              {items.map((item) => (
                <div key={item.id} className="p-4 flex items-start gap-4 hover:bg-secondary/20 transition relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Instagram className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isLink(item.instagramInput) ? (
                        <a href={item.instagramInput!} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline flex items-center gap-1">
                          {item.instagramInput!.length > 35 ? item.instagramInput!.substring(0, 35) + '...' : item.instagramInput}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="font-bold">{item.instagramInput || `@${item.instagramUsername}`}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm mb-2">
                      {item.bmLink && (
                        <a href={item.bmLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          {item.bmName || 'BM Link'} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {!item.bmLink && item.bmName && <span><strong>BM:</strong> {item.bmName}</span>}
                      {item.bmId && <span className="text-muted-foreground">ID: {item.bmId}</span>}
                    </div>
                    {/* Tags display */}
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(item.tags || {}).map(([cat, values]) => 
                        (values as string[]).map(val => (
                          <span key={`${cat}-${val}`} className="badge bg-primary/10 text-primary text-xs">
                            {cat}: {val}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">{formatRelativeTime(item.createdAt)}</div>
                  
                  {/* Tag Menu */}
                  <div className="relative" ref={tagMenuOpen === item.id ? menuRef : null}>
                    <button onClick={() => setTagMenuOpen(tagMenuOpen === item.id ? null : item.id)} className="btn btn-ghost p-2">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {tagMenuOpen === item.id && (
                      <div className="absolute right-0 top-full mt-1 bg-card border rounded-lg shadow-xl py-2 min-w-[200px] z-30 animate-fade-in">
                        <p className="px-3 py-1 text-xs text-muted-foreground font-medium">Add/Remove Tags</p>
                        {categoryList.length > 0 ? categoryList.map(cat => (
                          <div key={cat} className="px-3 py-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-1">{cat}</p>
                            <div className="flex flex-wrap gap-1">
                              {filterCategories[cat]?.map(val => {
                                const isActive = (item.tags?.[cat] || []).includes(val)
                                return (
                                  <button key={val} onClick={() => toggleTag(item, cat, val)} className={`px-2 py-0.5 rounded text-xs transition ${isActive ? 'bg-primary text-white' : 'bg-secondary hover:bg-secondary/80'}`}>
                                    {val}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )) : (
                          <p className="px-3 py-2 text-sm text-muted-foreground">No filter categories. Click "Filters" to create some.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Tag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{searchQuery || activeFilter.value ? 'No results' : 'No BMs yet. Search for some first!'}</p>
            </div>
          )}
        </div>
      </main>

      {/* Filter Manager Modal */}
      {showFilterManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-lg w-full animate-fade-in max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Manage Filter Categories</h3>
              <button onClick={() => setShowFilterManager(false)} className="btn btn-ghost p-2"><X className="w-5 h-5" /></button>
            </div>

            {/* Add Category */}
            <div className="mb-6">
              <label className="label block mb-2">Create New Category</label>
              <div className="flex gap-2">
                <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="input flex-1" placeholder="e.g. Hair Color, Language..." onKeyDown={(e) => e.key === 'Enter' && addCategory()} />
                <button onClick={addCategory} className="btn btn-primary"><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Categories List */}
            {categoryList.length > 0 ? (
              <div className="space-y-4">
                {categoryList.map(cat => (
                  <div key={cat} className="p-3 bg-secondary/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{cat}</h4>
                      <button onClick={() => removeCategory(cat)} className="btn btn-ghost p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {filterCategories[cat]?.map(val => (
                        <span key={val} className="badge bg-primary/10 text-primary flex items-center gap-1">
                          {val}
                          <button onClick={() => removeValue(cat, val)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                      {(!filterCategories[cat] || filterCategories[cat].length === 0) && (
                        <span className="text-xs text-muted-foreground">No filters yet</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={selectedCategoryForValue === cat ? newValueName : ''} onChange={(e) => { setSelectedCategoryForValue(cat); setNewValueName(e.target.value) }} className="input py-1.5 text-sm flex-1" placeholder="Add filter value..." onKeyDown={(e) => { if (e.key === 'Enter') { setSelectedCategoryForValue(cat); addValue() } }} onFocus={() => setSelectedCategoryForValue(cat)} />
                      <button onClick={() => { setSelectedCategoryForValue(cat); addValue() }} className="btn btn-secondary py-1.5"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No categories yet. Create one above!</p>
            )}

            <div className="mt-6 pt-4 border-t">
              <button onClick={() => setShowFilterManager(false)} className="btn btn-primary w-full">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
