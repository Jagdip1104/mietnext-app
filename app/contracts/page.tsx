'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function Contracts() {
  const [tenants, setTenants] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [rentAmount, setRentAmount] = useState('')
  const [deposit, setDeposit] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      loadData()
    }
    check()
  }, [])

  const loadData = async () => {
    const { data: tenantsData } = await supabase
      .from('tenants')
      .select('*')
      .order('full_name')
    setTenants(tenantsData || [])

    const { data: unitsData } = await supabase
      .from('units')
      .select('*, properties(name)')
      .order('name')
    setUnits(unitsData || [])

    const { data: contractsData } = await supabase
      .from('contracts')
      .select('*, tenants(full_name), units(name, properties(name))')
      .order('created_at', { ascending: false })
    setContracts(contractsData || [])
  }

  const handleAdd = async () => {
    if (!selectedTenant || !selectedUnit || !rentAmount || !startDate) return
    setLoading(true)
    await supabase.from('contracts').insert({
      tenant_id: selectedTenant,
      unit_id: selectedUnit,
      rent_amount: parseFloat(rentAmount),
      deposit: deposit ? parseFloat(deposit) : null,
      start_date: startDate,
      end_date: endDate || null,
      is_active: true,
    })
    setSelectedTenant(''); setSelectedUnit(''); setRentAmount('')
    setDeposit(''); setStartDate(''); setEndDate('')
    setShowForm(false)
    setLoading(false)
    loadData()
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center">
        <div className="text-lg font-medium text-gray-900">MietNext</div>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-400 hover:text-gray-600">
          ← Dashboard
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-medium text-gray-900">Mietverträge</h1>
            <p className="text-sm text-gray-400 mt-1">
              {contracts.filter(c => c.is_active).length} aktiv · {contracts.length} gesamt
            </p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
            + Vertrag anlegen
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Neuer Mietvertrag</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Mieter *</label>
                <select value={selectedTenant} onChange={e => setSelectedTenant(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                  <option value="">Mieter auswählen...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Einheit *</label>
                <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                  <option value="">Einheit auswählen...</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.properties?.name} – {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Monatliche Miete (€) *</label>
                <input value={rentAmount} onChange={e => setRentAmount(e.target.value)}
                  placeholder="z.B. 950" type="number"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Kaution (€)</label>
                <input value={deposit} onChange={e => setDeposit(e.target.value)}
                  placeholder="z.B. 2850" type="number"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Startdatum *</label>
                <input value={startDate} onChange={e => setStartDate(e.target.value)}
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Enddatum (leer = unbefristet)</label>
                <input value={endDate} onChange={e => setEndDate(e.target.value)}
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd}
                disabled={loading || !selectedTenant || !selectedUnit || !rentAmount || !startDate}
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

        {contracts.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-sm">Noch keine Mietverträge angelegt.</p>
            <button onClick={() => setShowForm(true)}
              className="mt-3 text-blue-500 text-sm hover:underline">
              Ersten Vertrag anlegen →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {contracts.map(c => (
              <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-5 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{c.tenants?.full_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {c.units?.properties?.name} – {c.units?.name}
                    {' · '}ab {new Date(c.start_date).toLocaleDateString('de-DE')}
                    {c.end_date && ` bis ${new Date(c.end_date).toLocaleDateString('de-DE')}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900 text-sm">{c.rent_amount} €/Monat</p>
                  {c.deposit && (
                    <p className="text-xs text-gray-400 mt-0.5">Kaution: {c.deposit} €</p>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${c.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                    {c.is_active ? 'Aktiv' : 'Beendet'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}