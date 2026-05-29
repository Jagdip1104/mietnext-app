'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function TenantPortal() {
  const [tenant, setTenant] = useState<any>(null)
  const [unit, setUnit] = useState<any>(null)
  const [contract, setContract] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [status, setStatus] = useState('Laden...')
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        if (event === 'SIGNED_IN' && session) {
          setStatus('Mieter wird gesucht...')
          await loadTenantData(session.user.id, session.user.email)
        }
        if (event === 'SIGNED_OUT') {
          router.push('/login')
        }
      }
    )

    supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: any } }) => {
      if (session) {
        await loadTenantData(session.user.id, session.user.email)
      } else {
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadTenantData = async (uid: string, email: string | undefined) => {
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('*, tenants(*, units(*, properties(*)))')
      .eq('user_id', uid)
      .maybeSingle()

    if (tenantUser?.tenants) {
      const tenantData = tenantUser.tenants
      setTenant(tenantData)
      setUnit(tenantData.units)
      await loadContractAndTickets(tenantData.id, tenantData.unit_id)
      return
    }

    if (email) {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*, units(*, properties(*))')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle()

      if (tenantData) {
        await supabase.from('tenant_users').insert({
          user_id: uid,
          tenant_id: tenantData.id,
        })
        setTenant(tenantData)
        setUnit(tenantData.units)
        await loadContractAndTickets(tenantData.id, tenantData.unit_id)
        return
      }
    }

    // Kein Mieter-Account → zurück zur Rollen-Auswahl
        router.push('/role-select?error=no-tenant')
    }

  const loadContractAndTickets = async (tenantId: string, unitId: string) => {
    // Aktiver Vertrag
    const { data: contractData } = await supabase
      .from('contracts').select('*')
      .eq('tenant_id', tenantId).eq('is_active', true)
      .maybeSingle()
    setContract(contractData)

    // Zahlungen laden (nur wenn Vertrag existiert)
    if (contractData) {
      const { data: paymentsData } = await supabase
        .from('payments').select('*')
        .eq('contract_id', contractData.id)
        .order('due_date', { ascending: true })
      setPayments(paymentsData || [])
    } else {
      setPayments([])
    }

    // Tickets
    const { data: ticketsData } = await supabase
      .from('tickets').select('*')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false })
    setTickets(ticketsData || [])
  }

  const handleTicket = async () => {
    if (!title || !tenant) return
    setLoading(true)
    const { error } = await supabase.from('tickets').insert({
      title, description, priority,
      unit_id: tenant.unit_id,
      tenant_id: tenant.id,
      status: 'open',
    })
    if (error) {
      alert('Fehler beim Ticket-Versand: ' + error.message)
      console.error('Ticket insert error:', error)
      setLoading(false)
      return
    }
    setTitle(''); setDescription(''); setPriority('medium')
    setShowForm(false); setLoading(false)
    loadContractAndTickets(tenant.id, tenant.unit_id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const formatEur = (val: number | string | null | undefined) => {
    if (val === null || val === undefined || val === '') return '0,00 €'
    const n = typeof val === 'string' ? parseFloat(val) : val
    return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  }

  // Zahlungs-Status mit Überfälligkeit-Logik
  const getPaymentStatus = (p: any) => {
    if (p.status === 'paid') return { label: 'Bezahlt', color: '#16a34a', bg: '#f0fdf4' }
    const today = new Date().toISOString().split('T')[0]
    if (p.due_date < today) return { label: 'Überfällig', color: '#dc2626', bg: '#fef2f2' }
    return { label: 'Offen', color: '#d97706', bg: '#fffbeb' }
  }

  const statusColor: any = { open: '#dc2626', in_progress: '#d97706', closed: '#16a34a' }
  const statusBg: any = { open: '#fef2f2', in_progress: '#fffbeb', closed: '#f0fdf4' }
  const statusLabel: any = { open: 'Offen', in_progress: 'In Bearbeitung', closed: 'Erledigt' }
  const priorityColor: any = { low: '#888', medium: '#d97706', high: '#dc2626' }
  const priorityLabel: any = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch' }

  const card = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '24px' }
  const input = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const label = { fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  if (notFound) {
    return (
      <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: '#1a1a1a', marginBottom: '8px' }}>Kein Mieter-Account gefunden</p>
          <p style={{ fontSize: '14px', color: '#999', marginBottom: '24px' }}>Bitte kontaktiere deinen Vermieter.</p>
          <button onClick={handleLogout} style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer' }}>
            Abmelden
          </button>
        </div>
      </main>
    )
  }

  if (!tenant) {
    return (
      <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '14px', color: '#999' }}>{status}</p>
      </main>
    )
  }

  // Nächste 6 Zahlungen für Anzeige
  const upcomingPayments = payments.slice(0, 6)
  const paidCount = payments.filter(p => p.status === 'paid').length
  const overdueCount = payments.filter(p => {
    const today = new Date().toISOString().split('T')[0]
    return p.status !== 'paid' && p.due_date < today
  }).length

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <nav style={{ backgroundColor: '#fff', borderBottom: '1px solid #e8e6e0', padding: '0 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a', fontFamily: 'Georgia, serif', padding: '16px 0' }}>
          MietNext
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13px', color: '#999' }}>{tenant.full_name}</span>
          <button onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '13px', color: '#888', backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '6px', cursor: 'pointer' }}>
            Abmelden
          </button>
        </div>
      </nav>

      <div className="max-w-[760px] mx-auto px-5 py-8 md:px-12 md:py-12 pb-24 md:pb-12">
        <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
          Mein Portal
        </h1>
        <p style={{ fontSize: '14px', color: '#999', margin: '0 0 40px' }}>Willkommen zurück, {tenant.full_name}</p>

        {/* Wohnung */}
        <div style={{ ...card, marginBottom: '16px' }}>
          <h2 style={{ fontSize: '13px', color: '#999', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Meine Wohnung</h2>
          <div className="flex flex-col gap-4 md:grid md:grid-cols-2">
            <div>
              <p style={{ fontSize: '12px', color: '#bbb', margin: '0 0 4px' }}>Objekt</p>
              <p style={{ fontSize: '15px', color: '#1a1a1a', margin: 0, fontWeight: '500' }}>{unit?.properties?.name}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#bbb', margin: '0 0 4px' }}>Einheit</p>
              <p style={{ fontSize: '15px', color: '#1a1a1a', margin: 0, fontWeight: '500' }}>{unit?.name}</p>
            </div>
            {unit?.size_sqm && (
              <div>
                <p style={{ fontSize: '12px', color: '#bbb', margin: '0 0 4px' }}>Fläche</p>
                <p style={{ fontSize: '15px', color: '#1a1a1a', margin: 0, fontWeight: '500' }}>{unit.size_sqm} m²</p>
              </div>
            )}
            {unit?.rooms && (
              <div>
                <p style={{ fontSize: '12px', color: '#bbb', margin: '0 0 4px' }}>Zimmer</p>
                <p style={{ fontSize: '15px', color: '#1a1a1a', margin: 0, fontWeight: '500' }}>{unit.rooms}</p>
              </div>
            )}
          </div>
        </div>

        {/* Vertrag */}
        {contract ? (
          <div style={{ ...card, marginBottom: '16px' }}>
            <h2 style={{ fontSize: '13px', color: '#999', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Mein Mietvertrag</h2>
            <div className="flex flex-col gap-4 md:grid md:grid-cols-2">
              <div>
                <p style={{ fontSize: '12px', color: '#bbb', margin: '0 0 4px' }}>Monatliche Miete</p>
                <p style={{ fontSize: '22px', color: '#1a1a1a', margin: 0, fontWeight: '300', fontFamily: 'Georgia, serif' }}>{formatEur(contract.rent_amount)}</p>
              </div>
              {contract.deposit && (
                <div>
                  <p style={{ fontSize: '12px', color: '#bbb', margin: '0 0 4px' }}>Kaution</p>
                  <p style={{ fontSize: '22px', color: '#1a1a1a', margin: 0, fontWeight: '300', fontFamily: 'Georgia, serif' }}>{formatEur(contract.deposit)}</p>
                </div>
              )}
              <div>
                <p style={{ fontSize: '12px', color: '#bbb', margin: '0 0 4px' }}>Vertragsbeginn</p>
                <p style={{ fontSize: '15px', color: '#1a1a1a', margin: 0, fontWeight: '500' }}>{new Date(contract.start_date).toLocaleDateString('de-DE')}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#bbb', margin: '0 0 4px' }}>Laufzeit</p>
                <p style={{ fontSize: '15px', color: '#1a1a1a', margin: 0, fontWeight: '500' }}>{contract.end_date ? `bis ${new Date(contract.end_date).toLocaleDateString('de-DE')}` : 'Unbefristet'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...card, marginBottom: '16px', backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
            <p style={{ fontSize: '14px', color: '#92400e', margin: 0 }}>
              ℹ️ Noch kein aktiver Mietvertrag hinterlegt. Bitte kontaktiere deinen Vermieter.
            </p>
          </div>
        )}

        {/* Zahlungen */}
        {contract && payments.length > 0 && (
          <div style={{ ...card, marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '13px', color: '#999', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Meine Zahlungen</h2>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                <span style={{ color: '#16a34a' }}>✓ {paidCount} bezahlt</span>
                {overdueCount > 0 && <span style={{ color: '#dc2626' }}>⚠ {overdueCount} überfällig</span>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {upcomingPayments.map(p => {
                const ps = getPaymentStatus(p)
                return (
                  <div key={p.id} style={{ backgroundColor: '#fafaf8', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '14px', color: '#1a1a1a', margin: '0 0 2px', fontWeight: '500' }}>
                        {formatEur(p.amount)}
                      </p>
                      <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
                        Fällig: {new Date(p.due_date).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <span style={{ fontSize: '11px', color: ps.color, backgroundColor: ps.bg, padding: '4px 12px', borderRadius: '20px', fontWeight: '500' }}>
                      {ps.label}
                    </span>
                  </div>
                )
              })}
            </div>
            {payments.length > 6 && (
              <p style={{ fontSize: '12px', color: '#bbb', margin: '12px 0 0', textAlign: 'center' }}>
                + {payments.length - 6} weitere Zahlungen
              </p>
            )}
          </div>
        )}

        {/* Tickets */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '13px', color: '#999', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Meine Tickets ({tickets.length})
            </h2>
            <button onClick={() => setShowForm(true)} style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
              + Schaden melden
            </button>
          </div>

          {showForm && (
            <div style={{ backgroundColor: '#fafaf8', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={label}>Titel *</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Heizung defekt" style={input} />
                </div>
                <div>
                  <label style={label}>Beschreibung</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Details zum Problem..." rows={3}
                    style={{ ...input, resize: 'vertical' as const }} />
                </div>
                <div>
                  <label style={label}>Priorität</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)} style={input}>
                    <option value="low">Niedrig</option>
                    <option value="medium">Mittel</option>
                    <option value="high">Hoch</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleTicket} disabled={loading || !title}
                  style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.4 : 1 }}>
                  {loading ? 'Senden...' : 'Ticket senden'}
                </button>
                <button onClick={() => setShowForm(false)}
                  style={{ backgroundColor: '#fff', color: '#666', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {tickets.length === 0 ? (
            <p style={{ fontSize: '14px', color: '#bbb', margin: 0 }}>Noch keine Tickets vorhanden.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tickets.map(t => (
                <div key={t.id} style={{ backgroundColor: '#fafaf8', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: t.description ? '8px' : '0' }}>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a', margin: 0 }}>{t.title}</p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: priorityColor[t.priority], fontWeight: '500' }}>
                        {priorityLabel[t.priority]}
                      </span>
                      <span style={{ fontSize: '11px', color: statusColor[t.status], backgroundColor: statusBg[t.status], padding: '2px 8px', borderRadius: '20px', fontWeight: '500' }}>
                        {statusLabel[t.status]}
                      </span>
                    </div>
                  </div>
                  {t.description && <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>{t.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}