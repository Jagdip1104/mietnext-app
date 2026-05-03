'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    properties: 0, units: 0, occupiedUnits: 0,
    tenants: 0, openTickets: 0, monthlyIncome: 0,
    pendingPayments: 0, latePayments: 0,
  })
  const [recentTickets, setRecentTickets] = useState<any[]>([])
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      loadData(session.user.id)
    }
    load()
  }, [])

  const loadData = async (uid: string) => {
    const [
      { count: propCount },
      { count: unitCount },
      { count: occupiedCount },
      { count: tenantCount },
    ] = await Promise.all([
      supabase.from('properties').select('*', { count: 'exact', head: true }).eq('owner_id', uid),
      supabase.from('units').select('*', { count: 'exact', head: true }).in('property_id',
        (await supabase.from('properties').select('id').eq('owner_id', uid)).data?.map((p: any) => p.id) || []
      ),
      supabase.from('units').select('*', { count: 'exact', head: true }).eq('is_occupied', true).in('property_id',
        (await supabase.from('properties').select('id').eq('owner_id', uid)).data?.map((p: any) => p.id) || []
      ),
      supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('owner_id', uid),
    ])

    const { count: ticketCount } = await supabase
      .from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open')

    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const { data: paidThisMonth } = await supabase
      .from('payments').select('amount').eq('status', 'paid')
      .gte('paid_date', firstDay).lte('paid_date', lastDay)

    const { data: pendingPayments } = await supabase
      .from('payments').select('amount').eq('status', 'pending')

    const { data: latePayments } = await supabase
      .from('payments').select('amount').eq('status', 'late')

    const { data: tickets } = await supabase
      .from('tickets').select('*, units(name, properties(name))')
      .eq('status', 'open').order('created_at', { ascending: false }).limit(3)

    const { data: payments } = await supabase
      .from('payments').select('*, contracts(tenants(full_name))')
      .order('created_at', { ascending: false }).limit(4)

    setStats({
      properties: propCount || 0, units: unitCount || 0,
      occupiedUnits: occupiedCount || 0, tenants: tenantCount || 0,
      openTickets: ticketCount || 0,
      monthlyIncome: (paidThisMonth || []).reduce((s: number, p: any) => s + p.amount, 0),
      pendingPayments: (pendingPayments || []).reduce((s: number, p: any) => s + p.amount, 0),
      latePayments: (latePayments || []).reduce((s: number, p: any) => s + p.amount, 0),
    })
    setRecentTickets(tickets || [])
    setRecentPayments(payments || [])
  }

  const occupancyRate = stats.units > 0 ? Math.round((stats.occupiedUnits / stats.units) * 100) : 0

  const card = {
    backgroundColor: '#fff',
    border: '1px solid #e8e6e0',
    borderRadius: '12px',
    padding: '24px',
  }

  const priorityColor: any = { low: '#888', medium: '#d97706', high: '#dc2626' }
  const priorityLabel: any = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch' }
  const statusColor: any = { paid: '#16a34a', pending: '#d97706', late: '#dc2626' }
  const statusLabel: any = { paid: 'Bezahlt', pending: 'Ausstehend', late: 'Überfällig' }

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '48px 48px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
              Dashboard
            </h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
              Willkommen zurück, {user?.email}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', color: '#999', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Auslastung</p>
            <p style={{ fontSize: '32px', fontWeight: '300', color: '#1a1a1a', margin: '0 0 2px', fontFamily: 'Georgia, serif' }}>
              {occupancyRate}%
            </p>
            <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>
              {stats.occupiedUnits} von {stats.units} Einheiten
            </p>
          </div>
        </div>

        {/* Finanz-Karten */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
          {[
            { label: 'Einnahmen diesen Monat', value: stats.monthlyIncome, color: '#16a34a' },
            { label: 'Ausstehende Zahlungen', value: stats.pendingPayments, color: '#d97706' },
            { label: 'Überfällige Zahlungen', value: stats.latePayments, color: '#dc2626' },
          ].map(s => (
            <div key={s.label} style={card}>
              <p style={{ fontSize: '12px', color: '#999', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {s.label}
              </p>
              <p style={{ fontSize: '28px', fontWeight: '300', color: s.color, margin: 0, fontFamily: 'Georgia, serif' }}>
                {s.value.toLocaleString('de-DE')} €
              </p>
            </div>
          ))}
        </div>

        {/* Objekte Karten */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'Objekte', value: stats.properties, href: '/properties' },
            { label: 'Einheiten', value: stats.units, href: '/units' },
            { label: 'Mieter', value: stats.tenants, href: '/tenants' },
            { label: 'Offene Tickets', value: stats.openTickets, href: '/tickets' },
          ].map(s => (
            <div key={s.label} onClick={() => router.push(s.href)}
              style={{ ...card, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#1a1a1a')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#e8e6e0')}>
              <p style={{ fontSize: '36px', fontWeight: '300', color: '#1a1a1a', margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>
                {s.value}
              </p>
              <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tickets & Zahlungen */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <p style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', margin: 0 }}>Offene Tickets</p>
              <button onClick={() => router.push('/tickets')}
                style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>
                Alle ansehen →
              </button>
            </div>
            {recentTickets.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>Keine offenen Tickets</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentTickets.map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '13px', color: '#1a1a1a', margin: '0 0 2px' }}>{t.title}</p>
                      <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>{t.units?.properties?.name} – {t.units?.name}</p>
                    </div>
                    <span style={{ fontSize: '11px', color: priorityColor[t.priority], fontWeight: '500' }}>
                      {priorityLabel[t.priority]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <p style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', margin: 0 }}>Letzte Zahlungen</p>
              <button onClick={() => router.push('/payments')}
                style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>
                Alle ansehen →
              </button>
            </div>
            {recentPayments.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>Noch keine Zahlungen</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentPayments.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '13px', color: '#1a1a1a', margin: '0 0 2px' }}>{p.contracts?.tenants?.full_name || 'Unbekannt'}</p>
                      <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>{new Date(p.due_date).toLocaleDateString('de-DE')}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 2px' }}>{p.amount.toLocaleString('de-DE')} €</p>
                      <p style={{ fontSize: '11px', color: statusColor[p.status], margin: 0, fontWeight: '500' }}>{statusLabel[p.status]}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Schnellzugriff */}
        <div style={card}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>Schnellzugriff</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: '+ Objekt anlegen', href: '/properties', primary: true },
              { label: '+ Einheit anlegen', href: '/units', primary: false },
              { label: '+ Mieter anlegen', href: '/tenants', primary: false },
              { label: 'Zahlung erfassen', href: '/payments', primary: false },
            ].map(b => (
              <button key={b.label} onClick={() => router.push(b.href)}
                style={{
                  padding: '10px 16px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer',
                  backgroundColor: b.primary ? '#1a1a1a' : '#fff',
                  color: b.primary ? '#fff' : '#666',
                  border: b.primary ? 'none' : '1px solid #e8e6e0',
                }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}