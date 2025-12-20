'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Users, ArrowLeft, Loader2, Check, X, Clock, Plus, Infinity, Shield, RefreshCw, Crown, Instagram, Undo2, ExternalLink, Eye, Key, MessageCircle } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/app/providers'
import { formatRelativeTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface BMRequest {
  id: string
  instagramInput: string
  instagramDisplay: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  creditsPending: boolean
  user: { id: string; username: string; credits: number; isPremium: boolean; isUnlimited: boolean }
  businessManager: any
}

interface UserData {
  id: string
  username: string
  telegram: string | null
  credits: number
  isUnlimited: boolean
  isPremium: boolean
  isAdmin: boolean
  totalRequests: number
  totalBrandings: number
}

interface UserDetail {
  user: UserData
  requests: any[]
  brandings: any[]
  transactions: any[]
}

export default function AdminPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  
  const [activeTab, setActiveTab] = useState<'requests' | 'users'>('requests')
  const [requests, setRequests] = useState<BMRequest[]>([])
  const [users, setUsers] = useState<UserData[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('PENDING')

  const [reviewingRequest, setReviewingRequest] = useState<BMRequest | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')
  const [bmData, setBmData] = useState({ bmLink: '', bmId: '', bmName: '' })
  const [submittingReview, setSubmittingReview] = useState(false)

  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null)
  const [creditAmount, setCreditAmount] = useState(10)
  const [newPassword, setNewPassword] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  useEffect(() => { if (!isLoading && (!user || !user.isAdmin)) router.push('/dashboard') }, [isLoading, user, router])
  useEffect(() => { if (user?.isAdmin) fetchData() }, [user, statusFilter])

  const fetchData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''
      const [reqRes, usersRes] = await Promise.all([
        fetch(`/api/admin/requests?status=${statusFilter}&limit=100${searchParam}`, { headers: { 'Authorization': `Bearer ${user.token}` } }),
        fetch('/api/admin/users?limit=100', { headers: { 'Authorization': `Bearer ${user.token}` } }),
      ])
      if (reqRes.ok) { const d = await reqRes.json(); setRequests(d.requests || []); setPendingCount(d.pendingCount || 0) }
      if (usersRes.ok) { const d = await usersRes.json(); setUsers(d.users || []) }
    } catch { toast.error('Erreur lors du chargement') }
    finally { setLoading(false) }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchData()
  }

  const fetchUserDetail = async (userId: string) => {
    if (!user) return
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { headers: { 'Authorization': `Bearer ${user.token}` } })
      if (res.ok) {
        const data = await res.json()
        setUserDetail(data)
      }
    } catch { toast.error('Erreur') }
  }

  const handleReview = async () => {
    if (!reviewingRequest || !user) return
    if (reviewAction === 'approve' && !bmData.bmLink && !bmData.bmId && !bmData.bmName) { 
      toast.error('Renseignez au moins le lien BM ou l\'ID/Nom'); return 
    }

    setSubmittingReview(true)
    try {
      const res = await fetch('/api/admin/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ requestId: reviewingRequest.id, action: reviewAction, ...bmData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(reviewAction === 'approve' ? 'BM approuvé !' : 'Rejeté')
      setReviewingRequest(null)
      setBmData({ bmLink: '', bmId: '', bmName: '' })
      fetchData()
    } catch (error: any) { toast.error(error.message) }
    finally { setSubmittingReview(false) }
  }

  const handleUndo = async (requestId: string) => {
    if (!user) return
    try {
      const res = await fetch('/api/admin/requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` }, body: JSON.stringify({ requestId, action: 'undo' }) })
      if (!res.ok) throw new Error('Erreur')
      toast.success('Demande remise en attente')
      fetchData()
    } catch { toast.error('Erreur') }
  }

  const handleUserAction = async (userId: string, action: string, value?: any) => {
    if (!user) return
    try {
      const body: any = { userId, action, value }
      if (action === 'add_credits' || action === 'remove_credits') body.amount = creditAmount
      if (action === 'change_password') body.newPassword = newPassword
      
      const res = await fetch('/api/admin/users', { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` }, 
        body: JSON.stringify(body) 
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(action === 'change_password' ? 'Mot de passe modifié' : 'Utilisateur mis à jour')
      setSelectedUser(null)
      setShowPasswordModal(false)
      setNewPassword('')
      fetchData()
    } catch (error: any) { toast.error(error.message || 'Erreur') }
  }

  const isLink = (text: string) => text.includes('instagram.com') || text.includes('instagr.am')

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.telegram?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  if (!user?.isAdmin) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="btn btn-ghost p-2"><ArrowLeft className="w-5 h-5" /></Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div>
                <span className="font-bold text-lg">Admin</span>
                {pendingCount > 0 && <span className="badge badge-error">{pendingCount}</span>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a href="https://t.me/Grumtor" target="_blank" rel="noopener noreferrer" className="btn btn-ghost p-2"><MessageCircle className="w-5 h-5" /></a>
              <button onClick={fetchData} className="btn btn-secondary"><RefreshCw className="w-4 h-4" /></button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-2 mb-6 border-b">
          {[{ id: 'requests', label: 'Demandes', icon: Clock, badge: pendingCount }, { id: 'users', label: 'Utilisateurs', icon: Users }].map((tab) => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setSearchQuery('') }} className={`px-4 py-2 font-medium transition border-b-2 -mb-px flex items-center gap-2 ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
              {tab.badge ? <span className="badge badge-error text-xs">{tab.badge}</span> : null}
            </button>
          ))}
        </div>

        {activeTab === 'requests' && (
          <div className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10 w-full" placeholder="Rechercher par @pseudo ou compte Instagram..." />
              </div>
              <button type="submit" className="btn btn-primary">Rechercher</button>
            </form>

            <div className="flex gap-2 flex-wrap">
              {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((status) => (
                <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${statusFilter === status ? 'bg-primary text-white' : 'bg-secondary hover:bg-secondary/80'}`}>
                  {status === 'PENDING' && <Clock className="w-3 h-3 inline mr-1" />}
                  {status === 'APPROVED' && <Check className="w-3 h-3 inline mr-1" />}
                  {status === 'REJECTED' && <X className="w-3 h-3 inline mr-1" />}
                  {status === 'PENDING' ? 'En attente' : status === 'APPROVED' ? 'Approuvés' : status === 'REJECTED' ? 'Rejetés' : 'Tous'}
                </button>
              ))}
            </div>

            <div className="card p-0 overflow-hidden">
              {requests.length > 0 ? (
                <div className="divide-y">
                  {requests.map((req) => (
                    <div key={req.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                          <Instagram className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isLink(req.instagramDisplay) ? (
                              <a href={req.instagramDisplay} target="_blank" rel="noopener noreferrer" className="font-bold text-lg text-primary hover:underline flex items-center gap-1">
                                {req.instagramDisplay.length > 50 ? req.instagramDisplay.substring(0, 50) + '...' : req.instagramDisplay}
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            ) : (
                              <span className="font-bold text-lg">{req.instagramDisplay}</span>
                            )}
                            {req.creditsPending && <span className="badge badge-warning">Crédits insuffisants</span>}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Par <strong>@{req.user.username}</strong> • {formatRelativeTime(req.createdAt)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Crédits: {req.user.isUnlimited || req.user.isPremium ? '∞' : req.user.credits}
                            {req.user.isPremium && <span className="ml-2 text-amber-500">⭐ Premium</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {req.status === 'PENDING' ? (
                            <>
                              <button onClick={() => { setReviewingRequest(req); setReviewAction('reject') }} className="btn bg-red-500 hover:bg-red-600 text-white p-3" title="Pas de BM (-2 cr.)"><X className="w-5 h-5" /></button>
                              <button onClick={() => { setReviewingRequest(req); setReviewAction('approve') }} className="btn bg-emerald-500 hover:bg-emerald-600 text-white p-3" title="BM trouvé (-10 cr.)"><Check className="w-5 h-5" /></button>
                            </>
                          ) : (
                            <>
                              <span className={`badge ${req.status === 'APPROVED' ? 'badge-success' : 'badge-error'}`}>
                                {req.status === 'APPROVED' ? '✓ Approuvé' : '✗ Rejeté'}
                              </span>
                              <button onClick={() => handleUndo(req.id)} className="btn btn-ghost p-2" title="Annuler"><Undo2 className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Check className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
                  <p className="text-muted-foreground">{searchQuery ? 'Aucun résultat' : 'Aucune demande en attente'}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10 w-full" placeholder="Rechercher un utilisateur..." />
              </div>
            </div>

            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50"><tr>
                    <th className="text-left px-4 py-3">Utilisateur</th>
                    <th className="text-left px-4 py-3">Crédits</th>
                    <th className="text-left px-4 py-3">Demandes</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-secondary/30">
                        <td className="px-4 py-3">
                          <span className="font-medium">@{u.username}</span>
                          {u.telegram && <p className="text-xs text-muted-foreground">{u.telegram}</p>}
                        </td>
                        <td className="px-4 py-3 font-medium">{u.isUnlimited ? '∞' : u.credits}</td>
                        <td className="px-4 py-3">{u.totalRequests}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {u.isAdmin && <span className="badge badge-error">Admin</span>}
                            {u.isPremium && <span className="badge badge-premium">Premium</span>}
                            {u.isUnlimited && <span className="badge badge-info">∞</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => { setSelectedUser(u); fetchUserDetail(u.id) }} className="btn btn-ghost p-1.5" title="Voir détails"><Eye className="w-4 h-4" /></button>
                            <button onClick={() => { setSelectedUser(u); setCreditAmount(10) }} className="btn btn-ghost p-1.5" title="Crédits"><Plus className="w-4 h-4 text-emerald-500" /></button>
                            <button onClick={() => handleUserAction(u.id, 'set_premium', !u.isPremium)} className={`btn btn-ghost p-1.5 ${u.isPremium ? 'text-amber-500' : ''}`} title="Premium"><Crown className="w-4 h-4" /></button>
                            <button onClick={() => handleUserAction(u.id, 'set_unlimited', !u.isUnlimited)} className={`btn btn-ghost p-1.5 ${u.isUnlimited ? 'text-primary' : ''}`} title="Illimité"><Infinity className="w-4 h-4" /></button>
                            <button onClick={() => { setSelectedUser(u); setShowPasswordModal(true); setNewPassword('') }} className="btn btn-ghost p-1.5" title="Changer mdp"><Key className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Review Modal */}
      {reviewingRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-lg w-full animate-fade-in">
            <h3 className="text-lg font-semibold mb-4">
              {reviewAction === 'approve' ? '✅ Approuver - Renseigner le BM' : '❌ Rejeter - Pas de BM'}
            </h3>
            <div className="mb-4">
              {isLink(reviewingRequest.instagramDisplay) ? (
                <a href={reviewingRequest.instagramDisplay} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  {reviewingRequest.instagramDisplay} <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <span className="font-bold">{reviewingRequest.instagramDisplay}</span>
              )}
              <p className="text-sm text-muted-foreground mt-1">Par @{reviewingRequest.user.username}</p>
            </div>
            
            {reviewAction === 'approve' && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="label block mb-1">Lien du Business Manager</label>
                  <input type="text" value={bmData.bmLink} onChange={(e) => setBmData({ ...bmData, bmLink: e.target.value })} className="input w-full" placeholder="https://business.facebook.com/..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label block mb-1">ID du BM</label>
                    <input type="text" value={bmData.bmId} onChange={(e) => setBmData({ ...bmData, bmId: e.target.value })} className="input w-full" placeholder="123456789" />
                  </div>
                  <div>
                    <label className="label block mb-1">Nom du BM</label>
                    <input type="text" value={bmData.bmName} onChange={(e) => setBmData({ ...bmData, bmName: e.target.value })} className="input w-full" placeholder="Nike France" />
                  </div>
                </div>
              </div>
            )}
            
            {reviewAction === 'reject' && (
              <div className="p-3 rounded-lg bg-red-500/10 mb-4">
                <p className="text-sm text-red-600 dark:text-red-400">L&apos;utilisateur sera débité de 2 crédits.</p>
              </div>
            )}
            
            <div className="flex gap-3">
              <button onClick={() => { setReviewingRequest(null); setBmData({ bmLink: '', bmId: '', bmName: '' }) }} className="btn btn-secondary flex-1">Annuler</button>
              <button onClick={handleReview} className={`btn flex-1 ${reviewAction === 'approve' ? 'btn-primary' : 'bg-red-500 hover:bg-red-600 text-white'}`} disabled={submittingReview}>
                {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && userDetail && !showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card max-w-2xl w-full animate-fade-in my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">@{userDetail.user.username}</h3>
              <button onClick={() => { setSelectedUser(null); setUserDetail(null) }} className="btn btn-ghost p-2"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-secondary rounded-lg">
                <p className="text-2xl font-bold">{userDetail.user.isUnlimited ? '∞' : userDetail.user.credits}</p>
                <p className="text-xs text-muted-foreground">Crédits</p>
              </div>
              <div className="text-center p-3 bg-secondary rounded-lg">
                <p className="text-2xl font-bold">{userDetail.requests.length}</p>
                <p className="text-xs text-muted-foreground">Demandes</p>
              </div>
              <div className="text-center p-3 bg-secondary rounded-lg">
                <p className="text-2xl font-bold">{userDetail.brandings.length}</p>
                <p className="text-xs text-muted-foreground">Brandings</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Dernières demandes</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {userDetail.requests.slice(0, 10).map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg text-sm">
                      <span>{req.instagramInput}</span>
                      <span className={`badge ${req.status === 'APPROVED' ? 'badge-success' : req.status === 'REJECTED' ? 'badge-error' : 'badge-warning'}`}>
                        {req.status === 'APPROVED' ? '✓' : req.status === 'REJECTED' ? '✗' : '⏳'}
                      </span>
                    </div>
                  ))}
                  {userDetail.requests.length === 0 && <p className="text-sm text-muted-foreground">Aucune demande</p>}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Projets Branding</h4>
                <div className="grid grid-cols-3 gap-2">
                  {userDetail.brandings.map((b: any) => (
                    <div key={b.id} className="p-2 bg-secondary/50 rounded-lg text-center">
                      {b.profilePic ? <img src={b.profilePic} className="w-10 h-10 rounded-full mx-auto mb-1" /> : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mx-auto mb-1" />}
                      <p className="text-xs font-medium truncate">{b.name}</p>
                    </div>
                  ))}
                  {userDetail.brandings.length === 0 && <p className="text-sm text-muted-foreground col-span-3">Aucun projet</p>}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t">
              <button onClick={() => { setUserDetail(null); setCreditAmount(10) }} className="btn btn-secondary flex-1">
                <Plus className="w-4 h-4" /> Crédits
              </button>
              <button onClick={() => { setShowPasswordModal(true); setNewPassword('') }} className="btn btn-secondary flex-1">
                <Key className="w-4 h-4" /> Mot de passe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credits Modal */}
      {selectedUser && !userDetail && !showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full animate-fade-in">
            <h3 className="text-lg font-semibold mb-4">Modifier les crédits</h3>
            <p className="mb-4">
              <strong>@{selectedUser.username}</strong><br />
              <span className="text-muted-foreground">Solde actuel: {selectedUser.isUnlimited ? '∞' : selectedUser.credits}</span>
            </p>
            <div className="mb-4">
              <label className="label block mb-2">Montant</label>
              <input type="number" value={creditAmount} onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)} className="input w-full" min={1} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSelectedUser(null)} className="btn btn-secondary flex-1">Annuler</button>
              <button onClick={() => handleUserAction(selectedUser.id, 'add_credits')} className="btn bg-emerald-500 hover:bg-emerald-600 text-white flex-1">+ Ajouter</button>
              <button onClick={() => handleUserAction(selectedUser.id, 'remove_credits')} className="btn bg-red-500 hover:bg-red-600 text-white flex-1">- Retirer</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {selectedUser && showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full animate-fade-in">
            <h3 className="text-lg font-semibold mb-4">Changer le mot de passe</h3>
            <p className="mb-4"><strong>@{selectedUser.username}</strong></p>
            <div className="mb-4">
              <label className="label block mb-2">Nouveau mot de passe</label>
              <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input w-full" placeholder="Minimum 8 caractères" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowPasswordModal(false); setSelectedUser(null) }} className="btn btn-secondary flex-1">Annuler</button>
              <button onClick={() => handleUserAction(selectedUser.id, 'change_password')} className="btn btn-primary flex-1" disabled={newPassword.length < 8}>Changer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
