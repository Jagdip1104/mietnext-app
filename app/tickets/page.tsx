'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function Tickets() {
  const [units, setUnits] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
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
    const { data: unitsData } = await supabase
      .from('units')
      .select('*, properties(name)')
      .order('name')
    setUnits(unitsData || [])

    const { data: ticketsData } = await supabase
      .from('tickets')
      .select('*, units(name, properties(name))')
      .order('created_at', { ascending: false })
    setTickets(ticketsData || [])
  }

  const handleAdd = async () => {
    if (!title || !selectedUnit) return
    setLoading(true)
    await supabase.from('tickets').insert({
      title,
      description,
      priority,
      unit_id: selectedUnit,
      status: 'open',
    })
    setTitle(''); setDescription(''); setPriority('medium'); setSelectedUnit('')
    setShowForm(false)
    setLoading(false)
    loadData()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from('tickets').update({ status }).eq('id', id)
    loadData()
  }

  const priorityStyle: any = {
    low: 'bg-gray-50 text-gray-500',
    medium: 'bg-amber-50 text-amber-600',
    high: 'bg-red-50 text-red-600',
  }

  const priorityLabel: any = {
    low: 'Niedrig',
    medium: 'Mittel',
    high: 'Hoch',
  }

  const statusStyle: any = {
    open: 'bg-red-50 text-red-500',
    in_progress: 'bg-amber-50 text-amber-600',
    closed: 'bg-green-50 text-green-600',
  }

  const statusLabel: any = {
    open: 'Offen',
    in_progress: 'In Bearbeitung',
    closed: 'Erledigt',
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
            <h1 className="text-2xl font-medium text-gray-900">Tickets</h1>
            <p className="text-sm text-gray-400 mt-1">
              {tickets.filter(t => t.status === 'open').length} offen · {tickets.length} gesamt
            </p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
            + Ticket erstellen
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Neues Ticket</h2>
            <div className="flex flex-col gap-3 mb-4">
              <div>
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
                <label className="text-xs text-gray-400 mb-1 block">Titel *</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="z.B. Heizung defekt"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Beschreibung</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Details zum Problem..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Priorität</label>
                <select value={priority} onChange={e => setPriority(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                  <option value="low">Niedrig</option>
                  <option value="medium">Mittel</option>
                  <option value="high">Hoch</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={loading || !title || !selectedUnit}
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

        {tickets.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-sm">Noch keine Tickets vorhanden.</p>
            <button onClick={() => setShowForm(true)}
              className="mt-3 text-blue-500 text-sm hover:underline">
              Erstes Ticket erstellen →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tickets.map(t => (
              <div key={t.id} className="bg-white border border-gray-100 rounded-xl p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{t.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.units?.properties?.name} – {t.units?.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${priorityStyle[t.priority]}`}>
                      {priorityLabel[t.priority]}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusStyle[t.status]}`}>
                      {statusLabel[t.status]}
                    </span>
                  </div>
                </div>
                {t.description && (
                  <p className="text-xs text-gray-400 mb-3">{t.description}</p>
                )}
                <div className="flex gap-2">
                  {t.status !== 'in_progress' && t.status !== 'closed' && (
                    <button onClick={() => handleStatusChange(t.id, 'in_progress')}
                      className="text-xs border border-gray-200 text-gray-500 px-3 py-1 rounded-lg hover:bg-gray-50">
                      In Bearbeitung
                    </button>
                  )}
                  {t.status !== 'closed' && (
                    <button onClick={() => handleStatusChange(t.id, 'closed')}
                      className="text-xs border border-green-200 text-green-600 px-3 py-1 rounded-lg hover:bg-green-50">
                      Erledigt
                    </button>
                  )}
                  {t.status === 'closed' && (
                    <button onClick={() => handleStatusChange(t.id, 'open')}
                      className="text-xs border border-gray-200 text-gray-400 px-3 py-1 rounded-lg hover:bg-gray-50">
                      Wieder öffnen
                    </button>
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