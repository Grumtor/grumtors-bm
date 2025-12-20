'use client'

import { ThemeProvider } from 'next-themes'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, Language, TranslationKey } from '@/lib/translations'

interface User {
  id: string
  token: string
  username: string
  telegram?: string | null
  credits: number
  isUnlimited: boolean
  isPremium: boolean
  isAdmin: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (token: string, password: string) => Promise<boolean>
  logout: () => void
  refreshUser: () => Promise<void>
}

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: TranslationKey) => string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('grumtor_user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('grumtor_user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (token: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      if (!res.ok) return false
      const data = await res.json()
      setUser(data.user)
      localStorage.setItem('grumtor_user', JSON.stringify(data.user))
      return true
    } catch {
      return false
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('grumtor_user')
    window.location.href = '/auth/login'
  }

  const refreshUser = async () => {
    if (!user) return
    try {
      const res = await fetch('/api/user', {
        headers: { 'Authorization': `Bearer ${user.token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const updatedUser = { ...user, ...data.user }
        setUser(updatedUser)
        localStorage.setItem('grumtor_user', JSON.stringify(updatedUser))
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en')

  useEffect(() => {
    const stored = localStorage.getItem('grumtor_lang') as Language
    if (stored && (stored === 'en' || stored === 'fr')) {
      setLangState(stored)
    } else {
      // Detect browser language
      const browserLang = navigator.language.startsWith('fr') ? 'fr' : 'en'
      setLangState(browserLang)
    }
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem('grumtor_lang', newLang)
  }

  const t = (key: TranslationKey): string => {
    return translations[lang][key] || translations.en[key] || key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <LanguageProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
