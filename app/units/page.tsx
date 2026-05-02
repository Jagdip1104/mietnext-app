'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

export default function Units() {
  const [properties, setProperties] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedProperty, setSelectedProperty] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState('wohnung')
  const [floor, setFloor] = useState('')
  const [sizeSqm, setSizeSqm] = useState('')
  const [rooms, setRooms] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
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
    const { data: props } = await supabase.from('properties').select('*').order('name')
    setProperties(props || [])
    const { data: unitsData } = await supabase
      .from('units').select('*, properties(name)')
      .order('created_at', { ascending: false })
    setUnits(unitsData || [])
  }

  const handleEdit = (u: any) => {
    setEditingId(u.id)
    setName(u.name)
    setSelectedProperty(u.property_id)
    setType(u.type || 'wohnung')
    setFloor(u.floor?.toString() || '')
    setSizeSqm(u.size_sqm?.toString() || '')
    setRooms(u.rooms?.toString() || '')
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setName(''); setSelectedProperty(''); setType('wohnung')
    setFloor(''); setSizeSqm(''); setRooms('')
  }

  const handleSave = async () => {
    if (!name || !selectedProperty) return
    setLoading(true)
    const data = {
      name,
      property_id: selectedProperty,
      type,
      floor: floor ? parseInt(floor) : null,
      size_sqm: sizeSqm ? parseFloat(sizeSqm) : null,
      rooms: rooms ? parseFloat(rooms) : null,
    }
    if (editingId) {
      await supabase.from('units').update(data).eq('id', editingId)
    } else {
      await supabase.from('units').insert({ ...data, is_occupied: false })
    }
    handleCancel()
    setLoading(false)
    loadData()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('units').delete().eq('id', id)
    setDeleteConfirm(null)
    loadData()
  }

  const typeStyle: any = {
    wohnung: 'bg-blue-50 text-blue-600',
    gewerbe: 'bg-purple-50 text-purple-600',
    stellplatz: 'bg-gray-50 text-gray-500',
    sonstige: 'bg-gray-50 text-gray-500',
  }

  const typeLabel: any = {
    wohnung: 'Wohnung',
    gewerbe: 'Gewerbe',
    stellplatz: 'Stellplatz',
    sonstige: 'Sonstige',
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Nav />
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
            <h2 className="text-sm font-medium text-gray-700 mb-4">
              {editingId ? 'Einheit bearbeiten' : 'Neue Einheit'}
            </h2>
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
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Typ</label>
                <select value={type} onChange={e => setType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                  <option value="wohnung">Wohnung</option>
                  <option value="gewerbe">Gewerbe</option>
                  <option value="stellplatz">Stellplatz</option>
                  <option value="sonstige">Sonstige</option>
                </select>
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
              <button onClick={handleSave} disabled={loading || !name || !selectedProperty}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-40">
                {loading ? 'Speichern...' : editingId ? 'Änderungen speichern' : 'Speichern'}
              </button>
              <button onClick={handleCancel}
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
              <div key={u.id} className="bg-white border border-gray-100 rounded-xl p-5">
                {deleteConfirm === u.id ? (
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-red-600">Einheit wirklich löschen?</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(u.id)}
                        className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-600">
                        Ja, löschen
                      </button>
                      <button onClick={() => setDeleteConfirm(null)}
                        className="border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50">
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {u.properties?.name}
                        {u.size_sqm && ` · ${u.size_sqm} m²`}
                        {u.rooms && ` · ${u.rooms} Zimmer`}
                        {u.floor !== null && u.floor !== undefined && ` · ${u.floor}. OG`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.type && (
                        <span className={`text-xs px-2 py-1 rounded-full ${typeStyle[u.type] || 'bg-gray-50 text-gray-500'}`}>
                          {typeLabel[u.type] || u.type}
                        </span>
                      )}
                      <span className={`text-xs px-3 py-1 rounded-full ${u.is_occupied ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                        {u.is_occupied ? 'Vermietet' : 'Leer'}
                      </span>
                      <button onClick={() => handleEdit(u)}
                        className="text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                        Bearbeiten
                      </button>
                      <button onClick={() => setDeleteConfirm(u.id)}
                        className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50">
                        Löschen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}