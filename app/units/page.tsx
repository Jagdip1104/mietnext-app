'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function Units() {
  const [properties, setProperties] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState('')
  const [name, setName] = useState('')
  const [floor, setFloor] = useState('')
  const [sizeSqm, setSizeSqm] = useState('')
  const [rooms, setRooms] = useState('')
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
    const { data: props } = await supabase.from('properties').select('*').order('name')
    setProperties(props || [])
    const { data: unitsData } = await supabase
      .from('units')
      .select('*, properties(name)')
      .order('created_at', { ascending: false })
    setUnits(unitsData || [])
  }

  const handleAdd = async () => {
    if (!name || !selectedProperty) return
    setLoading(true)
    await supabase.from('units').insert({
      name,
      property_id: selectedProperty,
      floor: floor ? parseInt(floor) : null,
      size_sqm: sizeSqm ? parseFloat(sizeSqm) : null,
      rooms: rooms ? parseFloat(rooms) : null,
      is_occupied: false,
    })
    setName(''); setFloor(''); setSizeSqm(''); setRooms(''); setSelectedProperty('')
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
            <h1 className="text-2xl font-medium text-gray-900">Einheiten</h1>
            <p className="text-sm text-gray-400 mt-1">{units.length} Einheiten gesamt</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
            + Einheit anlegen
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Neue Einheit</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Objekt *</label>
                <select value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                  <option value="">Objekt auswählen...</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Bezeichnung *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="z.B. Wohnung 1. OG links"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Etage</label>
                <input value={floor} onChange={e => setFloor(e.target.value)}
                  placeholder="z.B. 1" type="number"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Zimmer</label>
                <input value={rooms} onChange={e => setRooms(e.target.value)}
                  placeholder="z.B. 3" type="number"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Fläche (m²)</label>
                <input value={sizeSqm} onChange={e => setSizeSqm(e.target.value)}
                  placeholder="z.B. 75" type="number"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={loading || !name || !selectedProperty}
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

        {units.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-sm">Noch keine Einheiten angelegt.</p>
            <button onClick={() => setShowForm(true)}
              className="mt-3 text-blue-500 text-sm hover:underline">
              Erste Einheit anlegen →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {units.map(u => (
              <div key={u.id} className="bg-white border border-gray-100 rounded-xl p-5 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {u.properties?.name}
                    {u.size_sqm && ` · ${u.size_sqm} m²`}
                    {u.rooms && ` · ${u.rooms} Zimmer`}
                    {u.floor !== null && ` · ${u.floor}. OG`}
                  </p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full ${u.is_occupied ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                  {u.is_occupied ? 'Vermietet' : 'Leer'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}