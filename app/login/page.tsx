'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { redirectUser(session.user.id, session.user.email || '') }
    }
    check()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        if (event === 'SIGNED_IN' && session) {
          redirectUser(session.user.id, session.user.email || '')
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const redirectUser = async (uid: string, userEmail: string) => {
    const emailLower = userEmail.toLowerCase().trim()
    const { data: existingTU } = await supabase
      .from('tenant_users').select('id').eq('user_id', uid).limit(1)
    if (!existingTU || existingTU.length === 0) {
      const { data: tenants } = await supabase
        .from('tenants').select('id').ilike('email', emailLower).limit(1)
      if (tenants && tenants.length > 0) {
        await supabase.from('tenant_users').insert({
          user_id: uid,
          tenant_id: tenants[0].id,
        })
      }
    }
    router.push('/role-select')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })
    if (error) {
      setError('E-Mail oder Passwort falsch')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#fafaf8] flex flex-col md:flex-row">
      {/* Left testimonial panel - hidden on mobile */}
      <div className="hidden md:flex flex-1 bg-[#1a1a1a] flex-col justify-between p-12">
        <div className="text-lg font-semibold text-white" style={{ fontFamily: 'Georgia, serif' }}>
          MietNext
        </div>
        <div>
          <p className="text-2xl font-normal text-white mb-6 leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
            "Endlich habe ich alle meine Objekte und Mieter an einem Ort."
          </p>
          <p className="text-sm text-[#888] m-0">— Jagdip Singh, Vermieter aus Düsseldorf</p>
        </div>
      </div>

      {/* Right form panel - full width on mobile */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 md:px-12">
        <div className="w-full max-w-[360px]">
          {/* Mobile-only logo */}
          <div className="md:hidden text-center mb-10">
            <div className="text-2xl font-semibold text-[#1a1a1a]" style={{ fontFamily: 'Georgia, serif' }}>
              MietNext
            </div>
          </div>

          <div className="mb-10">
            <h1 className="text-2xl font-normal text-[#1a1a1a] mb-1" style={{ fontFamily: 'Georgia, serif' }}>
              Willkommen zurück
            </h1>
            <p className="text-sm text-[#999] m-0">
              Logge dich in deinen Account ein
            </p>
          </div>

          {error && (
            <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg px-4 py-3 mb-5 text-sm text-[#dc2626]">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} action="#" method="post">
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="text-[13px] text-[#666] mb-1.5 block">E-Mail-Adresse</label>
                <input type="email" name="email" autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="name@email.de" required
                  className="w-full border border-[#e8e6e0] rounded-lg px-4 py-2.5 text-sm outline-none text-[#1a1a1a] bg-white box-border" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[13px] text-[#666]">Passwort</label>
                  <button type="button" onClick={() => router.push('/forgot-password')}
                    className="bg-transparent border-none text-[#888] text-[13px] cursor-pointer p-0">
                    Vergessen?
                  </button>
                </div>
                <input type="password" name="password" autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="w-full border border-[#e8e6e0] rounded-lg px-4 py-2.5 text-sm outline-none text-[#1a1a1a] bg-white box-border" />
              </div>
            </div>

            <button type="submit" disabled={loading || !email || !password}
              className="w-full bg-[#1a1a1a] text-white py-3 rounded-lg border-none text-sm cursor-pointer mb-4 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Einloggen...' : 'Einloggen →'}
            </button>
          </form>

          <p className="text-center text-sm text-[#999] m-0">
            Noch kein Konto?{' '}
            <button onClick={() => router.push('/register')}
              className="bg-transparent border-none text-[#1a1a1a] text-sm cursor-pointer underline p-0">
              Kostenlos registrieren
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}
