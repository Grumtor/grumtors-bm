'use client'

import { useLanguage } from '@/app/providers'

export function LanguageToggle() {
  const { lang, setLang } = useLanguage()

  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
      className="btn btn-ghost px-2 py-1 text-sm font-medium"
    >
      {lang === 'en' ? '🇫🇷 FR' : '🇬🇧 EN'}
    </button>
  )
}
