'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

export default function Tenants() {
  const [units, setUnits] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      loadData()
    }
    check()
  }, [])

  const loadData = async () => {
    const { data: unitsData } = await supabase
      .from('units').select('*, properties(name)').order('name')
    setUnits(unitsData || [])
    const { data: tenantsData } = await supabase
      .from('tenants').select('*, units(name, properties(name))')
      .order('created_at', { ascending: false })
    setTenants(tenantsData || [])
  }

  const handleAdd = async () => {
    if (!fullName) return
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('tenants').insert({
      full_name: fullName, email, phone,
      unit_id: selectedUnit || null,
      owner_id: session?.user?.id,
    })
    if (selectedUnit) {
      await supabase.from('units').update({ is_occupied: true }).eq('id', selectedUnit)
    }
    setFullName(''); setEmail(''); setPhone(''); setSelectedUnit('')
    setShowForm(false)
    setLoading(false)
    loadData()
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-medium text-gray-900">Mieter</h1>
            <p className="text-sm text-gray-400 mt-1">{tenants.length} Mieter gesamt</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
            + Mieter anlegen
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Neuer Mieter</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Name *</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Vor- und Nachname"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">E-Mail</label>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="mieter@email.de" type="email"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Telefon</label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+49 123 456789"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Einheit zuweisen</label>
                <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                  <option value="">Keine Einheit (später zuweisen)</option>
                  {units.filter(u => !u.is_occupied).map(u => (
                    <option key={u.id} value={u.id}>
                      {u.properties?.name} – {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={loading || !fullName}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-40">
                {loading ? 'Speichern...' : 'Speichern'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="border border-gray-200 text-gray-500 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {tenants.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-sm">Noch keine Mieter angelegt.</p>
            <button onClick={() => setShowForm(true)}
              className="mt-3 text-blue-500 text-sm hover:underline">
              Ersten Mieter anlegen →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tenants.map(t => (
              <div key={t.id} className="bg-white border border-gray-100 rounded-xl p-5 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{t.full_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.email}{t.phone && ` · ${t.phone}`}
                  </p>
                </div>
                <div className="text-right">
                  {t.units ? (
                    <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
                      {t.units.properties?.name} – {t.units.name}
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-50 text-gray-400 px-3 py-1 rounded-full">
                      Keine Einheit
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}