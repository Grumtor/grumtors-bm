'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Key, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/app/providers'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const { login, user, isLoading: authLoading } = useAuth()
  
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && user) router.push('/dashboard')
  }, [authLoading, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim() || !password.trim()) return

    setIsLoading(true)
    const success = await login(token.trim(), password)
    
    if (success) {
      toast.success('Connexion réussie !')
      router.push('/dashboard')
    } else {
      toast.error('Token ou mot de passe incorrect')
    }
    setIsLoading(false)
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center"><Search className="w-5 h-5 text-white" /></div>
            <span className="font-bold text-xl">Grumtor&apos;s BM</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Connexion</h1>
          <p className="text-muted-foreground">Entrez votre token et mot de passe</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label block mb-2">Token</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type="text" value={token} onChange={(e) => setToken(e.target.value)} className="input pl-10 w-full" placeholder="grm_xxxxxxxx..." disabled={isLoading} />
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
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={isLoading || !token.trim() || !password.trim()}>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Se connecter'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          Pas encore de compte ? <Link href="/auth/register" className="text-sky-500 hover:underline">Créer un compte</Link>
        </p>
      </div>
    </div>
  )
}
