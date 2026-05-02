'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

export default function Properties() {
  const [properties, setProperties] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      loadProperties()
    }
    check()
  }, [])

  const loadProperties = async () => {
    const { data } = await supabase.from('properties').select('*, units(count)').order('created_at', { ascending: false })
    setProperties(data || [])
  }

  const handleAdd = async () => {
    if (!name) return
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('properties').insert({ name, address, city, zip, owner_id: session?.user?.id })
    setName(''); setAddress(''); setCity(''); setZip('')
    setShowForm(false)
    setLoading(false)
    loadProperties()
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-medium text-gray-900">Objekte</h1>
            <p className="text-sm text-gray-400 mt-1">{properties.length} Objekte gesamt</p>
          </div>
          <button onClick={() => setShowForm(true)} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
            + Objekt anlegen
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Neues Objekt</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Mehrfamilienhaus Musterstraße"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Adresse</label>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Musterstraße 1"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">PLZ</label>
                <input value={zip} onChange={e => setZip(e.target.value)} placeholder="12345"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Stadt</label>
                <input value={city} onChange={e => setCity(e.target.value)} placeholder="Berlin"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={loading || !name}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-40">
                {loading ? 'Speichern...' : 'Speichern'}
              </button>
              <button onClick={() => setShowForm(false)} className="border border-gray-200 text-gray-500 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {properties.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-sm">Noch keine Objekte angelegt.</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-blue-500 text-sm hover:underline">
              Erstes Objekt anlegen →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {properties.map(p => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-5 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{[p.address, p.zip, p.city].filter(Boolean).join(', ')}</p>
                </div>
                <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                  {p.units?.[0]?.count || 0} Einheiten
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}