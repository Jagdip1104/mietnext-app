'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    properties: 0,
    units: 0,
    occupiedUnits: 0,
    tenants: 0,
    openTickets: 0,
    monthlyIncome: 0,
    pendingPayments: 0,
    latePayments: 0,
  })
  const [recentTickets, setRecentTickets] = useState<any[]>([])
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      loadData()
    }
    load()
  }, [])

  const loadData = async () => {
    const [
      { count: propCount },
      { count: unitCount },
      { count: occupiedCount },
      { count: tenantCount },
      { count: ticketCount },
    ] = await Promise.all([
      supabase.from('properties').select('*', { count: 'exact', head: true }),
      supabase.from('units').select('*', { count: 'exact', head: true }),
      supabase.from('units').select('*', { count: 'exact', head: true }).eq('is_occupied', true),
      supabase.from('tenants').select('*', { count: 'exact', head: true }),
      supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ])

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

    const monthlyIncome = (paidThisMonth || []).reduce((sum: number, p: any) => sum + p.amount, 0)
    const pendingTotal = (pendingPayments || []).reduce((sum: number, p: any) => sum + p.amount, 0)
    const lateTotal = (latePayments || []).reduce((sum: number, p: any) => sum + p.amount, 0)

    setStats({
      properties: propCount || 0,
      units: unitCount || 0,
      occupiedUnits: occupiedCount || 0,
      tenants: tenantCount || 0,
      openTickets: ticketCount || 0,
      monthlyIncome,
      pendingPayments: pendingTotal,
      latePayments: lateTotal,
    })
    setRecentTickets(tickets || [])
    setRecentPayments(payments || [])
  }

  const occupancyRate = stats.units > 0
    ? Math.round((stats.occupiedUnits / stats.units) * 100)
    : 0

  const priorityStyle: any = {
    low: 'bg-gray-50 text-gray-500',
    medium: 'bg-amber-50 text-amber-600',
    high: 'bg-red-50 text-red-600',
  }
  const priorityLabel: any = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch' }
  const statusStyle: any = {
    paid: 'bg-green-50 text-green-600',
    pending: 'bg-amber-50 text-amber-600',
    late: 'bg-red-50 text-red-600',
  }
  const statusLabel: any = { paid: 'Bezahlt', pending: 'Ausstehend', late: 'Überfällig' }

  return (
    <main className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-5xl mx-auto px-8 py-10">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-medium text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">Willkommen zurück, {user?.email}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Auslastung</p>
            <p className="text-2xl font-medium text-gray-900">{occupancyRate}%</p>
            <p className="text-xs text-gray-400">{stats.occupiedUnits} von {stats.units} Einheiten</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">Einnahmen diesen Monat</p>
            <p className="text-2xl font-medium text-green-600">
              {stats.monthlyIncome.toLocaleString('de-DE')} €
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">Ausstehende Zahlungen</p>
            <p className="text-2xl font-medium text-amber-600">
              {stats.pendingPayments.toLocaleString('de-DE')} €
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">Überfällige Zahlungen</p>
            <p className="text-2xl font-medium text-red-600">
              {stats.latePayments.toLocaleString('de-DE')} €
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Objekte', value: stats.properties, color: 'text-blue-600', href: '/properties' },
            { label: 'Einheiten', value: stats.units, color: 'text-green-600', href: '/units' },
            { label: 'Mieter', value: stats.tenants, color: 'text-purple-600', href: '/tenants' },
            { label: 'Offene Tickets', value: stats.openTickets, color: 'text-orange-600', href: '/tickets' },
          ].map((s) => (
            <div key={s.label} onClick={() => router.push(s.href)}
              className="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:border-gray-200 hover:shadow-sm transition-all">
              <div className={`text-2xl font-medium mb-1 ${s.color}`}>{s.value}</div>
              <div className="text-sm text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-medium text-gray-700">Offene Tickets</h2>
              <button onClick={() => router.push('/tickets')}
                className="text-xs text-blue-500 hover:underline">Alle ansehen →</button>
            </div>
            {recentTickets.length === 0 ? (
              <p className="text-sm text-gray-400">Keine offenen Tickets</p>
            ) : (
              <div className="flex flex-col gap-3">
                {recentTickets.map(t => (
                  <div key={t.id} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-900">{t.title}</p>
                      <p className="text-xs text-gray-400">{t.units?.properties?.name} – {t.units?.name}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${priorityStyle[t.priority]}`}>
                      {priorityLabel[t.priority]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-medium text-gray-700">Letzte Zahlungen</h2>
              <button onClick={() => router.push('/payments')}
                className="text-xs text-blue-500 hover:underline">Alle ansehen →</button>
            </div>
            {recentPayments.length === 0 ? (
              <p className="text-sm text-gray-400">Noch keine Zahlungen</p>
            ) : (
              <div className="flex flex-col gap-3">
                {recentPayments.map(p => (
                  <div key={p.id} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-900">{p.contracts?.tenants?.full_name || 'Unbekannt'}</p>
                      <p className="text-xs text-gray-400">{new Date(p.due_date).toLocaleDateString('de-DE')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {p.amount.toLocaleString('de-DE')} €
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusStyle[p.status]}`}>
                        {statusLabel[p.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Schnellzugriff</h2>
          <div className="flex gap-3">
            <button onClick={() => router.push('/properties')}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
              + Objekt anlegen
            </button>
            <button onClick={() => router.push('/units')}
              className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              + Einheit anlegen
            </button>
            <button onClick={() => router.push('/tenants')}
              className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              + Mieter anlegen
            </button>
            <button onClick={() => router.push('/payments')}
              className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Zahlung erfassen
            </button>
          </div>
        </div>

      </div>
    </main>
  )
}