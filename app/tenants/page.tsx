'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

export default function Tenants() {
  const [units, setUnits] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedUnit, setSelectedUnit] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
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
    const { data: tenantsData } = await supabase.from('tenants')
      .select('*, units(name, properties(name))').eq('owner_id', uid)
      .order('created_at', { ascending: false })
    setTenants(tenantsData || [])
  }

  const handleEdit = (t: any) => {
    setEditingId(t.id); setFullName(t.full_name)
    setEmail(t.email || ''); setPhone(t.phone || ''); setSelectedUnit(t.unit_id || '')
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false); setEditingId(null)
    setFullName(''); setEmail(''); setPhone(''); setSelectedUnit('')
  }

  const handleSave = async () => {
    if (!fullName) return
    setLoading(true)
    // E-Mail normalisieren: lowercase + trim, leer → null
    const normalizedEmail = email.toLowerCase().trim() || null
    if (editingId) {
      await supabase.from('tenants').update({ full_name: fullName, email: normalizedEmail, phone, unit_id: selectedUnit || null }).eq('id', editingId)
    } else {
      await supabase.from('tenants').insert({ full_name: fullName, email: normalizedEmail, phone, unit_id: selectedUnit || null, owner_id: userId })
    }
    if (selectedUnit) await supabase.from('units').update({ is_occupied: true }).eq('id', selectedUnit)
    handleCancel(); setLoading(false); loadData(userId!)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('tenants').delete().eq('id', id)
    setDeleteConfirm(null); loadData(userId!)
  }

  const card = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '24px' }
  const input = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const label = { fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div className="max-w-[900px] mx-auto px-5 py-8 md:px-12 md:py-12 pb-24 md:pb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-10">
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>Mieter</h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>{tenants.length} Mieter gesamt</p>
          </div>
          <button onClick={() => { setShowForm(true); setTimeout(() => document.getElementById('formcard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }} style={{
            backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px',
            borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer',
          }}>+ Mieter anlegen</button>
        </div>

        {showForm && (
          <div id="formcard" style={{ ...card, marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>
              {editingId ? 'Mieter bearbeiten' : 'Neuer Mieter'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-[20px]">
              <div style={{ gridColumn: 'span 2' }}>
                <label style={label}>Name *</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Vor- und Nachname" style={input} />
              </div>
              <div>
                <label style={label}>E-Mail</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="mieter@email.de" type="email" style={input} />
              </div>
              <div>
                <label style={label}>Telefon</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+49 123 456789" style={input} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={label}>Einheit zuweisen</label>
                <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} style={input}>
                  <option value="">Keine Einheit</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.properties?.name} – {u.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSave} disabled={loading || !fullName} style={{
                backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px',
                borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', opacity: loading || !fullName ? 0.4 : 1,
              }}>{loading ? 'Speichern...' : editingId ? 'Änderungen speichern' : 'Speichern'}</button>
              <button onClick={handleCancel} style={{
                backgroundColor: '#fff', color: '#666', padding: '10px 20px',
                borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer',
              }}>Abbrechen</button>
            </div>
          </div>
        )}

        {tenants.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '64px' }}>
            <p style={{ fontSize: '14px', color: '#bbb', margin: '0 0 12px' }}>Noch keine Mieter angelegt.</p>
            <button onClick={() => { setShowForm(true); setTimeout(() => document.getElementById('formcard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }} style={{ background: 'none', border: 'none', color: '#1a1a1a', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}>
              Ersten Mieter anlegen →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tenants.map(t => (
              <div key={t.id} style={card}>
                {deleteConfirm === t.id ? (
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                    <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>Mieter wirklich löschen?</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleDelete(t.id)} style={{ backgroundColor: '#dc2626', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>Ja, löschen</button>
                      <button onClick={() => setDeleteConfirm(null)} style={{ backgroundColor: '#fff', color: '#666', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 4px' }}>{t.full_name}</p>
                      <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>{t.email}{t.phone && ` · ${t.phone}`}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {t.units ? (
                        <span style={{ fontSize: '12px', color: '#3b82f6', backgroundColor: '#eff6ff', padding: '4px 12px', borderRadius: '20px' }}>
                          {t.units.properties?.name} – {t.units.name}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#999', backgroundColor: '#f5f4f0', padding: '4px 12px', borderRadius: '20px' }}>Keine Einheit</span>
                      )}
                      <button onClick={() => handleEdit(t)} style={{ backgroundColor: '#fff', color: '#666', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>Bearbeiten</button>
                      <button onClick={() => setDeleteConfirm(t.id)} style={{ backgroundColor: '#fff', color: '#dc2626', padding: '8px 14px', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '13px', cursor: 'pointer' }}>Löschen</button>
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