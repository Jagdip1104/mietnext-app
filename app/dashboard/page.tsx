'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import PlanUsageBanner from '@/components/PlanUsageBanner'

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

      const userId = session.user.id
      const userEmail = (session.user.email ?? '').toLowerCase().trim()

      // 🛡️ Guard: Vermieter-Check (Profil + (Objekte ODER nicht Mieter))
      const { data: profile } = await supabase
        .from('profiles').select('id').eq('id', userId).maybeSingle()

      const { count: propCount } = await supabase
        .from('properties').select('id', { count: 'exact', head: true })
        .eq('owner_id', userId)
      const hasProperties = (propCount ?? 0) > 0

      const { data: tenantRows } = await supabase
        .from('tenants').select('id')
        .or(`user_id.eq.${userId},email.eq.${userEmail}`)
        .limit(1)
      const isTenant = (tenantRows?.length ?? 0) > 0

      const isLandlord = !!profile && (hasProperties || !isTenant)

      if (!isLandlord) {
        router.push('/role-select?error=no-landlord')
        return
      }

      setUser(session.user)
      loadData(session.user.id)
    }
    load()
  }, [])

  const loadData = async (uid: string) => {
    const { data: ownProperties } = await supabase
      .from('properties').select('id').eq('owner_id', uid)
    const propertyIds = (ownProperties || []).map((p: any) => p.id)

    const { data: ownUnits } = await supabase
      .from('units').select('id, is_occupied')
      .in('property_id', propertyIds.length > 0 ? propertyIds : ['none'])
    const unitIds = (ownUnits || []).map((u: any) => u.id)
    const occupiedCount = (ownUnits || []).filter((u: any) => u.is_occupied).length

    const { count: tenantCount } = await supabase
      .from('tenants').select('*', { count: 'exact', head: true }).eq('owner_id', uid)

    const { data: ownContracts } = await supabase
      .from('contracts').select('id')
      .in('unit_id', unitIds.length > 0 ? unitIds : ['none'])
    const contractIds = (ownContracts || []).map((c: any) => c.id)

    const { count: ticketCount } = await supabase
      .from('tickets').select('*', { count: 'exact', head: true })
      .eq('status', 'open')
      .in('unit_id', unitIds.length > 0 ? unitIds : ['none'])

    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    let monthlyIncome = 0
    let pendingTotal = 0
    let lateTotal = 0
    let recentTicketsData: any[] = []
    let recentPaymentsData: any[] = []

    if (contractIds.length > 0) {
      const { data: paidThisMonth } = await supabase
        .from('payments').select('amount').eq('status', 'paid')
        .in('contract_id', contractIds)
        .gte('paid_date', firstDay).lte('paid_date', lastDay)

      // Computed Status: pending + due_date < today → late (auch wenn DB-Status noch 'pending' wegen fehlendem Cron)
      const { data: openPayments } = await supabase
        .from('payments').select('amount, status, due_date')
        .in('contract_id', contractIds)
        .neq('status', 'paid')

      const todayISO = new Date().toISOString().slice(0, 10)
      monthlyIncome = (paidThisMonth || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
      pendingTotal = (openPayments || [])
        .filter((p: any) => p.status === 'pending' && p.due_date >= todayISO)
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
      lateTotal = (openPayments || [])
        .filter((p: any) => p.status === 'late' || (p.status === 'pending' && p.due_date < todayISO))
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0)

      const { data: payments } = await supabase
        .from('payments').select('*, contracts(tenants(full_name))')
        .in('contract_id', contractIds)
        .order('created_at', { ascending: false }).limit(4)
      recentPaymentsData = payments || []
    }

    if (unitIds.length > 0) {
      const { data: tickets } = await supabase
        .from('tickets').select('*, units(name, properties(name))')
        .eq('status', 'open')
        .in('unit_id', unitIds)
        .order('created_at', { ascending: false }).limit(3)
      recentTicketsData = tickets || []
    }

    setStats({
      properties: propertyIds.length,
      units: unitIds.length,
      occupiedUnits: occupiedCount,
      tenants: tenantCount || 0,
      openTickets: ticketCount || 0,
      monthlyIncome,
      pendingPayments: pendingTotal,
      latePayments: lateTotal,
    })
    setRecentTickets(recentTicketsData)
    setRecentPayments(recentPaymentsData)
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
  const todayISO = new Date().toISOString().slice(0, 10)
  const effectiveStatus = (p: any) => {
    if (p.status === 'paid') return 'paid'
    if (p.status === 'late') return 'late'
    return p.due_date < todayISO ? 'late' : 'pending'
  }
  const statusColor: any = { paid: '#16a34a', pending: '#d97706', late: '#dc2626' }
  const statusLabel: any = { paid: 'Bezahlt', pending: 'Ausstehend', late: 'Überfällig' }

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div className="max-w-[1040px] mx-auto px-5 py-8 md:px-12 md:py-12 pb-24 md:pb-12">

        <PlanUsageBanner />

        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-10">
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
              Dashboard
            </h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
              Willkommen zurück, {user?.email}
            </p>
          </div>
          <div className="text-left md:text-right">
            <p style={{ fontSize: '12px', color: '#999', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Auslastung</p>
            <p style={{ fontSize: '32px', fontWeight: '300', color: '#1a1a1a', margin: '0 0 2px', fontFamily: 'Georgia, serif' }}>
              {occupancyRate}%
            </p>
            <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>
              {stats.occupiedUnits} von {stats.units} Einheiten
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                {recentTickets.map((t: any) => (
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
                {recentPayments.map((p: any) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '13px', color: '#1a1a1a', margin: '0 0 2px' }}>{p.contracts?.tenants?.full_name || 'Unbekannt'}</p>
                      <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>{new Date(p.due_date).toLocaleDateString('de-DE')}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 2px' }}>{Number(p.amount).toLocaleString('de-DE')} €</p>
                      <p style={{ fontSize: '11px', color: statusColor[effectiveStatus(p)], margin: 0, fontWeight: '500' }}>{statusLabel[effectiveStatus(p)]}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={card}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>Schnellzugriff</p>
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
            {[
              { label: '+ Objekt anlegen', href: '/properties', primary: true },
              { label: '📥 Excel-Import', href: '/import', primary: false },
              { label: '+ Einheit anlegen', href: '/units', primary: false },
              { label: '+ Mieter anlegen', href: '/tenants', primary: false },
              { label: 'Zahlung erfassen', href: '/payments', primary: false },
            ].map(b => (
              <button key={b.label} onClick={() => router.push(b.href)}
                style={{
                  padding: '10px 16px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer',
                  backgroundColor: b.primary ? '#1a1a1a' : '#fff',
                  color: b.primary ? '#fff' : (b.href === '/import' ? '#1a1a1a' : '#666'),
                  border: b.primary ? 'none' : (b.href === '/import' ? '1.5px solid #1a1a1a' : '1px solid #e8e6e0'),
                  fontWeight: b.href === '/import' ? '500' : '400',
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