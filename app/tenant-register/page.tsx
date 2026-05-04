'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function TenantRegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) setEmail(decodeURIComponent(emailParam))
  }, [searchParams])

  const handleRegister = async () => {
    setError('')
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    if (password !== passwordConfirm) {
      setError('Passwörter stimmen nicht überein.')
      return
    }
    setLoading(true)

    // Registrieren
    await supabase.auth.signUp({ email, password })

    // Direkt einloggen
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError || !data.session) {
      setError('Fehler beim Einloggen. Bitte versuche es erneut.')
      setLoading(false)
      return
    }

    const uid = data.session.user.id

    // Mieter anhand E-Mail suchen
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('*')
      .eq('email', email)
      .single()

    if (!tenantData) {
      setError('Kein Mieter mit dieser E-Mail gefunden. Bitte kontaktiere deinen Vermieter.')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    // Prüfe ob tenant_users bereits existiert
    const { data: existingTU } = await supabase
      .from('tenant_users')
      .select('id')
      .eq('user_id', uid)
      .single()

    if (!existingTU) {
      const { error: tuError } = await supabase.from('tenant_users').insert({
        user_id: uid,
        tenant_id: tenantData.id,
      })
      if (tuError) {
        console.error('tenant_users Fehler:', tuError)
      }
    }

    setLoading(false)
    router.push('/tenant-portal')
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '380px' }}>
        <div style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', textAlign: 'center', marginBottom: '4px', fontFamily: 'Georgia, serif' }}>
          MietNext
        </div>
        <div style={{ fontSize: '14px', color: '#999', textAlign: 'center', marginBottom: '8px' }}>
          Mieter-Portal Zugang einrichten
        </div>
        <div style={{ fontSize: '13px', color: '#bbb', textAlign: 'center', marginBottom: '32px' }}>
          Setze dein Passwort um auf dein Mieter-Portal zuzugreifen
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#dc2626' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>E-Mail-Adresse</label>
          <input type="email" value={email} disabled
            style={{ width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#999', backgroundColor: '#f5f4f0', cursor: 'not-allowed' }} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Passwort wählen *</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Mindestens 8 Zeichen"
            style={{ width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Passwort bestätigen *</label>
          <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
            placeholder="••••••••"
            style={{ width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }} />
        </div>

        <button onClick={handleRegister} disabled={loading || !password || !passwordConfirm}
          style={{ width: '100%', backgroundColor: '#1a1a1a', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer', opacity: loading || !password || !passwordConfirm ? 0.5 : 1 }}>
          {loading ? 'Wird eingerichtet...' : 'Zugang einrichten →'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <span style={{ fontSize: '13px', color: '#999' }}>Bereits registriert? </span>
          <button onClick={() => router.push('/login')}
            style={{ background: 'none', border: 'none', color: '#1a1a1a', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
            Einloggen
          </button>
        </div>
      </div>
    </main>
  )
}

export default function TenantRegister() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', backgroundColor: '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#999', fontSize: '14px' }}>Laden...</p>
      </div>
    }>
      <TenantRegisterForm />
    </Suspense>
  )
}