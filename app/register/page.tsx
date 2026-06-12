'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleRegister = async () => {
    setError('')
    if (!fullName || !email || !password) {
      setError('Bitte alle Pflichtfelder ausfüllen.')
      return
    }
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    if (password !== passwordConfirm) {
      setError('Passwörter stimmen nicht überein.')
      return
    }
    if (!acceptedTerms) {
      setError('Bitte AGB und Datenschutzerklärung akzeptieren.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: {
          full_name: fullName,
          terms_accepted_at: new Date().toISOString(),
        }
      }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#fafaf8] flex items-center justify-center px-5">
        <div className="text-center max-w-[400px] w-full">
          <div className="w-12 h-12 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center mx-auto mb-6 text-xl">✓</div>
          <h2 className="text-[22px] font-normal text-[#1a1a1a] mb-2" style={{ fontFamily: 'Georgia, serif' }}>Account erstellt!</h2>
          <p className="text-sm text-[#999] mb-8 leading-relaxed">
            Wir haben dir eine Bestätigungs-E-Mail an <strong className="text-[#1a1a1a]">{email}</strong> geschickt.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="bg-[#1a1a1a] text-white px-6 py-3 rounded-lg text-sm hover:bg-black transition-colors"
          >
            Zum Login →
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fafaf8] flex flex-col md:flex-row">
      {/* Linke Seite – Branding (nur Desktop) */}
      <div className="hidden md:flex md:flex-1 bg-[#1a1a1a] flex-col justify-between p-12">
        <div className="text-lg font-semibold text-white" style={{ fontFamily: 'Georgia, serif' }}>MietNext</div>
        <div>
          <p className="text-2xl text-white leading-relaxed mb-6" style={{ fontFamily: 'Georgia, serif' }}>
            "Endlich eine Lösung, die einfach funktioniert. Verwalte 12 Wohnungen ohne Excel-Chaos."
          </p>
          <p className="text-sm text-white/60">— Andreas Held, Vermieter aus Rodgau</p>
        </div>
        <div className="text-xs text-white/40">
          © {new Date().getFullYear()} MietNext · Hosted in Frankfurt 🇩🇪
        </div>
      </div>

      {/* Mobile Logo Header */}
      <div className="md:hidden bg-[#1a1a1a] px-5 py-6 text-center">
        <Link href="/" className="text-xl font-semibold text-white no-underline" style={{ fontFamily: 'Georgia, serif' }}>
          MietNext
        </Link>
      </div>

      {/* Rechte Seite – Form */}
      <div className="flex-1 flex items-center justify-center p-5 md:p-12">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[28px] md:text-[32px] font-normal text-[#1a1a1a] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            Konto erstellen
          </h1>
          <p className="text-sm text-[#999] mb-8">Starte kostenlos mit 3 Einheiten</p>

          {error && (
            <div className="bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[#666] mb-1.5">Vollständiger Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Max Mustermann"
                className="w-full bg-white border border-[#e8e6e0] px-4 py-3 rounded-lg text-sm text-[#1a1a1a] outline-none focus:border-[#1a1a1a] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#666] mb-1.5">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="max@beispiel.de"
                autoComplete="email"
                className="w-full bg-white border border-[#e8e6e0] px-4 py-3 rounded-lg text-sm text-[#1a1a1a] outline-none focus:border-[#1a1a1a] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#666] mb-1.5">Passwort</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mindestens 8 Zeichen"
                autoComplete="new-password"
                className="w-full bg-white border border-[#e8e6e0] px-4 py-3 rounded-lg text-sm text-[#1a1a1a] outline-none focus:border-[#1a1a1a] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#666] mb-1.5">Passwort bestätigen</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Passwort wiederholen"
                autoComplete="new-password"
                className="w-full bg-white border border-[#e8e6e0] px-4 py-3 rounded-lg text-sm text-[#1a1a1a] outline-none focus:border-[#1a1a1a] transition-colors"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 cursor-pointer accent-[#1a1a1a]"
              />
              <span className="text-xs text-[#666] leading-relaxed">
                Ich akzeptiere die{' '}
                <Link href="/agb" className="text-[#1a1a1a] underline">AGB</Link>
                {' '}und die{' '}
                <Link href="/datenschutz" className="text-[#1a1a1a] underline">Datenschutzerklärung</Link>.
              </span>
            </label>

            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full bg-[#1a1a1a] text-white py-3 rounded-lg text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Wird erstellt...' : 'Konto erstellen →'}
            </button>
          </div>

          <p className="text-sm text-[#999] text-center mt-8">
            Schon ein Konto?{' '}
            <Link href="/login" className="text-[#1a1a1a] underline">
              Anmelden
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
