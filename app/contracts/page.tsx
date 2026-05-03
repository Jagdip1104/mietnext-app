'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

export default function Contracts() {
  const [tenants, setTenants] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedTenant, setSelectedTenant] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [rentAmount, setRentAmount] = useState('')
  const [deposit, setDeposit] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
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
    const { data: tenantsData } = await supabase.from('tenants').select('*').eq('owner_id', uid).order('full_name')
    setTenants(tenantsData || [])
    const { data: unitsData } = await supabase.from('units').select('*, properties(name)')
      .in('property_id', propertyIds.length > 0 ? propertyIds : ['none']).order('name')
    setUnits(unitsData || [])
    const { data: contractsData } = await supabase.from('contracts')
      .select('*, tenants(full_name), units(name, properties(name))')
      .in('tenant_id', (tenantsData || []).map((t: any) => t.id).length > 0 ? (tenantsData || []).map((t: any) => t.id) : ['none'])
      .order('created_at', { ascending: false })
    setContracts(contractsData || [])
  }

  const handleEdit = (c: any) => {
    setEditingId(c.id); setSelectedTenant(c.tenant_id); setSelectedUnit(c.unit_id)
    setRentAmount(c.rent_amount?.toString() || ''); setDeposit(c.deposit?.toString() || '')
    setStartDate(c.start_date || ''); setEndDate(c.end_date || '')
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false); setEditingId(null)
    setSelectedTenant(''); setSelectedUnit(''); setRentAmount('')
    setDeposit(''); setStartDate(''); setEndDate('')
  }

  const handleSave = async () => {
    if (!selectedTenant || !selectedUnit || !rentAmount || !startDate) return
    setLoading(true)
    const data = { tenant_id: selectedTenant, unit_id: selectedUnit, rent_amount: parseFloat(rentAmount), deposit: deposit ? parseFloat(deposit) : null, start_date: startDate, end_date: endDate || null, is_active: true }
    if (editingId) { await supabase.from('contracts').update(data).eq('id', editingId) }
    else { await supabase.from('contracts').insert(data) }
    handleCancel(); setLoading(false); loadData(userId!)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('contracts').delete().eq('id', id)
    setDeleteConfirm(null); loadData(userId!)
  }

  const card = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '24px' }
  const input = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const label = { fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>Mietverträge</h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
              {contracts.filter(c => c.is_active).length} aktiv · {contracts.length} gesamt
            </p>
          </div>
          <button onClick={() => setShowForm(true)} style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
            + Vertrag anlegen
          </button>
        </div>

        {showForm && (
          <div style={{ ...card, marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>
              {editingId ? 'Vertrag bearbeiten' : 'Neuer Mietvertrag'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={label}>Mieter *</label>
                <select value={selectedTenant} onChange={e => setSelectedTenant(e.target.value)} style={input}>
                  <option value="">Mieter auswählen...</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={label}>Einheit *</label>
                <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} style={input}>
                  <option value="">Einheit auswählen...</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.properties?.name} – {u.name}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Monatliche Miete (€) *</label>
                <input value={rentAmount} onChange={e => setRentAmount(e.target.value)} placeholder="z.B. 950" type="number" style={input} />
              </div>
              <div>
                <label style={label}>Kaution (€)</label>
                <input value={deposit} onChange={e => setDeposit(e.target.value)} placeholder="z.B. 2850" type="number" style={input} />
              </div>
              <div>
                <label style={label}>Startdatum *</label>
                <input value={startDate} onChange={e => setStartDate(e.target.value)} type="date" style={input} />
              </div>
              <div>
                <label style={label}>Enddatum (leer = unbefristet)</label>
                <input value={endDate} onChange={e => setEndDate(e.target.value)} type="date" style={input} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSave} disabled={loading || !selectedTenant || !selectedUnit || !rentAmount || !startDate}
                style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.4 : 1 }}>
                {loading ? 'Speichern...' : editingId ? 'Änderungen speichern' : 'Speichern'}
              </button>
              <button onClick={handleCancel} style={{ backgroundColor: '#fff', color: '#666', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {contracts.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '64px' }}>
            <p style={{ fontSize: '14px', color: '#bbb', margin: '0 0 12px' }}>Noch keine Mietverträge angelegt.</p>
            <button onClick={() => setShowForm(true)} style={{ background: 'none', border: 'none', color: '#1a1a1a', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}>
              Ersten Vertrag anlegen →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {contracts.map(c => (
              <div key={c.id} style={card}>
                {deleteConfirm === c.id ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>Vertrag wirklich löschen?</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleDelete(c.id)} style={{ backgroundColor: '#dc2626', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>Ja, löschen</button>
                      <button onClick={() => setDeleteConfirm(null)} style={{ backgroundColor: '#fff', color: '#666', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 4px' }}>{c.tenants?.full_name}</p>
                      <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>
                        {c.units?.properties?.name} – {c.units?.name} · ab {new Date(c.start_date).toLocaleDateString('de-DE')}
                        {c.end_date && ` bis ${new Date(c.end_date).toLocaleDateString('de-DE')}`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 2px' }}>{c.rent_amount} €/Mo.</p>
                        {c.deposit && <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>Kaution: {c.deposit} €</p>}
                      </div>
                      <span style={{ fontSize: '12px', color: c.is_active ? '#16a34a' : '#999', backgroundColor: c.is_active ? '#f0fdf4' : '#f5f4f0', padding: '4px 12px', borderRadius: '20px' }}>
                        {c.is_active ? 'Aktiv' : 'Beendet'}
                      </span>
                      <button onClick={() => handleEdit(c)} style={{ backgroundColor: '#fff', color: '#666', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>Bearbeiten</button>
                      <button onClick={() => setDeleteConfirm(c.id)} style={{ backgroundColor: '#fff', color: '#dc2626', padding: '8px 14px', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '13px', cursor: 'pointer' }}>Löschen</button>
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