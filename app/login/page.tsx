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
    // Prüfe ob bereits eingeloggt
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        redirectUser(session.user.id)
      }
    }
    check()

    // Höre auf Auth-Änderungen (Magic Link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        redirectUser(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const redirectUser = async (uid: string) => {
    // Prüfe ob Mieter
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('id')
      .eq('user_id', uid)
      .single()

    if (tenantUser) {
      router.push('/tenant-portal')
    } else {
      router.push('/dashboard')
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-Mail oder Passwort falsch')
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '380px' }}>
        <div style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', textAlign: 'center', marginBottom: '4px', fontFamily: 'Georgia, serif' }}>
          MietNext
        </div>
        <div style={{ fontSize: '14px', color: '#999', textAlign: 'center', marginBottom: '32px' }}>
          Professionelle Immobilienverwaltung
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#dc2626' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>E-Mail-Adresse</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="name@email.de"
            style={{ width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Passwort</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }} />
        </div>

        <button onClick={handleLogin} disabled={loading}
          style={{ width: '100%', backgroundColor: '#1a1a1a', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer', opacity: loading ? 0.5 : 1, marginBottom: '16px' }}>
          {loading ? 'Laden...' : 'Einloggen →'}
        </button>

        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <button onClick={() => router.push('/forgot-password')}
            style={{ background: 'none', border: 'none', color: '#999', fontSize: '13px', cursor: 'pointer' }}>
            Passwort vergessen?
          </button>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '13px', color: '#999' }}>Noch kein Konto? </span>
          <button onClick={() => router.push('/register')}
            style={{ background: 'none', border: 'none', color: '#1a1a1a', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
            Jetzt registrieren
          </button>
        </div>
      </div>
    </main>
  )
}