'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, History, LogOut, Loader2, Check, X, Instagram, Coins, Clock, AlertCircle, Lock, Send, Palette, Crown, ChevronRight, ExternalLink, MessageCircle, Key, Eye, EyeOff, Tag } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { useAuth } from '@/app/providers'
import { formatRelativeTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface BMRequest {
  id: string
  instagramInput: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  reviewedAt: string | null
  creditsCharged: number | null
  creditsPending: boolean
  hasBM: boolean
  businessManager: { id: string; bmId: string | null; bmName: string | null; bmLink: string | null } | null
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading, logout, refreshUser } = useAuth()
  
  const [instagramInput, setInstagramInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [requests, setRequests] = useState<BMRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [activeTab, setActiveTab] = useState<'search' | 'history' | 'settings'>('search')

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)

  useEffect(() => { if (!isLoading && !user) router.push('/auth/login') }, [isLoading, user, router])
  
  useEffect(() => { 
    if (user && initialLoad) { 
      fetchRequests()
      refreshUser()
      setInitialLoad(false)
    } 
  }, [user, initialLoad])

  const fetchRequests = async () => {
    if (!user) return
    setLoadingRequests(true)
    try {
      const res = await fetch('/api/requests?limit=50', { headers: { 'Authorization': `Bearer ${user.token}` } })
      const data = await res.json()
      setRequests(data.requests || [])
    } catch (error) { console.error('Failed to fetch requests:', error) }
    finally { setLoadingRequests(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!instagramInput.trim() || !user) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ instagramInput: instagramInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Erreur'); return }
      toast.success(data.message || 'Demande soumise !')
      setInstagramInput('')
      fetchRequests()
      refreshUser()
    } catch { toast.error('Erreur de connexion') }
    finally { setSubmitting(false) }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || newPassword.length < 8) return

    setChangingPassword(true)
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: user.token, 
          username: user.username, 
          oldPassword, 
          newPassword 
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success('Mot de passe modifié !')
      setShowPasswordForm(false)
      setOldPassword('')
      setNewPassword('')
    } catch { toast.error('Erreur') }
    finally { setChangingPassword(false) }
  }

  const isLink = (text: string) => text.includes('instagram.com') || text.includes('instagr.am')

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  if (!user) return null

  const pendingCount = requests.filter(r => r.status === 'PENDING').length
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length
  const pendingCreditsCount = requests.filter(r => r.creditsPending).length

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><Search className="w-4 h-4 text-white" /></div>
              <span className="font-bold text-lg">Grumtor&apos;s BM</span>
              {user.isPremium && <span className="badge badge-premium"><Crown className="w-3 h-3" /> Premium</span>}
            </Link>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${user.isPremium ? 'bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/20' : 'bg-secondary'}`}>
                <Coins className={`w-4 h-4 ${user.isPremium ? 'text-amber-500' : 'text-primary'}`} />
                <span className="font-medium">{user.isUnlimited || user.isPremium ? '∞' : user.credits}</span>
              </div>
              <a href="https://t.me/Grumtor" target="_blank" rel="noopener noreferrer" className="btn btn-ghost p-2" title="Me contacter"><MessageCircle className="w-5 h-5" /></a>
              <LanguageToggle />
              <ThemeToggle />
              {user.isAdmin && <Link href="/admin" className="btn btn-secondary text-sm py-1.5">Admin</Link>}
              <button onClick={logout} className="btn btn-ghost p-2" title="Déconnexion"><LogOut className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Alerts */}
        {!user.isUnlimited && !user.isPremium && user.credits < 10 && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div className="flex-1"><p className="font-medium text-amber-700 dark:text-amber-400">Crédits faibles ({user.credits})</p></div>
            <a href="https://t.me/Grumtor" target="_blank" rel="noopener noreferrer" className="btn btn-gold text-sm">
              <MessageCircle className="w-4 h-4" /> Recharger
            </a>
          </div>
        )}

        {pendingCreditsCount > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 flex items-center gap-3">
            <Lock className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <div className="flex-1"><p className="font-medium text-orange-700 dark:text-orange-400">{pendingCreditsCount} résultat(s) en attente de paiement</p></div>
            <a href="https://t.me/Grumtor" target="_blank" rel="noopener noreferrer" className="btn btn-gold text-sm">
              <MessageCircle className="w-4 h-4" /> Recharger
            </a>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`card ${user.isPremium ? 'card-premium' : ''}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${user.isPremium ? 'bg-amber-500/20' : 'bg-primary/10'}`}>
                <Coins className={`w-6 h-6 ${user.isPremium ? 'text-amber-500' : 'text-primary'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="text-2xl font-bold">{user.isUnlimited || user.isPremium ? '∞' : user.credits}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center"><Clock className="w-6 h-6 text-amber-500" /></div>
              <div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">{pendingCount}</p></div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Check className="w-6 h-6 text-emerald-500" /></div>
              <div><p className="text-sm text-muted-foreground">BM Found</p><p className="text-2xl font-bold">{approvedCount}</p></div>
            </div>
          </div>
          {user.isPremium ? (
            <Link href="/dashboard/branding" className="card hover:border-pink-400/50 transition group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center"><Palette className="w-6 h-6 text-pink-500" /></div>
                <div className="flex-1"><p className="font-medium group-hover:text-pink-500">Brander</p><p className="text-xs text-muted-foreground">Instagram Mockups</p></div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Link>
          ) : (
            <a href="https://t.me/Grumtor" target="_blank" rel="noopener noreferrer" className="card hover:border-amber-400/50 transition group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center"><Crown className="w-6 h-6 text-amber-500" /></div>
                <div className="flex-1"><p className="font-medium text-gold">Go Premium</p><p className="text-xs text-muted-foreground">Unlimited access</p></div>
                <ChevronRight className="w-5 h-5" />
              </div>
            </a>
          )}
        </div>

        {/* Premium Features */}
        {user.isPremium && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Link href="/dashboard/collection" className="card hover:border-purple-400/50 transition group">
              <div className="flex items-center gap-4">
                <Tag className="w-8 h-8 text-purple-500" />
                <div className="flex-1"><p className="font-medium group-hover:text-purple-500">My Collection</p><p className="text-sm text-muted-foreground">Your BMs with custom tags</p></div>
                <ChevronRight className="w-5 h-5" />
              </div>
            </Link>
            <Link href="/dashboard/branding" className="card hover:border-pink-400/50 transition group">
              <div className="flex items-center gap-4">
                <Palette className="w-8 h-8 text-pink-500" />
                <div className="flex-1"><p className="font-medium group-hover:text-pink-500">Instagram Brander</p><p className="text-sm text-muted-foreground">Create mockups</p></div>
                <ChevronRight className="w-5 h-5" />
              </div>
            </Link>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b">
          {[{ id: 'search', label: 'Recherche', icon: Search }, { id: 'history', label: 'Historique', icon: History }, { id: 'settings', label: 'Paramètres', icon: Key }].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-2.5 font-medium transition border-b-2 -mb-px flex items-center gap-2 ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Rechercher un Business Manager</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label block mb-2">Compte Instagram</label>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input type="text" value={instagramInput} onChange={(e) => setInstagramInput(e.target.value)} className="input pl-10 w-full" placeholder="@username ou lien Instagram complet" disabled={submitting} />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={submitting || !instagramInput.trim()}>
                      {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Soumettre</>}
                    </button>
                  </div>
                </div>
              </form>
              <div className="mt-4 p-3 rounded-lg bg-secondary/50 text-sm">
                <p className="text-muted-foreground"><strong>Coût :</strong> 10 crédits si BM trouvé, 2 crédits sinon</p>
              </div>
            </div>

            {requests.length > 0 && (
              <div className="card p-0 overflow-hidden">
                <div className="px-4 py-3 border-b bg-secondary/30"><h3 className="font-semibold">Demandes récentes</h3></div>
                <div className="divide-y max-h-96 overflow-y-auto scrollbar-thin">
                  {requests.slice(0, 5).map((req) => <RequestRow key={req.id} request={req} />)}
                </div>
                {requests.length > 5 && (
                  <div className="px-4 py-2 border-t bg-secondary/20">
                    <button onClick={() => setActiveTab('history')} className="text-sm text-primary hover:underline">Voir tout l&apos;historique →</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b bg-secondary/30 flex items-center justify-between">
              <h3 className="font-semibold">Historique ({requests.length})</h3>
              <button onClick={fetchRequests} className="btn btn-ghost text-sm" disabled={loadingRequests}>
                {loadingRequests ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Actualiser'}
              </button>
            </div>
            {requests.length > 0 ? (
              <div className="divide-y max-h-[600px] overflow-y-auto scrollbar-thin">
                {requests.map((req) => <RequestRow key={req.id} request={req} />)}
              </div>
            ) : (
              <div className="py-12 text-center">
                <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune demande</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Mon compte</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Pseudo</span>
                  <span className="font-medium">@{user.username}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Crédits</span>
                  <span className="font-medium">{user.isUnlimited || user.isPremium ? '∞' : user.credits}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Status</span>
                  <span>{user.isPremium ? <span className="badge badge-premium"><Crown className="w-3 h-3" /> Premium</span> : <span className="badge badge-info">Standard</span>}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Changer le mot de passe</h2>
              {!showPasswordForm ? (
                <button onClick={() => setShowPasswordForm(true)} className="btn btn-secondary">
                  <Key className="w-4 h-4" /> Modifier mon mot de passe
                </button>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="label block mb-2">Ancien mot de passe</label>
                    <div className="relative">
                      <input type={showPasswords ? 'text' : 'password'} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="input w-full pr-10" />
                      <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label block mb-2">Nouveau mot de passe</label>
                    <input type={showPasswords ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input w-full" placeholder="Minimum 8 caractères" />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setShowPasswordForm(false); setOldPassword(''); setNewPassword('') }} className="btn btn-secondary flex-1">Annuler</button>
                    <button type="submit" className="btn btn-primary flex-1" disabled={changingPassword || newPassword.length < 8}>
                      {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Changer'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Besoin d&apos;aide ?</h2>
              <a href="https://t.me/Grumtor" target="_blank" rel="noopener noreferrer" className="btn btn-gold w-full">
                <MessageCircle className="w-5 h-5" /> Contacter @Grumtor sur Telegram
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function RequestRow({ request }: { request: BMRequest }) {
  const isLink = (text: string) => text.includes('instagram.com') || text.includes('instagr.am')

  const getStatusBadge = () => {
    switch (request.status) {
      case 'PENDING': return <span className="badge badge-warning"><Clock className="w-3 h-3" /> En attente</span>
      case 'APPROVED': return <span className="badge badge-success"><Check className="w-3 h-3" /> BM trouvé</span>
      case 'REJECTED': return <span className="badge badge-error"><X className="w-3 h-3" /> Pas de BM</span>
    }
  }

  return (
    <div className="px-4 py-3 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
        <Instagram className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        {isLink(request.instagramInput) ? (
          <a href={request.instagramInput} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1">
            {request.instagramInput.length > 40 ? request.instagramInput.substring(0, 40) + '...' : request.instagramInput}
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <p className="font-medium">{request.instagramInput}</p>
        )}
        <p className="text-xs text-muted-foreground">{formatRelativeTime(request.createdAt)}</p>
      </div>
      <div className="flex items-center gap-3">
        {getStatusBadge()}
        {request.creditsPending && request.status !== 'PENDING' && (
          <span className="badge badge-warning"><Lock className="w-3 h-3" /> Paiement requis</span>
        )}
        {request.businessManager && !request.creditsPending && (
          <div className="text-right text-sm">
            {request.businessManager.bmLink ? (
              <a href={request.businessManager.bmLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                {request.businessManager.bmName || 'Voir BM'} <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <p className="font-medium">{request.businessManager.bmName || request.businessManager.bmId || 'BM'}</p>
            )}
          </div>
        )}
        {request.creditsCharged && !request.creditsPending && (
          <span className="text-sm text-muted-foreground">-{request.creditsCharged}</span>
        )}
      </div>
    </div>
  )
}
