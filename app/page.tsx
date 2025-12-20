import Link from 'next/link'
import { Search, Zap, ArrowRight, Check, Instagram, Building2, Crown, Palette, MessageCircle } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Search className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg">Grumtor&apos;s BM</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/auth/login" className="text-sm font-medium hover:text-primary transition">Connexion</Link>
              <Link href="/auth/register" className="btn btn-primary text-sm">Créer un compte</Link>
            </div>
          </div>
        </div>
      </header>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Service de recherche BM rapide</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Trouvez les <span className="text-gold">Business Managers</span> Instagram
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Soumettez un compte Instagram et obtenez les informations du Business Manager associé. Service rapide et fiable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register" className="btn btn-primary text-lg px-8 py-3">
              Commencer gratuitement <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="https://t.me/Grumtor" target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-lg px-8 py-3">
              <MessageCircle className="w-5 h-5" /> Me contacter
            </a>
          </div>
          <p className="text-sm text-muted-foreground mt-4">10 crédits offerts à l&apos;inscription</p>
        </div>
      </section>

      <section className="py-20 px-4 bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Comment ça marche ?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Instagram className="w-8 h-8 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary mb-2">1</div>
              <h3 className="text-xl font-semibold mb-2">Soumettez un compte</h3>
              <p className="text-muted-foreground">Entrez le @username ou le lien Instagram du compte.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-purple-500" />
              </div>
              <div className="text-3xl font-bold text-purple-500 mb-2">2</div>
              <h3 className="text-xl font-semibold mb-2">Vérification manuelle</h3>
              <p className="text-muted-foreground">Notre équipe recherche le Business Manager associé.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="text-3xl font-bold text-emerald-500 mb-2">3</div>
              <h3 className="text-xl font-semibold mb-2">Résultat</h3>
              <p className="text-muted-foreground">Recevez les informations du BM ou confirmation qu&apos;il n&apos;y en a pas.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Tarifs simples</h2>
          <p className="text-center text-muted-foreground mb-12">1 crédit = 1€</p>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="card border-2">
              <h3 className="text-xl font-bold mb-2">Standard</h3>
              <p className="text-muted-foreground mb-6">Pour les utilisateurs occasionnels</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">10</span>
                <span className="text-muted-foreground"> crédits offerts</span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2"><Check className="w-5 h-5 text-emerald-500" /><span>BM trouvé : 10 crédits</span></li>
                <li className="flex items-center gap-2"><Check className="w-5 h-5 text-emerald-500" /><span>Pas de BM : 2 crédits</span></li>
                <li className="flex items-center gap-2"><Check className="w-5 h-5 text-emerald-500" /><span>Historique de vos recherches</span></li>
              </ul>
              <Link href="/auth/register" className="btn btn-secondary w-full">Commencer</Link>
            </div>
            <div className="card border-2 border-amber-400/50 relative bg-gradient-to-br from-amber-50/50 to-yellow-50/30 dark:from-amber-900/10 dark:to-yellow-900/5">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="badge badge-premium px-4 py-1"><Crown className="w-3 h-3" /> Premium</span>
              </div>
              <h3 className="text-xl font-bold mb-2 mt-2">Premium</h3>
              <p className="text-muted-foreground mb-6">Pour les professionnels</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gold">∞</span>
                <span className="text-muted-foreground"> illimité</span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2"><Check className="w-5 h-5 text-emerald-500" /><span>Recherches illimitées</span></li>
                <li className="flex items-center gap-2"><Search className="w-5 h-5 text-primary" /><span><strong>Base de données complète</strong></span></li>
                <li className="flex items-center gap-2"><Palette className="w-5 h-5 text-pink-500" /><span><strong>Instagram Brander</strong></span></li>
              </ul>
              <a href="https://t.me/Grumtor" target="_blank" rel="noopener noreferrer" className="btn btn-gold w-full">
                <MessageCircle className="w-4 h-4" /> Contacter pour le tarif
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-secondary/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Une question ?</h2>
          <p className="text-muted-foreground mb-6">Contactez-moi directement sur Telegram pour toute demande.</p>
          <a href="https://t.me/Grumtor" target="_blank" rel="noopener noreferrer" className="btn btn-primary text-lg px-8 py-3">
            <MessageCircle className="w-5 h-5" /> Contacter @Grumtor
          </a>
        </div>
      </section>

      <footer className="border-t py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">Grumtor&apos;s BM</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://t.me/Grumtor" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition flex items-center gap-1">
              <MessageCircle className="w-4 h-4" /> @Grumtor
            </a>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 Grumtor&apos;s BM</p>
        </div>
      </footer>
    </div>
  )
}
