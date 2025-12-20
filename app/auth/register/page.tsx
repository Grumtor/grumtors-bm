'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, User, Lock, Loader2, Eye, EyeOff, Copy, Check, Key, MessageCircle } from 'lucide-react'
import { useAuth } from '@/app/providers'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, login } = useAuth()
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [telegram, setTelegram] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!authLoading && user) router.push('/dashboard')
  }, [authLoading, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, telegram: telegram.trim() || null }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la création')
        return
      }

      setGeneratedToken(data.token)
      toast.success('Compte créé avec succès !')
    } catch {
      toast.error('Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToken = async () => {
    if (!generatedToken) return
    await navigator.clipboard.writeText(generatedToken)
    setCopied(true)
    toast.success('Token copié !')
    setTimeout(() => setCopied(false), 2000)
  }

  const continueToLogin = async () => {
    if (!generatedToken) return
    const success = await login(generatedToken, password)
    if (success) {
      toast.success('Connexion réussie !')
      router.push('/dashboard')
    }
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
  }

  if (generatedToken) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-green-500" /></div>
            <h1 className="text-2xl font-bold mb-2">Compte créé !</h1>
            <p className="text-muted-foreground">Sauvegardez votre token de connexion</p>
          </div>

          <div className="card space-y-6">
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium mb-2">⚠️ IMPORTANT</p>
              <p className="text-sm text-muted-foreground">Ce token est votre identifiant unique. Sauvegardez-le maintenant, il ne sera plus affiché !</p>
            </div>

            <div>
              <label className="label block mb-2">Votre Token</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input type="text" value={generatedToken} readOnly className="input pl-10 w-full font-mono text-sm" />
                </div>
                <button onClick={copyToken} className="btn btn-secondary">{copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}</button>
              </div>
            </div>

            <button onClick={continueToLogin} className="btn btn-primary w-full">Accéder au dashboard</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center"><Search className="w-5 h-5 text-white" /></div>
            <span className="font-bold text-xl">Grumtor&apos;s BM</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Créer un compte</h1>
          <p className="text-muted-foreground">Obtenez 10 crédits gratuits</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label block mb-2">Pseudo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input pl-10 w-full" placeholder="votre_pseudo" disabled={isLoading} />
            </div>
          </div>

          <div>
            <label className="label block mb-2">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input pl-10 pr-10 w-full" placeholder="••••••••" disabled={isLoading} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Minimum 8 caractères</p>
          </div>

          <div>
            <label className="label block mb-2">Telegram (optionnel)</label>
            <div className="relative">
              <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type="text" value={telegram} onChange={(e) => setTelegram(e.target.value)} className="input pl-10 w-full" placeholder="@votre_telegram" disabled={isLoading} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={isLoading || !username.trim() || password.length < 8}>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          Déjà un compte ? <Link href="/auth/login" className="text-sky-500 hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
