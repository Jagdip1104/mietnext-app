'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
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
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
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
      <main style={{ minHeight: '100vh', backgroundColor: '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '32px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '20px' }}>✓</div>
          <h2 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>Account erstellt!</h2>
          <p style={{ fontSize: '14px', color: '#999', margin: '0 0 32px', lineHeight: '1.6' }}>
            Wir haben dir eine Bestätigungs-E-Mail an <strong style={{ color: '#1a1a1a' }}>{email}</strong> geschickt.
          </p>
          <button onClick={() => router.push('/login')}
            style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer' }}>
            Zum Login →
          </button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#fafaf8', display: 'flex' }}>
      {/* Linke Seite – Branding */}
      <div style={{ flex: 1, backgroundColor: '#1a1a1a', flexDirection: 'column', justifyContent: 'space-between', padding: '48px', display: 'flex' }}>
        <div style={{ fontSize: '18px', fontWeight: '600', color: '#fff', fontFamily: 'Georgia, serif' }}>MietNext</div>
        <div>
          <p style={{ fontSize: '20px', fontWeight: '400', color: '#fff', fontFamily: 'Georgia, serif', lineHeight: '1.5', marginBottom: '32px' }}>
            Verwalte deine Immobilien professionell – von überall, jederzeit.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { icon: '🏢', text: 'Objekte & Einheiten verwalten' },
              { icon: '👥', text: 'Mieter einladen & verwalten' },
              { icon: '💶', text: 'Zahlungen & Finanzen tracken' },
              { icon: '🔧', text: 'Tickets & Wartung organisieren' },
            ].map(f => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '16px' }}>{f.icon}</span>
                <span style={{ fontSize: '14px', color: '#aaa' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rechte Seite – Register Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <div style={{ marginBottom: '40px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
              Konto erstellen
            </h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
              Kostenlos starten – keine Kreditkarte nötig
            </p>
          </div>

          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#666', marginBottom: '6px', display: 'block' }}>Vollständiger Name *</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Vor- und Nachname"
                style={{ width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff', boxSizing: 'border-box' as const }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#666', marginBottom: '6px', display: 'block' }}>E-Mail-Adresse *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@email.de"
                style={{ width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff', boxSizing: 'border-box' as const }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#666', marginBottom: '6px', display: 'block' }}>Passwort * (min. 8 Zeichen)</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff', boxSizing: 'border-box' as const }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#666', marginBottom: '6px', display: 'block' }}>Passwort bestätigen *</label>
              <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff', boxSizing: 'border-box' as const }} />
            </div>
          </div>

          <button onClick={handleRegister} disabled={loading || !fullName || !email || !password || !passwordConfirm}
            style={{ width: '100%', backgroundColor: '#1a1a1a', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer', opacity: loading || !fullName || !email || !password || !passwordConfirm ? 0.5 : 1, marginBottom: '16px' }}>
            {loading ? 'Wird erstellt...' : 'Kostenlos registrieren →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '14px', color: '#999', margin: 0 }}>
            Bereits ein Konto?{' '}
            <button onClick={() => router.push('/login')}
              style={{ background: 'none', border: 'none', color: '#1a1a1a', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
              Einloggen
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}