'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

export default function Profile() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [llName, setLlName] = useState('')
  const [llStreet, setLlStreet] = useState('')
  const [llZip, setLlZip] = useState('')
  const [llCity, setLlCity] = useState('')
  const [llIban, setLlIban] = useState('')
  const [llBic, setLlBic] = useState('')
  const [llBank, setLlBank] = useState('')
  const [loadingLl, setLoadingLl] = useState(false)
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [delScheduledAt, setDelScheduledAt] = useState<string | null>(null)
  const [delPurgeAt, setDelPurgeAt] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setEmail(session.user.email || '')
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (data) {
        setFullName(data.full_name || ''); setPhone(data.phone || '')
        setLlName(data.landlord_name || ''); setLlStreet(data.landlord_street || '')
        setLlZip(data.landlord_zip || ''); setLlCity(data.landlord_city || '')
        setLlIban(data.landlord_iban || ''); setLlBic(data.landlord_bic || ''); setLlBank(data.landlord_bank || '')
        setDelScheduledAt(data.deletion_scheduled_at || null)
        setDelPurgeAt(data.deletion_purge_at || null)
      }
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

  const handleSaveLandlord = async () => {
    setLoadingLl(true); setSuccess(''); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase.from('profiles').upsert({
      id: session?.user.id,
      landlord_name: llName || null, landlord_street: llStreet || null,
      landlord_zip: llZip || null, landlord_city: llCity || null,
      landlord_iban: llIban ? llIban.replace(/\s+/g, '').toUpperCase() : null,
      landlord_bic: llBic || null, landlord_bank: llBank || null,
    })
    setLoadingLl(false)
    if (error) { setError(error.message); return }
    setSuccess('Vermieter-Stammdaten gespeichert!')
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

  const handleScheduleDelete = async () => {
    setError(''); setSuccess(''); setDeleting(true)
    try {
      const res = await fetch('/api/delete-account', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Loeschung fehlgeschlagen.'); setDeleting(false); return }
      setDelScheduledAt(new Date().toISOString())
      setDelPurgeAt(json.purge_at || null)
      setShowDeleteConfirm(false); setDeleteEmailConfirm('')
      setSuccess('Dein Konto wurde zur Loeschung vorgemerkt.')
    } catch (e: any) {
      setError('Loeschung fehlgeschlagen: ' + (e?.message || 'Unbekannter Fehler'))
    }
    setDeleting(false)
  }

  const handleReactivate = async () => {
    setError(''); setSuccess(''); setReactivating(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase.from('profiles')
      .update({ deletion_scheduled_at: null, deletion_purge_at: null })
      .eq('id', session?.user.id)
    setReactivating(false)
    if (error) { setError(error.message); return }
    setDelScheduledAt(null); setDelPurgeAt(null)
    setSuccess('Konto reaktiviert. Hinweis: Dein Abo wurde gekündigt — wähle bei Bedarf wieder einen Plan.')
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

        {delScheduledAt && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px' }}>
            <p style={{ fontSize: '15px', fontWeight: '500', color: '#dc2626', margin: '0 0 4px' }}>
              ⚠ Konto zur Löschung vorgemerkt
            </p>
            <p style={{ fontSize: '13px', color: '#b91c1c', margin: '0 0 16px' }}>
              Dein Konto und alle Daten werden am{' '}
              <strong>{delPurgeAt ? new Date(delPurgeAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</strong>{' '}
              endgültig gelöscht. Bis dahin kannst du es wiederherstellen.
            </p>
            <button onClick={handleReactivate} disabled={reactivating} style={{
              backgroundColor: '#16a34a', color: '#fff', padding: '10px 20px',
              borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', opacity: reactivating ? 0.5 : 1,
            }}>
              {reactivating ? 'Wird reaktiviert...' : 'Konto reaktivieren'}
            </button>
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

        {/* Vermieter-Stammdaten */}
        <div style={{ ...card, marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>
            Vermieter-Stammdaten für Abrechnungen
          </h2>
          <p style={{ fontSize: '13px', color: '#999', margin: '0 0 20px' }}>
            Erscheinen auf Nebenkostenabrechnungen (Anschrift + Bankverbindung für Nachzahlungen).
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={label}>Name / Firma (Vermieter)</label>
              <input value={llName} onChange={e => setLlName(e.target.value)} placeholder="z.B. Jagdip Singh oder MietNext GmbH" style={input} />
            </div>
            <div>
              <label style={label}>Straße & Hausnummer</label>
              <input value={llStreet} onChange={e => setLlStreet(e.target.value)} placeholder="Musterstraße 12" style={input} />
            </div>
            <div className="flex flex-col md:grid md:grid-cols-[140px_1fr] md:gap-4 gap-4">
              <div>
                <label style={label}>PLZ</label>
                <input value={llZip} onChange={e => setLlZip(e.target.value)} placeholder="49134" style={input} />
              </div>
              <div>
                <label style={label}>Ort</label>
                <input value={llCity} onChange={e => setLlCity(e.target.value)} placeholder="Wallenhorst" style={input} />
              </div>
            </div>
            <div>
              <label style={label}>IBAN</label>
              <input value={llIban} onChange={e => setLlIban(e.target.value)} placeholder="DE00 0000 0000 0000 0000 00" style={input} />
              <p style={{ fontSize: '12px', color: '#bbb', margin: '6px 0 0' }}>Für Nachzahlungen auf der Abrechnung. Wird nur dir angezeigt.</p>
            </div>
            <div className="flex flex-col md:grid md:grid-cols-2 md:gap-4 gap-4">
              <div>
                <label style={label}>BIC (optional)</label>
                <input value={llBic} onChange={e => setLlBic(e.target.value)} placeholder="GENODEF1XXX" style={input} />
              </div>
              <div>
                <label style={label}>Bank (optional)</label>
                <input value={llBank} onChange={e => setLlBank(e.target.value)} placeholder="Volksbank ..." style={input} />
              </div>
            </div>
          </div>
          <button onClick={handleSaveLandlord} disabled={loadingLl} style={{
            backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px',
            borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', opacity: loadingLl ? 0.4 : 1,
          }}>
            {loadingLl ? 'Speichern...' : 'Stammdaten speichern'}
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

        {!delScheduledAt && (
          <div style={{ ...card, marginTop: '16px', border: '1px solid #fecaca' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#dc2626', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>
              Konto löschen
            </h2>
            <p style={{ fontSize: '13px', color: '#999', margin: '0 0 8px' }}>
              Dein Konto, alle Objekte, Mieter, Verträge, Zahlungen und Belege werden nach einer Frist endgültig gelöscht. Ein aktives Abo wird gekündigt.
            </p>
            <p style={{ fontSize: '13px', color: '#b45309', backgroundColor: '#fffbeb', border: '1px solid #fed7aa', borderRadius: '8px', padding: '10px 12px', margin: '0 0 16px' }}>
              Exportiere vorher, was du behalten willst: Objekte/Mieter via Excel, Abrechnungen als PDF. Nach Ablauf der Frist ist nichts mehr wiederherstellbar.
            </p>
            {!showDeleteConfirm ? (
              <button onClick={() => { setShowDeleteConfirm(true); setError('') }} style={{
                backgroundColor: '#fff', color: '#dc2626', padding: '10px 20px',
                borderRadius: '8px', border: '1px solid #fecaca', fontSize: '13px', cursor: 'pointer',
              }}>
                Konto löschen
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={label}>Zur Bestätigung deine E-Mail eingeben</label>
                  <input value={deleteEmailConfirm} onChange={e => setDeleteEmailConfirm(e.target.value)} placeholder={email} style={input} />
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={handleScheduleDelete}
                    disabled={deleting || deleteEmailConfirm.trim().toLowerCase() !== email.trim().toLowerCase()}
                    style={{ backgroundColor: '#dc2626', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', opacity: (deleting || deleteEmailConfirm.trim().toLowerCase() !== email.trim().toLowerCase()) ? 0.4 : 1 }}>
                    {deleting ? 'Wird vorgemerkt...' : 'Endgültig zur Löschung vormerken'}
                  </button>
                  <button onClick={() => { setShowDeleteConfirm(false); setDeleteEmailConfirm(''); setError('') }}
                    style={{ backgroundColor: '#fff', color: '#666', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
