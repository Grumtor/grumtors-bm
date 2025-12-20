'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Crown, Plus, Save, Trash2, User, ChevronLeft, ChevronRight, Heart, MessageCircle as MsgCircle, Send, Bookmark, MoreHorizontal, Home, Search as SearchIcon, PlusSquare, Film, Grid, Check, Download, X, Image as ImageIcon, FolderDown, MessageCircle } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { useAuth, useLanguage } from '@/app/providers'
import toast from 'react-hot-toast'

interface Branding {
  id: string
  name: string
  username: string | null
  displayName: string | null
  profilePic: string | null
}

interface Highlight {
  name: string
  images: string[]
}

interface Post {
  images: string[]
  likes: string
  caption: string
}

export default function BrandingPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { t } = useLanguage()
  const previewRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [brandings, setBrandings] = useState<Branding[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBranding, setSelectedBranding] = useState<Branding | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadTarget, setUploadTarget] = useState<{ type: string; index?: number } | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  const [form, setForm] = useState({
    name: '',
    username: '',
    displayName: '',
    bio: '',
    website: '',
    profilePic: '',
    followers: '1.2M',
    following: '234',
    posts: '847',
    isVerified: false,
    highlights: [] as Highlight[],
    postsData: [] as Post[],
  })

  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null)
  const [carouselIndex, setCarouselIndex] = useState(0)

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login')
    else if (!isLoading && user && !user.isPremium && !user.isAdmin) {
      router.push('/dashboard')
      toast.error('Premium access required')
    }
  }, [isLoading, user, router])

  useEffect(() => { if (user && (user.isPremium || user.isAdmin)) fetchBrandings() }, [user])

  const fetchBrandings = async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch('/api/branding', { headers: { 'Authorization': `Bearer ${user.token}` } })
      const data = await res.json()
      setBrandings(data.brandings || [])
    } catch { toast.error('Error loading projects') }
    finally { setLoading(false) }
  }

  const loadBranding = async (id: string) => {
    if (!user) return
    try {
      const res = await fetch(`/api/branding?id=${id}`, { headers: { 'Authorization': `Bearer ${user.token}` } })
      const data = await res.json()
      if (data.branding) {
        setSelectedBranding(data.branding)
        setForm({
          name: data.branding.name || '',
          username: data.branding.username || '',
          displayName: data.branding.displayName || '',
          bio: data.branding.bio || '',
          website: data.branding.website || '',
          profilePic: data.branding.profilePic || '',
          followers: data.branding.followers || '0',
          following: data.branding.following || '0',
          posts: data.branding.posts || '0',
          isVerified: data.branding.isVerified || false,
          highlights: data.branding.highlights || [],
          postsData: data.branding.postsData || [],
        })
      }
    } catch { toast.error('Error') }
  }

  const createProject = async () => {
    if (!user || !newProjectName.trim()) { toast.error('Project name required'); return }
    try {
      const res = await fetch('/api/branding', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` }, body: JSON.stringify({ name: newProjectName.trim() }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Project created!')
      setShowNewProjectModal(false)
      setNewProjectName('')
      fetchBrandings()
      loadBranding(data.branding.id)
    } catch (error: any) { toast.error(error.message) }
  }

  const saveBranding = async () => {
    if (!user || !form.name) { toast.error('Project name required'); return }
    setSaving(true)
    try {
      const method = selectedBranding ? 'PATCH' : 'POST'
      const body = selectedBranding ? { id: selectedBranding.id, ...form } : form
      const res = await fetch('/api/branding', { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Saved!')
      setSelectedBranding(data.branding)
      fetchBrandings()
    } catch (error: any) { toast.error(error.message) }
    finally { setSaving(false) }
  }

  const deleteBranding = async (id: string) => {
    if (!user || !confirm('Delete this project?')) return
    try {
      const res = await fetch(`/api/branding?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${user.token}` } })
      if (!res.ok) throw new Error()
      toast.success('Deleted')
      if (selectedBranding?.id === id) { setSelectedBranding(null); resetForm() }
      fetchBrandings()
    } catch { toast.error('Error') }
  }

  const resetForm = () => {
    setForm({ name: '', username: '', displayName: '', bio: '', website: '', profilePic: '', followers: '1.2M', following: '234', posts: '847', isVerified: false, highlights: [], postsData: [] })
    setSelectedBranding(null)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !uploadTarget) return

    const processFile = (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (event) => resolve(event.target?.result as string)
        reader.readAsDataURL(file)
      })
    }

    const processFiles = async () => {
      if (uploadTarget.type === 'profilePic') {
        const base64 = await processFile(files[0])
        setForm({ ...form, profilePic: base64 })
      } else if (uploadTarget.type === 'highlight') {
        const images = await Promise.all(Array.from(files).map(processFile))
        if (uploadTarget.index !== undefined) {
          const newHighlights = [...form.highlights]
          newHighlights[uploadTarget.index].images = [...newHighlights[uploadTarget.index].images, ...images]
          setForm({ ...form, highlights: newHighlights })
        } else {
          setForm({ ...form, highlights: [...form.highlights, { name: 'Highlight', images }] })
        }
      } else if (uploadTarget.type === 'post') {
        const images = await Promise.all(Array.from(files).map(processFile))
        if (uploadTarget.index !== undefined) {
          const newPosts = [...form.postsData]
          newPosts[uploadTarget.index].images = [...newPosts[uploadTarget.index].images, ...images]
          setForm({ ...form, postsData: newPosts })
        } else {
          setForm({ ...form, postsData: [...form.postsData, { images, likes: '1,234', caption: '' }] })
        }
      }
    }

    processFiles()
    setUploadTarget(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const triggerUpload = (type: string, index?: number, multiple = false) => {
    setUploadTarget({ type, index })
    if (fileInputRef.current) {
      fileInputRef.current.multiple = multiple
      fileInputRef.current.click()
    }
  }

  const updateHighlightName = (index: number, name: string) => {
    const newHighlights = [...form.highlights]
    newHighlights[index].name = name
    setForm({ ...form, highlights: newHighlights })
  }

  const removeHighlight = (index: number) => {
    setForm({ ...form, highlights: form.highlights.filter((_, i) => i !== index) })
  }

  const removePost = (index: number) => {
    setForm({ ...form, postsData: form.postsData.filter((_, i) => i !== index) })
  }

  const downloadProfile = async () => {
    if (!previewRef.current) return
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: '#000' })
      const link = document.createElement('a')
      link.download = `${form.username || 'profile'}-instagram.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('Profile downloaded!')
    } catch { toast.error('Download failed') }
    finally { setDownloading(false) }
  }

  const downloadAll = async () => {
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      // Download profile
      if (previewRef.current) {
        const profileCanvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: '#000' })
        zip.file('profile.png', profileCanvas.toDataURL('image/png').split(',')[1], { base64: true })
      }

      // Download posts
      for (let i = 0; i < form.postsData.length; i++) {
        const post = form.postsData[i]
        for (let j = 0; j < post.images.length; j++) {
          const imgData = post.images[j].split(',')[1]
          zip.file(`post-${i + 1}-image-${j + 1}.png`, imgData, { base64: true })
        }
      }

      // Download highlights
      for (let i = 0; i < form.highlights.length; i++) {
        const highlight = form.highlights[i]
        for (let j = 0; j < highlight.images.length; j++) {
          const imgData = highlight.images[j].split(',')[1]
          zip.file(`highlight-${highlight.name}-${j + 1}.png`, imgData, { base64: true })
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.download = `${form.username || 'branding'}-complete.zip`
      link.href = URL.createObjectURL(blob)
      link.click()
      toast.success('All files downloaded!')
    } catch (e) { console.error(e); toast.error('Download failed') }
    finally { setDownloading(false) }
  }

  if (isLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  if (!user || (!user.isPremium && !user.isAdmin)) return null

  return (
    <div className="min-h-screen bg-background">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

      <header className="border-b bg-card sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="btn btn-ghost p-2"><ArrowLeft className="w-5 h-5" /></Link>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{t('branding')}</span>
                <span className="badge badge-premium"><Crown className="w-3 h-3" /> {t('premium')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={downloadProfile} className="btn btn-secondary" disabled={downloading}><Download className="w-4 h-4" /> Profile</button>
              <button onClick={downloadAll} className="btn btn-gold" disabled={downloading}>{downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderDown className="w-4 h-4" />} All Files</button>
              <button onClick={saveBranding} className="btn btn-primary" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save</button>
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Editor Panel */}
          <div className="lg:col-span-4 space-y-4">
            {/* Projects */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">{t('projects')}</h2>
                <button onClick={() => setShowNewProjectModal(true)} className="btn btn-ghost p-1.5"><Plus className="w-4 h-4" /></button>
              </div>
              {brandings.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin">
                  {brandings.map((b) => (
                    <div key={b.id} className={`p-2 rounded-lg cursor-pointer flex items-center gap-2 group ${selectedBranding?.id === b.id ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/50 hover:bg-secondary'}`} onClick={() => loadBranding(b.id)}>
                      {b.profilePic ? <img src={b.profilePic} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />}
                      <span className="flex-1 text-sm font-medium truncate">{b.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); deleteBranding(b.id) }} className="btn btn-ghost p-1 text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-2">No projects</p>}
            </div>

            {/* Profile */}
            <div className="card">
              <h3 className="font-semibold mb-3">{t('profile')}</h3>
              <div className="space-y-2">
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input w-full py-2 text-sm" placeholder="Project name *" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="input py-2 text-sm" placeholder="@username" />
                  <input type="text" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="input py-2 text-sm" placeholder="Display Name" />
                </div>
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="input w-full h-14 text-sm" placeholder="Bio..." />
                <input type="text" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="input w-full py-2 text-sm" placeholder="website.com" />
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" value={form.posts} onChange={(e) => setForm({ ...form, posts: e.target.value })} className="input py-2 text-sm" placeholder="Posts" />
                  <input type="text" value={form.followers} onChange={(e) => setForm({ ...form, followers: e.target.value })} className="input py-2 text-sm" placeholder="Followers" />
                  <input type="text" value={form.following} onChange={(e) => setForm({ ...form, following: e.target.value })} className="input py-2 text-sm" placeholder="Following" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.isVerified} onChange={(e) => setForm({ ...form, isVerified: e.target.checked })} className="w-4 h-4 rounded" /> Verified ✓</label>
              </div>
            </div>

            {/* Media */}
            <div className="card">
              <h3 className="font-semibold mb-3">{t('media')}</h3>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => triggerUpload('profilePic')} className="btn btn-secondary py-2 text-xs"><User className="w-4 h-4" /></button>
                <button onClick={() => triggerUpload('highlight', undefined, true)} className="btn btn-secondary py-2 text-xs"><Plus className="w-3 h-3" /> Highlight</button>
                <button onClick={() => triggerUpload('post', undefined, true)} className="btn btn-secondary py-2 text-xs"><Plus className="w-3 h-3" /> Post</button>
              </div>

              {form.highlights.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium mb-2">Highlights ({form.highlights.length})</p>
                  <div className="space-y-2">
                    {form.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-secondary/50 rounded">
                        <img src={h.images[0]} className="w-8 h-8 rounded-full object-cover" />
                        <input type="text" value={h.name} onChange={(e) => updateHighlightName(i, e.target.value)} className="input py-1 text-xs flex-1" />
                        <span className="text-xs text-muted-foreground">{h.images.length}</span>
                        <button onClick={() => triggerUpload('highlight', i, true)} className="btn btn-ghost p-1"><Plus className="w-3 h-3" /></button>
                        <button onClick={() => removeHighlight(i)} className="btn btn-ghost p-1 text-red-500"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {form.postsData.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium mb-2">Posts ({form.postsData.length})</p>
                  <div className="grid grid-cols-4 gap-1">
                    {form.postsData.map((p, i) => (
                      <div key={i} className="relative aspect-square rounded overflow-hidden group">
                        <img src={p.images[0]} className="w-full h-full object-cover" />
                        {p.images.length > 1 && <span className="absolute top-0.5 right-0.5 bg-black/60 text-white text-[8px] px-1 rounded">{p.images.length}</span>}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-0.5 transition">
                          <button onClick={() => triggerUpload('post', i, true)} className="p-1 text-white"><Plus className="w-3 h-3" /></button>
                          <button onClick={() => removePost(i)} className="p-1 text-red-400"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-8 flex justify-center">
            <div ref={previewRef} className="bg-[#1a1a1a] rounded-[55px] p-4 shadow-2xl" style={{ width: 430 }}>
              <div className="bg-black rounded-[44px] overflow-hidden" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
                {/* Dynamic Island */}
                <div className="h-[50px] bg-black flex items-center justify-center relative">
                  <div className="absolute top-3 w-[120px] h-[35px] bg-black rounded-[20px] flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-[#1a1a1a] mr-2" />
                  </div>
                  <div className="absolute top-2 left-8 text-white text-sm font-semibold">9:41</div>
                  <div className="absolute top-2 right-6 flex items-center gap-1">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.46 3 3.34 4.78.29 7.67c-.18.18-.29.43-.29.71 0 .28.11.53.29.71l2.48 2.48c.18.18.43.29.71.29.27 0 .52-.11.7-.28.79-.74 1.69-1.36 2.66-1.85.33-.16.56-.5.56-.9v-3.1c1.45-.48 3-.73 4.6-.73s3.15.25 4.6.72v3.1c0 .39.23.74.56.9.98.49 1.87 1.12 2.67 1.85.18.18.43.28.7.28.28 0 .53-.11.71-.29l2.48-2.48c.18-.18.29-.43.29-.71 0-.28-.11-.53-.29-.71C20.66 4.78 16.54 3 12 3z"/></svg>
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M17 4h-3V2h-4v2H7v18h10V4zm-1 16H8V6h8v14z"/><path d="M9 8h6v10H9z"/></svg>
                  </div>
                </div>

                {/* Header */}
                <div className="px-4 py-2 flex items-center justify-between bg-black">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-white">{form.username || 'username'}</span>
                    {form.isVerified && <svg className="w-4 h-4 text-[#0095f6]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>}
                    <ChevronRight className="w-4 h-4 text-white rotate-90" />
                  </div>
                  <div className="flex items-center gap-5">
                    <Plus className="w-6 h-6 text-white" />
                    <MoreHorizontal className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Profile */}
                <div className="px-4 pt-2 pb-3 bg-black">
                  <div className="flex items-start gap-5">
                    <div className="flex-shrink-0">
                      {form.profilePic ? (
                        <div className="w-[86px] h-[86px] rounded-full p-[3px] bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600">
                          <img src={form.profilePic} className="w-full h-full rounded-full object-cover border-[3px] border-black" />
                        </div>
                      ) : (
                        <div className="w-[86px] h-[86px] rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center">
                          <User className="w-10 h-10 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex justify-around text-center pt-3">
                      <div><p className="font-semibold text-white text-lg">{form.posts}</p><p className="text-[13px] text-gray-400">posts</p></div>
                      <div><p className="font-semibold text-white text-lg">{form.followers}</p><p className="text-[13px] text-gray-400">followers</p></div>
                      <div><p className="font-semibold text-white text-lg">{form.following}</p><p className="text-[13px] text-gray-400">following</p></div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="font-semibold text-[14px] text-white">{form.displayName || 'Display Name'}</p>
                    <p className="text-[14px] text-white whitespace-pre-wrap leading-[18px]">{form.bio || 'Bio goes here...'}</p>
                    {form.website && <p className="text-[14px] text-[#e0f1ff] font-medium">{form.website}</p>}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 py-[7px] bg-[#0095f6] text-white text-[13px] font-semibold rounded-lg">Follow</button>
                    <button className="flex-1 py-[7px] bg-[#363636] text-white text-[13px] font-semibold rounded-lg">Message</button>
                    <button className="px-3 py-[7px] bg-[#363636] rounded-lg"><ChevronRight className="w-4 h-4 text-white rotate-90" /></button>
                  </div>
                </div>

                {/* Highlights */}
                {form.highlights.length > 0 && (
                  <div className="flex gap-4 px-4 py-3 overflow-x-auto bg-black">
                    {form.highlights.map((h, i) => (
                      <div key={i} className="flex-shrink-0 text-center">
                        <div className="w-[62px] h-[62px] rounded-full p-[2px] bg-gradient-to-br from-gray-500 to-gray-600">
                          <img src={h.images[0]} className="w-full h-full rounded-full object-cover border-[2px] border-black" />
                        </div>
                        <p className="text-[11px] mt-1 truncate w-[62px] text-white">{h.name}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tabs */}
                <div className="flex border-t border-[#262626] bg-black">
                  <button className="flex-1 py-3 flex justify-center border-b border-white"><Grid className="w-6 h-6 text-white" /></button>
                  <button className="flex-1 py-3 flex justify-center"><Film className="w-6 h-6 text-gray-500" /></button>
                </div>

                {/* Posts Grid */}
                <div className="grid grid-cols-3 gap-[1px] bg-black min-h-[300px]">
                  {form.postsData.length > 0 ? form.postsData.map((post, i) => (
                    <div key={i} className="aspect-square bg-[#1a1a1a] relative cursor-pointer" onClick={() => { setSelectedPostIndex(i); setCarouselIndex(0) }}>
                      <img src={post.images[0]} className="w-full h-full object-cover" />
                      {post.images.length > 1 && <svg className="absolute top-2 right-2 w-4 h-4 text-white drop-shadow" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h10v12zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z"/></svg>}
                    </div>
                  )) : [...Array(6)].map((_, i) => <div key={i} className="aspect-square bg-[#1a1a1a]" />)}
                </div>

                {/* Bottom Nav */}
                <div className="flex items-center justify-around py-2 border-t border-[#262626] bg-black">
                  <Home className="w-7 h-7 text-white" />
                  <SearchIcon className="w-7 h-7 text-white" />
                  <PlusSquare className="w-7 h-7 text-white" />
                  <Film className="w-7 h-7 text-white" />
                  {form.profilePic ? <img src={form.profilePic} className="w-7 h-7 rounded-full object-cover border border-white" /> : <div className="w-7 h-7 rounded-full bg-gray-600" />}
                </div>

                {/* Home Indicator */}
                <div className="h-8 flex items-end justify-center pb-2 bg-black">
                  <div className="w-[134px] h-[5px] bg-white rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Post Modal */}
      {selectedPostIndex !== null && form.postsData[selectedPostIndex] && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setSelectedPostIndex(null)}>
          <div className="max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
              <img src={form.postsData[selectedPostIndex].images[carouselIndex]} className="w-full h-full object-contain" />
              {form.postsData[selectedPostIndex].images.length > 1 && (
                <>
                  {carouselIndex > 0 && <button onClick={() => setCarouselIndex(c => c - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>}
                  {carouselIndex < form.postsData[selectedPostIndex].images.length - 1 && <button onClick={() => setCarouselIndex(c => c + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center"><ChevronRight className="w-5 h-5" /></button>}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">{form.postsData[selectedPostIndex].images.map((_, i) => <div key={i} className={`w-[6px] h-[6px] rounded-full ${i === carouselIndex ? 'bg-[#0095f6]' : 'bg-white/50'}`} />)}</div>
                </>
              )}
            </div>
            <div className="bg-black p-3 rounded-b-lg">
              <div className="flex justify-between mb-2">
                <div className="flex gap-4"><Heart className="w-6 h-6 text-white" /><MsgCircle className="w-6 h-6 text-white" /><Send className="w-6 h-6 text-white" /></div>
                <Bookmark className="w-6 h-6 text-white" />
              </div>
              <p className="text-white text-sm font-semibold">{form.postsData[selectedPostIndex].likes} likes</p>
            </div>
          </div>
          <button onClick={() => setSelectedPostIndex(null)} className="absolute top-4 right-4 text-white"><X className="w-8 h-8" /></button>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full animate-fade-in">
            <h3 className="text-lg font-semibold mb-4">{t('newProject')}</h3>
            <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="input w-full mb-4" placeholder="Project name" autoFocus onKeyDown={(e) => e.key === 'Enter' && createProject()} />
            <div className="flex gap-3">
              <button onClick={() => { setShowNewProjectModal(false); setNewProjectName('') }} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={createProject} className="btn btn-primary flex-1" disabled={!newProjectName.trim()}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
