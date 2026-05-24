'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

interface ConfirmAction {
  paymentId: string
  action: 'reset' | 'delete'
}

export default function Payments() {
  const [contracts, setContracts] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedContract, setSelectedContract] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [paidDate, setPaidDate] = useState('')
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      loadData(session.user.id)
    }
    check()
  }, [])

  const loadData = async (uid: string) => {
    const { data: tenantsData } = await supabase.from('tenants').select('id').eq('owner_id', uid)
    const tenantIds = (tenantsData || []).map((t: any) => t.id)
    const { data: contractsData } = await supabase.from('contracts')
      .select('*, tenants(full_name), units(name, properties(name))')
      .in('tenant_id', tenantIds.length > 0 ? tenantIds : ['none'])
      .eq('is_active', true).order('created_at', { ascending: false })
    setContracts(contractsData || [])
    const contractIds = (contractsData || []).map((c: any) => c.id)
    const { data: paymentsData } = await supabase.from('payments')
      .select('*, contracts(tenant_id, tenants(full_name), units(name, properties(name)))')
      .in('contract_id', contractIds.length > 0 ? contractIds : ['none'])
      .order('due_date', { ascending: false })
    setPayments(paymentsData || [])
  }

  const handleAdd = async () => {
    if (!selectedContract || !amount || !dueDate) return
    setLoading(true)
    await supabase.from('payments').insert({
      contract_id: selectedContract, amount: parseFloat(amount),
      due_date: dueDate, paid_date: paidDate || null,
      status: paidDate ? 'paid' : status,
    })
    setSelectedContract(''); setAmount(''); setDueDate(''); setPaidDate(''); setStatus('pending')
    setShowForm(false); setLoading(false); loadData(userId!)
  }

  const handleMarkPaid = async (id: string) => {
    await supabase.from('payments').update({
      status: 'paid',
      paid_date: new Date().toISOString().split('T')[0]
    }).eq('id', id)
    loadData(userId!)
  }

  // Bezahlt → Ausstehend zurücksetzen
  const handleResetToPending = async (id: string) => {
    const { error } = await supabase.from('payments').update({
      status: 'pending',
      paid_date: null
    }).eq('id', id)
    if (error) {
      alert('Fehler beim Zurücksetzen: ' + error.message)
      return
    }
    setConfirmAction(null)
    loadData(userId!)
  }

  // Pending/Late Zahlung löschen
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('payments').delete().eq('id', id)
    if (error) {
      alert('Fehler beim Löschen: ' + error.message)
      return
    }
    setConfirmAction(null)
    loadData(userId!)
  }

  const totalPaid = payments.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
  const totalPending = payments.filter((p: any) => p.status === 'pending').reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
  const totalLate = payments.filter((p: any) => p.status === 'late').reduce((s: number, p: any) => s + Number(p.amount || 0), 0)

  const statusColor: any = { paid: '#16a34a', pending: '#d97706', late: '#dc2626' }
  const statusBg: any = { paid: '#f0fdf4', pending: '#fffbeb', late: '#fef2f2' }
  const statusLabel: any = { paid: 'Bezahlt', pending: 'Ausstehend', late: 'Überfällig' }

  const card = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '24px' }
  const input = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const label = { fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div className="max-w-[900px] mx-auto px-5 py-8 md:px-12 md:py-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-10">
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>Zahlungen</h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>{payments.length} Zahlungen gesamt</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
            + Zahlung erfassen
          </button>
        </div>

        {/* Übersicht */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-[24px]">
          {[
            { label: 'Eingegangen', value: totalPaid, color: '#16a34a' },
            { label: 'Ausstehend', value: totalPending, color: '#d97706' },
            { label: 'Überfällig', value: totalLate, color: '#dc2626' },
          ].map(s => (
            <div key={s.label} style={card}>
              <p style={{ fontSize: '12px', color: '#999', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
              <p style={{ fontSize: '28px', fontWeight: '300', color: s.color, margin: 0, fontFamily: 'Georgia, serif' }}>
                {s.value.toLocaleString('de-DE')} €
              </p>
            </div>
          ))}
        </div>

        {showForm && (
          <div style={{ ...card, marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>
              Zahlung erfassen
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-[20px]">
              <div style={{ gridColumn: 'span 2' }}>
                <label style={label}>Mietvertrag *</label>
                <select value={selectedContract} onChange={e => {
                  setSelectedContract(e.target.value)
                  const c = contracts.find((c: any) => c.id === e.target.value)
                  if (c) setAmount(c.rent_amount.toString())
                }} style={input}>
                  <option value="">Vertrag auswählen...</option>
                  {contracts.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.tenants?.full_name} – {c.units?.properties?.name} – {c.rent_amount} €</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={label}>Betrag (€) *</label>
                <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="z.B. 950" type="number" style={input} />
              </div>
              <div>
                <label style={label}>Fällig am *</label>
                <input value={dueDate} onChange={e => setDueDate(e.target.value)} type="date" style={input} />
              </div>
              <div>
                <label style={label}>Eingegangen am</label>
                <input value={paidDate} onChange={e => setPaidDate(e.target.value)} type="date" style={input} />
              </div>
              <div>
                <label style={label}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} style={input}>
                  <option value="pending">Ausstehend</option>
                  <option value="paid">Bezahlt</option>
                  <option value="late">Überfällig</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleAdd} disabled={loading || !selectedContract || !amount || !dueDate}
                style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.4 : 1 }}>
                {loading ? 'Speichern...' : 'Speichern'}
              </button>
              <button onClick={() => setShowForm(false)} style={{ backgroundColor: '#fff', color: '#666', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {payments.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '64px' }}>
            <p style={{ fontSize: '14px', color: '#bbb', margin: '0 0 12px' }}>Noch keine Zahlungen erfasst.</p>
            <button onClick={() => setShowForm(true)} style={{ background: 'none', border: 'none', color: '#1a1a1a', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}>
              Erste Zahlung erfassen →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {payments.map((p: any) => {
              const isConfirmingReset = confirmAction?.paymentId === p.id && confirmAction?.action === 'reset'
              const isConfirmingDelete = confirmAction?.paymentId === p.id && confirmAction?.action === 'delete'

              return (
                <div key={p.id} style={card}>
                  {isConfirmingReset ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <p style={{ fontSize: '14px', color: '#d97706', margin: 0 }}>
                        Zahlung auf <strong>"Ausstehend"</strong> zurücksetzen? Bezahl-Datum wird entfernt.
                      </p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleResetToPending(p.id)} style={{ backgroundColor: '#d97706', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
                          Ja, zurücksetzen
                        </button>
                        <button onClick={() => setConfirmAction(null)} style={{ backgroundColor: '#fff', color: '#666', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : isConfirmingDelete ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>
                        Zahlung über <strong>{Number(p.amount).toLocaleString('de-DE')} €</strong> wirklich löschen?
                      </p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleDelete(p.id)} style={{ backgroundColor: '#dc2626', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
                          Ja, löschen
                        </button>
                        <button onClick={() => setConfirmAction(null)} style={{ backgroundColor: '#fff', color: '#666', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 4px' }}>
                          {p.contracts?.tenants?.full_name}
                        </p>
                        <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>
                          Fällig: {new Date(p.due_date).toLocaleDateString('de-DE')}
                          {p.paid_date && ` · Bezahlt: ${new Date(p.paid_date).toLocaleDateString('de-DE')}`}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <p style={{ fontSize: '16px', fontWeight: '500', color: '#1a1a1a', margin: 0, fontFamily: 'Georgia, serif' }}>
                          {Number(p.amount).toLocaleString('de-DE')} €
                        </p>
                        <span style={{ fontSize: '11px', color: statusColor[p.status], backgroundColor: statusBg[p.status], padding: '4px 12px', borderRadius: '20px', fontWeight: '500' }}>
                          {statusLabel[p.status]}
                        </span>

                        {/* Aktions-Buttons je nach Status */}
                        {p.status === 'paid' ? (
                          <button onClick={() => setConfirmAction({ paymentId: p.id, action: 'reset' })}
                            title="Falsch markiert? Zurück auf Ausstehend"
                            style={{ backgroundColor: '#fffbeb', color: '#d97706', padding: '8px 14px', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '13px', cursor: 'pointer' }}>
                            ↩ Zurücksetzen
                          </button>
                        ) : (
                          <>
                            <button onClick={() => handleMarkPaid(p.id)}
                              style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '8px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '13px', cursor: 'pointer' }}>
                              Als bezahlt markieren
                            </button>
                            <button onClick={() => setConfirmAction({ paymentId: p.id, action: 'delete' })}
                              title="Zahlung löschen"
                              style={{ backgroundColor: '#fff', color: '#dc2626', padding: '8px 14px', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '13px', cursor: 'pointer' }}>
                              Löschen
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}