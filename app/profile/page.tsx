'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

export default function Profile() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setEmail(session.user.email || '')
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (data) { setFullName(data.full_name || ''); setPhone(data.phone || '') }
    }
    load()
  }, [])

  const handleSave = async () => {
    setLoading(true); setSuccess(''); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('profiles').upsert({ id: session?.user.id, full_name: fullName, phone, email })
    setLoading(false); setSuccess('Profil erfolgreich gespeichert!')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handlePasswordChange = async () => {
    setError(''); setSuccess('')
    if (newPassword.length < 8) { setError('Passwort muss mindestens 8 Zeichen lang sein.'); return }
    if (newPassword !== passwordConfirm) { setError('Passwörter stimmen nicht überein.'); return }
    setLoadingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setError(error.message) } else {
      setSuccess('Passwort erfolgreich geändert!')
      setNewPassword(''); setPasswordConfirm('')
      setTimeout(() => setSuccess(''), 3000)
    }
    setLoadingPassword(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const card = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '28px' }
  const input = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const label = { fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div className="max-w-[640px] mx-auto px-5 py-8 md:px-12 md:py-12 pb-24 md:pb-12">
        <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
          Profil
        </h1>
        <p style={{ fontSize: '14px', color: '#999', margin: '0 0 40px' }}>Deine persönlichen Einstellungen</p>

        {success && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', fontSize: '14px', color: '#16a34a' }}>
            {success}
          </div>
        )}
        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', fontSize: '14px', color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* Persönliche Daten */}
        <div style={{ ...card, marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>
            Persönliche Daten
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={label}>E-Mail-Adresse</label>
              <input value={email} disabled style={{ ...input, backgroundColor: '#f5f4f0', color: '#999', cursor: 'not-allowed' }} />
              <p style={{ fontSize: '12px', color: '#bbb', margin: '6px 0 0' }}>E-Mail kann nicht geändert werden</p>
            </div>
            <div>
              <label style={label}>Vollständiger Name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Vor- und Nachname" style={input} />
            </div>
            <div>
              <label style={label}>Telefon</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+49 123 456789" style={input} />
            </div>
          </div>
          <button onClick={handleSave} disabled={loading} style={{
            backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px',
            borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.4 : 1,
          }}>
            {loading ? 'Speichern...' : 'Änderungen speichern'}
          </button>
        </div>

        {/* Passwort */}
        <div style={{ ...card, marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>
            Passwort ändern
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={label}>Neues Passwort</label>
              <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" type="password" style={input} />
            </div>
            <div>
              <label style={label}>Passwort bestätigen</label>
              <input value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="••••••••" type="password" style={input} />
            </div>
          </div>
          <button onClick={handlePasswordChange} disabled={loadingPassword} style={{
            backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px',
            borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', opacity: loadingPassword ? 0.4 : 1,
          }}>
            {loadingPassword ? 'Speichern...' : 'Passwort ändern'}
          </button>
        </div>

        {/* Abmelden */}
        <div style={card}>
          <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>
            Account
          </h2>
          <p style={{ fontSize: '13px', color: '#999', margin: '0 0 20px' }}>Abmelden von MietNext auf diesem Gerät</p>
          <button onClick={handleLogout} style={{
            backgroundColor: '#fff', color: '#dc2626', padding: '10px 20px',
            borderRadius: '8px', border: '1px solid #fecaca', fontSize: '13px', cursor: 'pointer',
          }}>
            Abmelden
          </button>
        </div>
      </div>
    </main>
  )
}