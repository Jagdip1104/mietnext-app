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

    // Hat User bereits einen tenant_users Eintrag?
    const { data: existingTU } = await supabase
      .from('tenant_users').select('id').eq('user_id', uid).limit(1)

    // Wenn nicht → suche tenant per E-Mail (case-insensitive)
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

    // Final check (kein .single() mehr - sicher gegen Duplikate)
    const { data: finalTU } = await supabase
      .from('tenant_users').select('id').eq('user_id', uid).limit(1)

    const { count: propertyCount } = await supabase
      .from('properties').select('*', { count: 'exact', head: true })
      .eq('owner_id', uid)

    const isTenant = (finalTU?.length || 0) > 0
    const isLandlord = (propertyCount || 0) > 0

    if (isTenant && isLandlord) {
      router.push('/role-select')
    } else if (isTenant) {
      router.push('/tenant-portal')
    } else {
      router.push('/dashboard')
    }
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
    <main style={{ minHeight: '100vh', backgroundColor: '#fafaf8', display: 'flex' }}>
      <div style={{ flex: 1, backgroundColor: '#1a1a1a', flexDirection: 'column', justifyContent: 'space-between', padding: '48px', display: 'flex' }}>
        <div style={{ fontSize: '18px', fontWeight: '600', color: '#fff', fontFamily: 'Georgia, serif' }}>MietNext</div>
        <div>
          <p style={{ fontSize: '24px', fontWeight: '400', color: '#fff', fontFamily: 'Georgia, serif', lineHeight: '1.4', marginBottom: '24px' }}>
            "Endlich habe ich alle meine Objekte und Mieter an einem Ort."
          </p>
          <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>— Jagdip Singh, Vermieter aus Düsseldorf</p>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <div style={{ marginBottom: '40px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
              Willkommen zurück
            </h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
              Logge dich in deinen Account ein
            </p>
          </div>

          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} action="#" method="post">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#666', marginBottom: '6px', display: 'block' }}>E-Mail-Adresse</label>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@email.de"
                  required
                  style={{ width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#666' }}>Passwort</label>
                  <button type="button" onClick={() => router.push('/forgot-password')}
                    style={{ background: 'none', border: 'none', color: '#888', fontSize: '13px', cursor: 'pointer', padding: 0 }}>
                    Vergessen?
                  </button>
                </div>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff', boxSizing: 'border-box' as const }} />
              </div>
            </div>

            <button type="submit" disabled={loading || !email || !password}
              style={{ width: '100%', backgroundColor: '#1a1a1a', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer', opacity: loading || !email || !password ? 0.5 : 1, marginBottom: '16px' }}>
              {loading ? 'Einloggen...' : 'Einloggen →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '14px', color: '#999', margin: 0 }}>
            Noch kein Konto?{' '}
            <button onClick={() => router.push('/register')}
              style={{ background: 'none', border: 'none', color: '#1a1a1a', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
              Kostenlos registrieren
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}