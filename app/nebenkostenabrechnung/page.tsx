'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

export default function NebenkostenabrechnungPage() {
  const [statements, setStatements] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      loadData(session.user.id)
    }
    check()
  }, [])

  const loadData = async (uid: string) => {
    const { data: propsData } = await supabase
      .from('properties').select('id, name, address, city')
      .eq('owner_id', uid).order('name')
    setProperties(propsData || [])

    const { data: stmtData } = await supabase
      .from('utility_statements')
      .select('*, properties(name, address, city)')
      .eq('owner_id', uid)
      .order('year', { ascending: false })
    setStatements(stmtData || [])
  }

  const handleCreate = async () => {
    if (!selectedProperty || !userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('utility_statements')
      .insert({ owner_id: userId, property_id: selectedProperty, year: selectedYear, status: 'draft' })
      .select().single()
    if (error) {
      alert(error.code === '23505'
        ? `Für dieses Objekt existiert bereits eine Abrechnung für ${selectedYear}.`
        : 'Fehler: ' + error.message)
      setLoading(false)
      return
    }
    setLoading(false)
    setShowForm(false)
    router.push(`/nebenkostenabrechnung/${data.id}`)
  }

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)
  const statusColor: any = { draft: '#d97706', finalized: '#16a34a' }
  const statusBg: any = { draft: '#fffbeb', finalized: '#f0fdf4' }
  const statusLabel: any = { draft: 'Entwurf', finalized: 'Abgeschlossen' }

  const card = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '24px' }
  const input = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const label = { fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div className="max-w-[900px] mx-auto px-5 py-8 md:px-12 md:py-12 pb-24 md:pb-12">

        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-10">
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
              Nebenkostenabrechnung
            </h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
              Jährliche Betriebskostenabrechnung nach §556 BGB · §2 BetrKV
            </p>
          </div>
          <button onClick={() => setShowForm(true)}
            style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
            + Neue Abrechnung
          </button>
        </div>

        {showForm && (
          <div style={{ ...card, marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>
              Neue Abrechnung erstellen
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-[20px]">
              <div>
                <label style={label}>Objekt *</label>
                <select value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)} style={input}>
                  <option value="">Objekt auswählen...</option>
                  {properties.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} – {p.city}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={label}>Abrechnungsjahr *</label>
                <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={input}>
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#bbb', margin: '0 0 16px' }}>
              💡 Abrechnungszeitraum: 01.01.{selectedYear} – 31.12.{selectedYear}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleCreate} disabled={loading || !selectedProperty}
                style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', opacity: loading || !selectedProperty ? 0.4 : 1 }}>
                {loading ? 'Erstelle...' : 'Abrechnung erstellen →'}
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ backgroundColor: '#fff', color: '#666', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {statements.length === 0 && !showForm ? (
          <div style={{ ...card, textAlign: 'center', padding: '64px' }}>
            <p style={{ fontSize: '32px', margin: '0 0 16px' }}>📄</p>
            <p style={{ fontSize: '15px', color: '#999', margin: '0 0 4px' }}>Noch keine Abrechnungen vorhanden.</p>
            <p style={{ fontSize: '13px', color: '#bbb', margin: '0 0 20px' }}>
              Erstelle deine erste jährliche Nebenkostenabrechnung nach §556 BGB.
            </p>
            <button onClick={() => setShowForm(true)}
              style={{ background: 'none', border: 'none', color: '#1a1a1a', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}>
              Erste Abrechnung erstellen →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {statements.map((s: any) => (
              <div key={s.id}
                onClick={() => router.push(`/nebenkostenabrechnung/${s.id}`)}
                style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 4px' }}>
                    {s.properties?.name} · Abrechnung {s.year}
                  </p>
                  <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>
                    {s.properties?.address}, {s.properties?.city}
                    {' · '}Erstellt: {new Date(s.created_at).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '11px', color: statusColor[s.status], backgroundColor: statusBg[s.status], padding: '4px 12px', borderRadius: '20px', fontWeight: '500' }}>
                    {statusLabel[s.status]}
                  </span>
                  <span style={{ color: '#bbb', fontSize: '18px' }}>→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}