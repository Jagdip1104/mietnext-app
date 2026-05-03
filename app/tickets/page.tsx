'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

export default function Tickets() {
  const [units, setUnits] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedUnit, setSelectedUnit] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
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
    const { data: props } = await supabase.from('properties').select('id').eq('owner_id', uid)
    const propertyIds = (props || []).map((p: any) => p.id)
    const { data: unitsData } = await supabase.from('units').select('*, properties(name)')
      .in('property_id', propertyIds.length > 0 ? propertyIds : ['none']).order('name')
    setUnits(unitsData || [])
    const unitIds = (unitsData || []).map((u: any) => u.id)
    const { data: ticketsData } = await supabase.from('tickets').select('*, units(name, properties(name))')
      .in('unit_id', unitIds.length > 0 ? unitIds : ['none'])
      .order('created_at', { ascending: false })
    setTickets(ticketsData || [])
  }

  const handleEdit = (t: any) => {
    setEditingId(t.id); setTitle(t.title); setDescription(t.description || '')
    setPriority(t.priority); setSelectedUnit(t.unit_id); setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false); setEditingId(null)
    setTitle(''); setDescription(''); setPriority('medium'); setSelectedUnit('')
  }

  const handleSave = async () => {
    if (!title || !selectedUnit) return
    setLoading(true)
    if (editingId) {
      await supabase.from('tickets').update({ title, description, priority, unit_id: selectedUnit }).eq('id', editingId)
    } else {
      await supabase.from('tickets').insert({ title, description, priority, unit_id: selectedUnit, status: 'open' })
    }
    handleCancel(); setLoading(false); loadData(userId!)
  }

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from('tickets').update({ status }).eq('id', id)
    loadData(userId!)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('tickets').delete().eq('id', id)
    setDeleteConfirm(null); loadData(userId!)
  }

  const priorityColor: any = { low: '#888', medium: '#d97706', high: '#dc2626' }
  const priorityBg: any = { low: '#f5f4f0', medium: '#fffbeb', high: '#fef2f2' }
  const priorityLabel: any = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch' }
  const statusColor: any = { open: '#dc2626', in_progress: '#d97706', closed: '#16a34a' }
  const statusBg: any = { open: '#fef2f2', in_progress: '#fffbeb', closed: '#f0fdf4' }
  const statusLabel: any = { open: 'Offen', in_progress: 'In Bearbeitung', closed: 'Erledigt' }

  const card = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '24px' }
  const input = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const label = { fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>Tickets</h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
              {tickets.filter(t => t.status === 'open').length} offen · {tickets.length} gesamt
            </p>
          </div>
          <button onClick={() => setShowForm(true)} style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
            + Ticket erstellen
          </button>
        </div>

        {showForm && (
          <div style={{ ...card, marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>
              {editingId ? 'Ticket bearbeiten' : 'Neues Ticket'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={label}>Einheit *</label>
                <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} style={input}>
                  <option value="">Einheit auswählen...</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.properties?.name} – {u.name}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Titel *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Heizung defekt" style={input} />
              </div>
              <div>
                <label style={label}>Beschreibung</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Details zum Problem..." rows={3}
                  style={{ ...input, resize: 'vertical' as const }} />
              </div>
              <div>
                <label style={label}>Priorität</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} style={input}>
                  <option value="low">Niedrig</option>
                  <option value="medium">Mittel</option>
                  <option value="high">Hoch</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSave} disabled={loading || !title || !selectedUnit}
                style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.4 : 1 }}>
                {loading ? 'Speichern...' : editingId ? 'Änderungen speichern' : 'Speichern'}
              </button>
              <button onClick={handleCancel} style={{ backgroundColor: '#fff', color: '#666', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {tickets.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '64px' }}>
            <p style={{ fontSize: '14px', color: '#bbb', margin: '0 0 12px' }}>Noch keine Tickets vorhanden.</p>
            <button onClick={() => setShowForm(true)} style={{ background: 'none', border: 'none', color: '#1a1a1a', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}>
              Erstes Ticket erstellen →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tickets.map(t => (
              <div key={t.id} style={card}>
                {deleteConfirm === t.id ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>Ticket wirklich löschen?</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleDelete(t.id)} style={{ backgroundColor: '#dc2626', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>Ja, löschen</button>
                      <button onClick={() => setDeleteConfirm(null)} style={{ backgroundColor: '#fff', color: '#666', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: t.description ? '12px' : '16px' }}>
                      <div>
                        <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 4px' }}>{t.title}</p>
                        <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>{t.units?.properties?.name} – {t.units?.name}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: priorityColor[t.priority], backgroundColor: priorityBg[t.priority], padding: '4px 10px', borderRadius: '20px', fontWeight: '500' }}>
                          {priorityLabel[t.priority]}
                        </span>
                        <span style={{ fontSize: '11px', color: statusColor[t.status], backgroundColor: statusBg[t.status], padding: '4px 10px', borderRadius: '20px', fontWeight: '500' }}>
                          {statusLabel[t.status]}
                        </span>
                      </div>
                    </div>
                    {t.description && <p style={{ fontSize: '13px', color: '#888', margin: '0 0 16px', lineHeight: '1.5' }}>{t.description}</p>}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {t.status !== 'in_progress' && t.status !== 'closed' && (
                        <button onClick={() => handleStatusChange(t.id, 'in_progress')} style={{ backgroundColor: '#fff', color: '#666', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e8e6e0', fontSize: '12px', cursor: 'pointer' }}>In Bearbeitung</button>
                      )}
                      {t.status !== 'closed' && (
                        <button onClick={() => handleStatusChange(t.id, 'closed')} style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '6px 12px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '12px', cursor: 'pointer' }}>Erledigt</button>
                      )}
                      {t.status === 'closed' && (
                        <button onClick={() => handleStatusChange(t.id, 'open')} style={{ backgroundColor: '#fff', color: '#888', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e8e6e0', fontSize: '12px', cursor: 'pointer' }}>Wieder öffnen</button>
                      )}
                      <button onClick={() => handleEdit(t)} style={{ backgroundColor: '#fff', color: '#666', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e8e6e0', fontSize: '12px', cursor: 'pointer' }}>Bearbeiten</button>
                      <button onClick={() => setDeleteConfirm(t.id)} style={{ backgroundColor: '#fff', color: '#dc2626', padding: '6px 12px', borderRadius: '6px', border: '1px solid #fecaca', fontSize: '12px', cursor: 'pointer' }}>Löschen</button>
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