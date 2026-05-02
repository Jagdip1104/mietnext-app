'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    properties: 0,
    units: 0,
    tenants: 0,
    openTickets: 0,
  })
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      const [{ count: propCount }, { count: unitCount }, { count: tenantCount }, { count: ticketCount }] = await Promise.all([
        supabase.from('properties').select('*', { count: 'exact', head: true }),
        supabase.from('units').select('*', { count: 'exact', head: true }),
        supabase.from('tenants').select('*', { count: 'exact', head: true }),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      ])

      setStats({
        properties: propCount || 0,
        units: unitCount || 0,
        tenants: tenantCount || 0,
        openTickets: ticketCount || 0,
      })
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center">
        <div className="text-lg font-medium text-gray-900">MietNext</div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-gray-600">
            Abmelden
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-10">
        <h1 className="text-2xl font-medium text-gray-900 mb-1">Dashboard</h1>
        <p className="text-sm text-gray-400 mb-8">Willkommen zurück!</p>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Objekte', value: stats.properties, color: 'text-blue-600', href: '/properties' },
            { label: 'Einheiten', value: stats.units, color: 'text-green-600', href: '/units' },
            { label: 'Mieter', value: stats.tenants, color: 'text-purple-600', href: '/tenants' },
            { label: 'Offene Tickets', value: stats.openTickets, color: 'text-orange-600', href: '/tickets' },
          ].map((s) => (
            <div key={s.label}
              onClick={() => router.push(s.href)}
              className="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:border-gray-200 hover:shadow-sm transition-all">
              <div className={`text-2xl font-medium mb-1 ${s.color}`}>{s.value}</div>
              <div className="text-sm text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
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
            <button onClick={() => router.push('/tickets')}
              className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Tickets ansehen
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}