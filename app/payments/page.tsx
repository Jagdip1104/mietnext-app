'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import MahnungModal from '@/components/MahnungModal'
import { useToast } from '@/components/ui/Toast'
import { formatEur, fmtDate } from '@/lib/format'
import { Undo2 } from 'lucide-react'

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
  const [filterProperty, setFilterProperty] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterYear, setFilterYear] = useState<string>('month')
  const [loading, setLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [mahnungData, setMahnungData] = useState<any>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [bookAmount, setBookAmount] = useState('')
  const router = useRouter()
  const toast = useToast()

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
      .order('created_at', { ascending: false })
    setContracts(contractsData || [])
    const contractIds = (contractsData || []).map((c: any) => c.id)
    const { data: paymentsData } = await supabase.from('payments')
      .select('*, contracts(tenant_id, tenants(full_name), units(name, properties(name)))')
      .in('contract_id', contractIds.length > 0 ? contractIds : ['none'])
      .order('due_date', { ascending: false })
    setPayments(paymentsData || [])
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setProfile(prof)
  }

  const handleAdd = async () => {
    if (!selectedContract || !amount || !dueDate) return
    setLoading(true)
    const { error } = await supabase.from('payments').insert({
      contract_id: selectedContract, amount: parseFloat(amount),
      due_date: dueDate, paid_date: paidDate || null,
      status: paidDate ? 'paid' : status,
    })
    if (error) { toast.error('Fehler: ' + error.message); setLoading(false); return }
    toast.success('Zahlung erfasst')
    setSelectedContract(''); setAmount(''); setDueDate(''); setPaidDate(''); setStatus('pending')
    setShowForm(false); setLoading(false); loadData(userId!)
  }

  const handleBookPayment = async (id: string) => {
    const val = parseFloat((bookAmount || '').replace(',', '.'))
    if (!val || val <= 0) { toast.error('Bitte Betrag eingeben'); return }
    const { error } = await supabase.from('payment_receipts').insert({
      payment_id: id, amount: val, received_on: new Date().toISOString().split('T')[0]
    })
    if (error) { toast.error('Fehler: ' + error.message); return }
    toast.success('Teilzahlung verbucht')
    setBookingId(null); setBookAmount('')
    loadData(userId!)
  }

  const handleMarkPaid = async (id: string) => {
    const p = payments.find((x: any) => x.id === id)
    if (!p) return
    const rest = Number(p.amount || 0) - Number(p.paid_amount || 0)
    if (rest <= 0) { loadData(userId!); return }
    const { error } = await supabase.from('payment_receipts').insert({
      payment_id: id, amount: rest, received_on: new Date().toISOString().split('T')[0]
    })
    if (error) { toast.error('Fehler: ' + error.message); return }
    toast.success('Als bezahlt markiert')
    loadData(userId!)
  }

  // Bezahlt → Ausstehend zurücksetzen
  const handleResetToPending = async (id: string) => {
    const { error } = await supabase.from('payment_receipts').delete().eq('payment_id', id)
    if (error) {
      toast.error('Fehler beim Zurücksetzen: ' + error.message)
      return
    }
    toast.success('Zahlung auf Ausstehend zurückgesetzt')
    setConfirmAction(null)
    loadData(userId!)
  }

  // Pending/Late Zahlung löschen
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('payments').delete().eq('id', id)
    if (error) {
      toast.error('Fehler beim Löschen: ' + error.message)
      return
    }
    toast.success('Zahlung gelöscht')
    setConfirmAction(null)
    loadData(userId!)
  }

  // Filter logic
  const todayISO = new Date().toISOString().slice(0, 10)
  const _now = new Date()
  const curYear = _now.getFullYear()
  const curMonth = _now.getMonth()
  const remaining = (p: any) => Math.max(0, Number(p.amount || 0) - Number(p.paid_amount || 0))
  const isPartial = (p: any) => Number(p.paid_amount || 0) > 0 && remaining(p) > 0
  const effectiveStatus = (p: any) => {
    if (remaining(p) <= 0) return 'paid'
    if (p.status === 'late' || p.due_date < todayISO) return 'late'
    return 'pending'
  }
  const filteredPayments = payments.filter((p: any) => {
    if (filterProperty !== 'all' && p.contracts?.units?.properties?.name !== filterProperty) return false
    if (filterStatus !== 'all' && effectiveStatus(p) !== filterStatus) return false
    if (filterYear === 'month') {
      const d = new Date(p.due_date)
      const sameMonth = d.getFullYear() === curYear && d.getMonth() === curMonth
      if (!sameMonth && effectiveStatus(p) !== 'late') return false
    } else if (filterYear !== 'all' && new Date(p.due_date).getFullYear().toString() !== filterYear) {
      return false
    }
    return true
  })

  const propertyOptions: string[] = Array.from(new Set(payments.map((p: any) => p.contracts?.units?.properties?.name).filter(Boolean) as string[])).sort()
  const yearOptions: string[] = Array.from(new Set(payments.map((p: any) => new Date(p.due_date).getFullYear().toString()))).sort().reverse()

  const totalPaid = filteredPayments.reduce((s: number, p: any) => s + Number(p.paid_amount || 0), 0)
  const totalPending = filteredPayments.filter((p: any) => effectiveStatus(p) === 'pending').reduce((s: number, p: any) => s + remaining(p), 0)
  const totalLate = filteredPayments.filter((p: any) => effectiveStatus(p) === 'late').reduce((s: number, p: any) => s + remaining(p), 0)

  const overdueByTenant = (() => {
    const map = new Map<string, any>()
    for (const p of payments) {
      if (effectiveStatus(p) !== 'late') continue
      const tid = p.contracts?.tenant_id
      if (!tid) continue
      if (!map.has(tid)) map.set(tid, {
        tenantId: tid,
        tenantName: p.contracts?.tenants?.full_name || 'Mieter',
        propertyName: p.contracts?.units?.properties?.name || '',
        unitName: p.contracts?.units?.name || '',
        payments: [] as any[],
        total: 0,
      })
      const g = map.get(tid)
      g.payments.push({ id: p.id, due_date: p.due_date, amount: remaining(p) })
      g.total += remaining(p)
    }
    return Array.from(map.values())
  })()

  const statusColor: any = { paid: '#16a34a', pending: '#d97706', late: '#dc2626' }
  const statusBg: any = { paid: '#f0fdf4', pending: '#fffbeb', late: '#fef2f2' }
  const statusLabel: any = { paid: 'Bezahlt', pending: 'Ausstehend', late: 'Überfällig' }

  const card = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '24px' }
  const input = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const label = { fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div className="max-w-[900px] mx-auto px-5 py-8 md:px-12 md:py-12 pb-24 md:pb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-10">
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>Zahlungen</h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>{filteredPayments.length === payments.length ? `${payments.length} Zahlungen gesamt` : `${filteredPayments.length} von ${payments.length} Zahlungen`}</p>
          </div>
          <button onClick={() => { setShowForm(true); setTimeout(() => document.getElementById('formcard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }} style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
            + Zahlung erfassen
          </button>
        </div>

        {/* Übersicht */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-[24px]">
          {[
            { label: 'Eingegangen', value: totalPaid, color: '#16a34a', key: 'paid' },
            { label: 'Ausstehend', value: totalPending, color: '#d97706', key: 'pending' },
            { label: 'Überfällig', value: totalLate, color: '#dc2626', key: 'late' },
          ].map(s => {
            const active = filterStatus === s.key
            return (
              <div key={s.label} onClick={() => setFilterStatus(active ? 'all' : s.key)}
                style={{ ...card, cursor: 'pointer', border: active ? '1.5px solid ' + s.color : card.border }}>
                <p style={{ fontSize: '12px', color: '#999', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
                <p style={{ fontSize: '28px', fontWeight: '300', color: s.color, margin: 0, fontFamily: 'Georgia, serif' }}>
                  {formatEur(s.value)}
                </p>
              </div>
            )
          })}
        </div>

        {overdueByTenant.length > 0 && (
          <div style={{ ...card, marginBottom: '24px', border: '1px solid #fecaca' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>Überfällige Zahlungen</h2>
            <p style={{ fontSize: '13px', color: '#999', margin: '0 0 16px' }}>Zahlungserinnerung oder Mahnung als PDF erstellen.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {overdueByTenant.map((g: any) => (
                <div key={g.tenantId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f5f4ef' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 2px' }}>{g.tenantName}</p>
                    <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>{g.propertyName} · {g.payments.length} {g.payments.length === 1 ? 'offener' : 'offene'} Posten · {g.total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                  </div>
                  <button onClick={() => setMahnungData(g)} style={{ backgroundColor: '#fff', color: '#dc2626', padding: '8px 16px', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Mahnung erstellen
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showForm && (
          <div id="formcard" className="scroll-mt-24" style={{ ...card, marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>
              Zahlung erfassen
            </h2>
            <div className="flex flex-col gap-4 md:grid md:grid-cols-2 mb-[20px]">
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

        {/* Filter (nur wenn Zahlungen vorhanden) */}
        {payments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)} style={input}>
              <option value="all">Alle Objekte</option>
              {propertyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={input}>
              <option value="all">Alle Status</option>
              <option value="paid">Bezahlt</option>
              <option value="pending">Ausstehend</option>
              <option value="late">Überfällig</option>
            </select>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={input}>
              <option value="month">Dieser Monat</option>
              <option value="all">Alle Jahre</option>
              {yearOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        )}

        {payments.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '64px' }}>
            <p style={{ fontSize: '14px', color: '#bbb', margin: '0 0 12px' }}>Noch keine Zahlungen erfasst.</p>
            <button onClick={() => { setShowForm(true); setTimeout(() => document.getElementById('formcard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }} style={{ background: 'none', border: 'none', color: '#1a1a1a', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}>
              Erste Zahlung erfassen →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredPayments.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '48px' }}>
                <p style={{ fontSize: '14px', color: '#bbb', margin: 0 }}>Keine Zahlungen für diese Filter gefunden.</p>
              </div>
            ) : filteredPayments.map((p: any) => {
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
                        Zahlung über <strong>{formatEur(p.amount)}</strong> wirklich löschen?
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
                          Fällig: {fmtDate(p.due_date)}
                          {p.paid_date && ` · Bezahlt: ${fmtDate(p.paid_date)}`}
                        </p>
                        {isPartial(p) && (
                          <p style={{ fontSize: '12px', color: '#d97706', margin: '4px 0 0', fontWeight: '500' }}>
                            Teilbezahlt: {formatEur(Number(p.paid_amount || 0))} · offen {formatEur(remaining(p))}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <p style={{ fontSize: '16px', fontWeight: '500', color: '#1a1a1a', margin: 0, fontFamily: 'Georgia, serif' }}>
                          {formatEur(p.amount)}
                        </p>
                        <span style={{ fontSize: '11px', color: statusColor[effectiveStatus(p)], backgroundColor: statusBg[effectiveStatus(p)], padding: '4px 12px', borderRadius: '20px', fontWeight: '500' }}>
                          {statusLabel[effectiveStatus(p)]}
                        </span>

                        {/* Aktions-Buttons je nach Status */}
                        {p.status === 'paid' ? (
                          <button onClick={() => setConfirmAction({ paymentId: p.id, action: 'reset' })}
                            title="Falsch markiert? Zurück auf Ausstehend"
                            style={{ backgroundColor: '#fffbeb', color: '#d97706', padding: '8px 14px', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '13px', cursor: 'pointer' }}>
                            <Undo2 size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />Zurücksetzen
                          </button>
                        ) : (
                          <>
                            <button onClick={() => handleMarkPaid(p.id)}
                              style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '8px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '13px', cursor: 'pointer' }}>
                              Als bezahlt markieren
                            </button>
                            {bookingId === p.id ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <input type="number" value={bookAmount} onChange={e => setBookAmount(e.target.value)} autoFocus
                                  placeholder={`max ${remaining(p)}`}
                                  style={{ width: '90px', border: '1px solid #e8e6e0', borderRadius: '6px', padding: '6px 8px', fontSize: '13px', outline: 'none', textAlign: 'right' as const }} />
                                <button onClick={() => handleBookPayment(p.id)}
                                  style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '8px 14px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
                                  Verbuchen
                                </button>
                                <button onClick={() => { setBookingId(null); setBookAmount('') }}
                                  style={{ backgroundColor: '#fff', color: '#666', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
                                  ✕
                                </button>
                              </span>
                            ) : (
                              <button onClick={() => { setBookingId(p.id); setBookAmount('') }}
                                style={{ backgroundColor: '#fffbeb', color: '#d97706', padding: '8px 14px', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '13px', cursor: 'pointer' }}>
                                Teilzahlung
                              </button>
                            )}
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
      {mahnungData && profile && (
        <MahnungModal data={mahnungData} profile={profile} onClose={() => setMahnungData(null)} />
      )}
    </main>
  )
}