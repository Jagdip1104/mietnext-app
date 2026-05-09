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
  const [type, setType] = useState('wohnung')
  const [name, setName] = useState('')
  const [floor, setFloor] = useState('')
  const [sizeSqm, setSizeSqm] = useState('')
  const [rooms, setRooms] = useState('')
  const [rentAmount, setRentAmount] = useState('')
  const [utilitiesAmount, setUtilitiesAmount] = useState('')
  const [vatRate, setVatRate] = useState('19')
  const [usageType, setUsageType] = useState('')
  const [parkingType, setParkingType] = useState('garage')
  const [vatApplicable, setVatApplicable] = useState(false)
  const [notes, setNotes] = useState('')
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
    const { data: props } = await supabase.from('properties').select('*').eq('owner_id', uid).order('name')
    setProperties(props || [])
    const propertyIds = (props || []).map((p: any) => p.id)
    if (propertyIds.length === 0) { setUnits([]); return }
    const { data: unitsData } = await supabase.from('units').select('*, properties(name)')
      .in('property_id', propertyIds).order('created_at', { ascending: false })
    setUnits(unitsData || [])
  }

  const handleEdit = (u: any) => {
    setEditingId(u.id); setType(u.type || 'wohnung'); setName(u.name)
    setSelectedProperty(u.property_id); setFloor(u.floor?.toString() || '')
    setSizeSqm(u.size_sqm?.toString() || ''); setRooms(u.rooms?.toString() || '')
    setRentAmount(u.rent_amount?.toString() || '')
    setUtilitiesAmount(u.utilities_amount?.toString() || '')
    setVatRate(u.vat_rate?.toString() || '19')
    setUsageType(u.usage_type || '')
    setParkingType(u.parking_type || 'garage'); setVatApplicable(u.vat_applicable || false)
    setNotes(u.notes || ''); setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false); setEditingId(null); setType('wohnung'); setName('')
    setSelectedProperty(''); setFloor(''); setSizeSqm(''); setRooms('')
    setRentAmount(''); setUtilitiesAmount(''); setVatRate('19')
    setUsageType(''); setParkingType('garage')
    setVatApplicable(false); setNotes('')
  }

  const handleSave = async () => {
    if (!name || !selectedProperty) return
    setLoading(true)
    const data: any = {
      name, property_id: selectedProperty, type, notes: notes || null,
      size_sqm: sizeSqm ? parseFloat(sizeSqm) : null,
      rent_amount: rentAmount ? parseFloat(rentAmount) : 0,
      utilities_amount: utilitiesAmount ? parseFloat(utilitiesAmount) : 0,
    }
    if (type === 'wohnung') { data.floor = floor ? parseInt(floor) : null; data.rooms = rooms ? parseFloat(rooms) : null }
    if (type === 'gewerbe') {
      data.floor = floor ? parseInt(floor) : null
      data.usage_type = usageType || null
      data.vat_applicable = vatApplicable
      data.vat_rate = vatApplicable ? (vatRate ? parseFloat(vatRate) : 19) : 19
    }
    if (type === 'stellplatz') { data.parking_type = parkingType }
    if (editingId) { await supabase.from('units').update(data).eq('id', editingId) }
    else { await supabase.from('units').insert({ ...data, is_occupied: false }) }
    handleCancel(); setLoading(false); loadData(userId!)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('units').delete().eq('id', id)
    setDeleteConfirm(null); loadData(userId!)
  }

  const computeTotalRent = () => {
    const base = parseFloat(rentAmount) || 0
    const utils = parseFloat(utilitiesAmount) || 0
    const subtotal = base + utils
    if (type === 'gewerbe' && vatApplicable) {
      const vat = parseFloat(vatRate) || 19
      return subtotal * (1 + vat / 100)
    }
    return subtotal
  }

  const formatEur = (val: number | string | null | undefined) => {
    if (val === null || val === undefined || val === '') return '0,00 €'
    const n = typeof val === 'string' ? parseFloat(val) : val
    return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  }

  const typeColor: any = { wohnung: '#3b82f6', gewerbe: '#8b5cf6', stellplatz: '#6b7280', sonstige: '#6b7280' }
  const typeBg: any = { wohnung: '#eff6ff', gewerbe: '#f5f3ff', stellplatz: '#f5f4f0', sonstige: '#f5f4f0' }
  const typeLabel: any = { wohnung: 'Wohnung', gewerbe: 'Gewerbe', stellplatz: 'Stellplatz', sonstige: 'Sonstige' }

  const card = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '24px' }
  const input = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const label = { fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>Einheiten</h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>{units.length} Einheiten gesamt</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
            + Einheit anlegen
          </button>
        </div>

        {showForm && (
          <div style={{ ...card, marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>
              {editingId ? 'Einheit bearbeiten' : 'Neue Einheit'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={label}>Typ *</label>
                <select value={type} onChange={e => setType(e.target.value)} style={input}>
                  <option value="wohnung">Wohnung</option>
                  <option value="gewerbe">Gewerbe</option>
                  <option value="stellplatz">Stellplatz</option>
                  <option value="sonstige">Sonstige</option>
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={label}>Objekt *</label>
                <select value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)} style={input}>
                  <option value="">Objekt auswählen...</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={label}>Bezeichnung *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder={type === 'wohnung' ? 'z.B. Wohnung 1. OG links' : type === 'gewerbe' ? 'z.B. Ladenlokal EG' : type === 'stellplatz' ? 'z.B. Stellplatz 3' : 'z.B. Lagerraum'}
                  style={input} />
              </div>

              {type === 'wohnung' && (<>
                <div><label style={label}>Etage</label><input value={floor} onChange={e => setFloor(e.target.value)} placeholder="z.B. 1" type="number" style={input} /></div>
                <div><label style={label}>Zimmer</label><input value={rooms} onChange={e => setRooms(e.target.value)} placeholder="z.B. 3" type="number" style={input} /></div>
                <div><label style={label}>Fläche (m²)</label><input value={sizeSqm} onChange={e => setSizeSqm(e.target.value)} placeholder="z.B. 75" type="number" style={input} /></div>
                <div><label style={label}>Soll-Kaltmiete (€)</label><input value={rentAmount} onChange={e => setRentAmount(e.target.value)} placeholder="z.B. 950" type="number" style={input} /></div>
                <div style={{ gridColumn: 'span 2' }}><label style={label}>Nebenkosten (€/Monat)</label><input value={utilitiesAmount} onChange={e => setUtilitiesAmount(e.target.value)} placeholder="z.B. 150" type="number" style={input} /></div>
              </>)}

              {type === 'gewerbe' && (<>
                <div><label style={label}>Etage</label><input value={floor} onChange={e => setFloor(e.target.value)} placeholder="z.B. 0 (EG)" type="number" style={input} /></div>
                <div><label style={label}>Fläche (m²)</label><input value={sizeSqm} onChange={e => setSizeSqm(e.target.value)} placeholder="z.B. 120" type="number" style={input} /></div>
                <div>
                  <label style={label}>Nutzungsart</label>
                  <select value={usageType} onChange={e => setUsageType(e.target.value)} style={input}>
                    <option value="">Bitte wählen...</option>
                    <option value="buero">Büro</option>
                    <option value="laden">Laden / Einzelhandel</option>
                    <option value="lager">Lager</option>
                    <option value="restaurant">Restaurant / Gastronomie</option>
                    <option value="praxis">Praxis / Kanzlei</option>
                    <option value="sonstige">Sonstige</option>
                  </select>
                </div>
                <div><label style={label}>Soll-Kaltmiete (€/Monat)</label><input value={rentAmount} onChange={e => setRentAmount(e.target.value)} placeholder="z.B. 2000" type="number" style={input} /></div>
                <div style={{ gridColumn: 'span 2' }}><label style={label}>Nebenkosten (€/Monat)</label><input value={utilitiesAmount} onChange={e => setUtilitiesAmount(e.target.value)} placeholder="z.B. 300" type="number" style={input} /></div>
                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" id="vat" checked={vatApplicable} onChange={e => setVatApplicable(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                  <label htmlFor="vat" style={{ fontSize: '14px', color: '#666' }}>Umsatzsteuerpflichtig (MwSt.)</label>
                </div>
                {vatApplicable && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={label}>MwSt-Satz (%)</label>
                    <input value={vatRate} onChange={e => setVatRate(e.target.value)} placeholder="19" type="number" style={input} />
                  </div>
                )}
              </>)}

              {type === 'stellplatz' && (<>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={label}>Stellplatz-Typ</label>
                  <select value={parkingType} onChange={e => setParkingType(e.target.value)} style={input}>
                    <option value="garage">Garage</option>
                    <option value="carport">Carport</option>
                    <option value="aussen">Außenstellplatz</option>
                    <option value="tiefgarage">Tiefgarage</option>
                  </select>
                </div>
                <div><label style={label}>Miete (€/Monat)</label><input value={rentAmount} onChange={e => setRentAmount(e.target.value)} placeholder="z.B. 80" type="number" style={input} /></div>
                <div><label style={label}>Nebenkosten (€/Monat)</label><input value={utilitiesAmount} onChange={e => setUtilitiesAmount(e.target.value)} placeholder="z.B. 0" type="number" style={input} /></div>
              </>)}

              {type === 'sonstige' && (<>
                <div><label style={label}>Fläche (m²)</label><input value={sizeSqm} onChange={e => setSizeSqm(e.target.value)} placeholder="z.B. 20" type="number" style={input} /></div>
                <div><label style={label}>Miete (€/Monat)</label><input value={rentAmount} onChange={e => setRentAmount(e.target.value)} placeholder="z.B. 50" type="number" style={input} /></div>
                <div style={{ gridColumn: 'span 2' }}><label style={label}>Nebenkosten (€/Monat)</label><input value={utilitiesAmount} onChange={e => setUtilitiesAmount(e.target.value)} placeholder="z.B. 0" type="number" style={input} /></div>
              </>)}

              {(rentAmount || utilitiesAmount) && (
                <div style={{ gridColumn: 'span 2', backgroundColor: '#f5f4f0', borderRadius: '8px', padding: '14px 18px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#666' }}>
                      Kaltmiete {formatEur(rentAmount)} + Nebenkosten {formatEur(utilitiesAmount)}
                      {type === 'gewerbe' && vatApplicable && ` + ${vatRate}% MwSt.`}
                    </span>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a', fontFamily: 'Georgia, serif' }}>
                      Gesamt: {formatEur(computeTotalRent())}
                    </span>
                  </div>
                </div>
              )}

              <div style={{ gridColumn: 'span 2' }}>
                <label style={label}>Notizen</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Zusätzliche Informationen..." rows={2}
                  style={{ ...input, resize: 'vertical' as const }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSave} disabled={loading || !name || !selectedProperty}
                style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.4 : 1 }}>
                {loading ? 'Speichern...' : editingId ? 'Änderungen speichern' : 'Speichern'}
              </button>
              <button onClick={handleCancel} style={{ backgroundColor: '#fff', color: '#666', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {units.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '64px' }}>
            <p style={{ fontSize: '14px', color: '#bbb', margin: '0 0 12px' }}>Noch keine Einheiten angelegt.</p>
            <button onClick={() => setShowForm(true)} style={{ background: 'none', border: 'none', color: '#1a1a1a', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}>
              Erste Einheit anlegen →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {units.map(u => (
              <div key={u.id} style={card}>
                {deleteConfirm === u.id ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>Einheit wirklich löschen?</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleDelete(u.id)} style={{ backgroundColor: '#dc2626', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>Ja, löschen</button>
                      <button onClick={() => setDeleteConfirm(null)} style={{ backgroundColor: '#fff', color: '#666', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 4px' }}>{u.name}</p>
                      <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>
                        {u.properties?.name}
                        {u.size_sqm && ` · ${u.size_sqm} m²`}
                        {u.rooms && ` · ${u.rooms} Zimmer`}
                        {u.floor !== null && u.floor !== undefined && ` · ${u.floor}. OG`}
                        {u.total_rent && ` · ${formatEur(u.total_rent)}/Monat`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: typeColor[u.type] || '#6b7280', backgroundColor: typeBg[u.type] || '#f5f4f0', padding: '4px 10px', borderRadius: '20px', fontWeight: '500' }}>
                        {typeLabel[u.type] || 'Sonstige'}
                      </span>
                      <span style={{ fontSize: '11px', color: u.is_occupied ? '#16a34a' : '#999', backgroundColor: u.is_occupied ? '#f0fdf4' : '#f5f4f0', padding: '4px 10px', borderRadius: '20px', fontWeight: '500' }}>
                        {u.is_occupied ? 'Vermietet' : 'Leer'}
                      </span>
                      <button onClick={() => handleEdit(u)} style={{ backgroundColor: '#fff', color: '#666', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>Bearbeiten</button>
                      <button onClick={() => setDeleteConfirm(u.id)} style={{ backgroundColor: '#fff', color: '#dc2626', padding: '8px 14px', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '13px', cursor: 'pointer' }}>Löschen</button>
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