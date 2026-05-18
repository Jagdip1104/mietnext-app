'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

export default function InviteTenant() {
  const [tenants, setTenants] = useState<any[]>([])
  const [selectedTenant, setSelectedTenant] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data } = await supabase.from('tenants')
        .select('*, units(name, properties(name))')
        .eq('owner_id', session.user.id)
        .order('full_name')
      setTenants(data || [])
    }
    load()
  }, [])

  const handleInvite = async () => {
    if (!selectedTenant || !inviteEmail) return
    setLoading(true); setError(''); setSuccess('')

    const tenant = tenants.find(t => t.id === selectedTenant)
    const registerLink = `https://mietnext.de/tenant-register?email=${encodeURIComponent(inviteEmail)}`



    // E-Mail senden via Resend (jetzt mit Ownership-Check)
    const res = await fetch('/api/invite-tenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: selectedTenant, // ✅ statt email speichern auf Server
        email: inviteEmail,
      }),
    })

    if (!res.ok) {
      setError('E-Mail konnte nicht gesendet werden.')
      setLoading(false)
      return
    }

    setSuccess(`Link generiert: ${registerLink}`)
    setSelectedTenant(''); setInviteEmail('')
    setLoading(false)
  }

  const card = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '28px' }
  const input = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const label = { fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
          Mieter einladen
        </h1>
        <p style={{ fontSize: '14px', color: '#999', margin: '0 0 40px' }}>
          Sende deinem Mieter einen Zugang zum Mieter-Portal
        </p>

        {success && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', marginBottom: '24px', fontSize: '14px', color: '#16a34a' }}>
            <p style={{ margin: '0 0 8px', fontWeight: '500' }}>✅ Einladung gesendet!</p>
            <p style={{ margin: '0 0 8px', color: '#166534' }}>Der Mieter hat eine E-Mail erhalten mit dem Zugangslink.</p>
            <code style={{ backgroundColor: '#dcfce7', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', display: 'block', wordBreak: 'break-all', color: '#166534' }}>
              {success.split(': ')[1]}
            </code>
            <button onClick={() => navigator.clipboard.writeText(success.split(': ')[1])}
              style={{ marginTop: '8px', backgroundColor: '#16a34a', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
              Link kopieren
            </button>
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', fontSize: '14px', color: '#dc2626' }}>
            {error}
          </div>
        )}

        <div style={card}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
            <div>
              <label style={label}>Mieter auswählen *</label>
              <select value={selectedTenant} onChange={e => {
                setSelectedTenant(e.target.value)
                const t = tenants.find(t => t.id === e.target.value)
                if (t?.email) setInviteEmail(t.email)
              }} style={input}>
                <option value="">Mieter auswählen...</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} – {t.units?.properties?.name} {t.units?.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>E-Mail-Adresse des Mieters *</label>
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="mieter@email.de" type="email" style={input} />
              <p style={{ fontSize: '12px', color: '#bbb', margin: '6px 0 0' }}>
                Der Mieter bekommt automatisch eine E-Mail mit dem Zugangslink
              </p>
            </div>
          </div>

          <button onClick={handleInvite} disabled={loading || !selectedTenant || !inviteEmail}
            style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer', opacity: loading || !selectedTenant || !inviteEmail ? 0.4 : 1 }}>
            {loading ? 'Wird gesendet...' : 'Einladung senden →'}
          </button>
        </div>

        {tenants.length > 0 && (
          <div style={{ ...card, marginTop: '16px' }}>
            <h2 style={{ fontSize: '13px', color: '#999', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Deine Mieter
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {tenants.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0ede6' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 2px' }}>{t.full_name}</p>
                    <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>
                      {t.units?.properties?.name} – {t.units?.name}
                      {t.email && ` · ${t.email}`}
                    </p>
                  </div>
                  <span style={{ fontSize: '11px', color: t.email ? '#16a34a' : '#999', backgroundColor: t.email ? '#f0fdf4' : '#f5f4f0', padding: '4px 10px', borderRadius: '20px' }}>
                    {t.email ? 'Eingeladen' : 'Nicht eingeladen'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}