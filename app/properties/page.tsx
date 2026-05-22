'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { getUserPlanInfo } from '@/lib/plans'

interface UnitInput {
  type: string
  name: string
  floor: string
  size_sqm: string
  rooms: string
  rent_amount: string
  utilities_amount: string
}

interface DeleteInfo {
  propertyId: string
  unitsCount: number
  tenantsCount: number
  contractsCount: number
  paidPaymentsCount: number
}

const emptyUnit = (): UnitInput => ({
  type: 'wohnung',
  name: '',
  floor: '',
  size_sqm: '',
  rooms: '',
  rent_amount: '',
  utilities_amount: ''
})

const typeLabel: any = { wohnung: 'Wohnung', gewerbe: 'Gewerbe', stellplatz: 'Stellplatz', sonstige: 'Sonstige' }

export default function Properties() {
  const [properties, setProperties] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')
  const [newUnits, setNewUnits] = useState<UnitInput[]>([emptyUnit()])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteInfo, setDeleteInfo] = useState<DeleteInfo | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [planInfo, setPlanInfo] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      loadProperties(session.user.id)
    }
    check()
  }, [])

  const loadProperties = async (uid: string) => {
    const { data } = await supabase
      .from('properties').select('*, units(count)')
      .eq('owner_id', uid)
      .order('created_at', { ascending: false })
    setProperties(data || [])
    setPlanInfo(await getUserPlanInfo(uid))
  }

  const handleEdit = (p: any) => {
    setEditingId(p.id); setName(p.name)
    setAddress(p.address || ''); setCity(p.city || ''); setZip(p.zip || '')
    setNewUnits([])  // Beim Bearbeiten KEINE Einheiten-Sektion
    setShowForm(true)
  }

  const handleNewProperty = () => {
    setEditingId(null)
    setName(''); setAddress(''); setCity(''); setZip('')
    setNewUnits([emptyUnit()])  // Eine leere Einheit als Startpunkt
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false); setEditingId(null)
    setName(''); setAddress(''); setCity(''); setZip('')
    setNewUnits([emptyUnit()])
  }

  // === Einheiten-Handling ===

  const addUnit = () => {
    // Smart-Default: Nächste Wohnung hochzählen, wenn vorherige "Wohnung X" heißt
    const last = newUnits[newUnits.length - 1]
    const unit = emptyUnit()
    if (last) {
      unit.type = last.type
      // Versuche aus letzter Bezeichnung Nummer zu extrahieren und hochzuzählen
      const match = last.name.match(/^(.*?)(\d+)\s*$/)
      if (match) {
        const prefix = match[1]
        const num = parseInt(match[2]) + 1
        unit.name = `${prefix}${num}`
      }
    }
    setNewUnits([...newUnits, unit])
  }

  const quickAdd = (count: number, type: string = 'wohnung') => {
    const base: UnitInput[] = []
    for (let i = 1; i <= count; i++) {
      base.push({
        ...emptyUnit(),
        type,
        name: `${typeLabel[type] || 'Einheit'} ${i}`
      })
    }
    setNewUnits(base)
  }

  const removeUnit = (idx: number) => {
    if (newUnits.length === 1) {
      // Wenn nur eine übrig, zurück auf leer setzen
      setNewUnits([emptyUnit()])
      return
    }
    setNewUnits(newUnits.filter((_, i) => i !== idx))
  }

  const updateUnit = (idx: number, field: keyof UnitInput, value: string) => {
    const updated = [...newUnits]
    updated[idx] = { ...updated[idx], [field]: value }
    setNewUnits(updated)
  }

  // === Speichern ===

  const handleSave = async () => {
    if (!name) return
    setLoading(true)

    // EDIT-MODUS: Nur Property updaten, keine Einheiten
    if (editingId) {
      const { error } = await supabase.from('properties')
        .update({ name, address, city, zip })
        .eq('id', editingId)
      if (error) {
        alert('Fehler: ' + error.message)
        setLoading(false)
        return
      }
      handleCancel()
      setLoading(false)
      loadProperties(userId!)
      return
    }

    // NEU-MODUS: Property + Einheiten in einer Aktion

    // Nur Einheiten mit Bezeichnung berücksichtigen
    const validUnits = newUnits.filter(u => u.name.trim())

    // Plan-Limit prüfen
    if (validUnits.length > 0 && planInfo) {
      const remaining = (planInfo.limit === Infinity ? 999999 : planInfo.limit) - planInfo.currentUnits
      if (validUnits.length > remaining) {
        alert(
          `Plan-Limit überschritten!\n\n` +
          `Du nutzt ${planInfo.currentUnits} von ${planInfo.limit === Infinity ? '∞' : planInfo.limit} Einheiten (${planInfo.planName}).\n` +
          `Du versuchst ${validUnits.length} weitere Einheiten anzulegen.\n\n` +
          `Bitte reduziere die Anzahl oder upgrade deinen Plan.`
        )
        setLoading(false)
        return
      }
    }

    // 1. Property anlegen
    const { data: propData, error: propErr } = await supabase
      .from('properties')
      .insert({ name, address, city, zip, owner_id: userId })
      .select()
      .single()

    if (propErr || !propData) {
      alert('Fehler beim Anlegen des Objekts: ' + (propErr?.message || 'Unbekannt'))
      setLoading(false)
      return
    }

    // 2. Einheiten anlegen (falls vorhanden)
    if (validUnits.length > 0) {
      const unitsToInsert = validUnits.map(u => {
        const data: any = {
          property_id: propData.id,
          type: u.type,
          name: u.name.trim(),
          is_occupied: false,
          rent_amount: u.rent_amount ? parseFloat(u.rent_amount) : 0,
          utilities_amount: u.utilities_amount ? parseFloat(u.utilities_amount) : 0,
          size_sqm: u.size_sqm ? parseFloat(u.size_sqm) : null,
        }
        if (u.type === 'wohnung') {
          data.floor = u.floor ? parseInt(u.floor) : null
          data.rooms = u.rooms ? parseFloat(u.rooms) : null
        } else if (u.type === 'gewerbe') {
          data.floor = u.floor ? parseInt(u.floor) : null
        } else if (u.type === 'stellplatz') {
          data.parking_type = 'garage'
        }
        return data
      })

      const { error: unitsErr } = await supabase.from('units').insert(unitsToInsert)

      if (unitsErr) {
        // Cleanup: Property wieder löschen wenn Einheiten fehlschlagen
        await supabase.from('properties').delete().eq('id', propData.id)
        alert('Fehler beim Anlegen der Einheiten: ' + unitsErr.message + '\n\nObjekt wurde zurückgesetzt.')
        setLoading(false)
        return
      }
    }

    handleCancel()
    setLoading(false)
    loadProperties(userId!)
  }

  // === Löschen (unverändert) ===

  const handleDeleteClick = async (propertyId: string) => {
    const { data: units } = await supabase
      .from('units').select('id').eq('property_id', propertyId)
    const unitIds = (units || []).map((u: any) => u.id)

    let tenantsCount = 0
    let contractsCount = 0
    let paidPaymentsCount = 0

    if (unitIds.length > 0) {
      const { count: tCount } = await supabase
        .from('tenants').select('*', { count: 'exact', head: true })
        .in('unit_id', unitIds)
      tenantsCount = tCount || 0

      const { data: contracts } = await supabase
        .from('contracts').select('id').in('unit_id', unitIds)
      const contractIds = (contracts || []).map((c: any) => c.id)
      contractsCount = contractIds.length

      if (contractIds.length > 0) {
        const { count: pCount } = await supabase
          .from('payments').select('*', { count: 'exact', head: true })
          .in('contract_id', contractIds).eq('status', 'paid')
        paidPaymentsCount = pCount || 0
      }
    }

    setDeleteInfo({
      propertyId,
      unitsCount: unitIds.length,
      tenantsCount,
      contractsCount,
      paidPaymentsCount
    })
  }

  const handleConfirmDelete = async () => {
    if (!deleteInfo) return
    if (deleteInfo.paidPaymentsCount > 0) return

    setDeleting(true)

    try {
      const { data: units } = await supabase
        .from('units').select('id').eq('property_id', deleteInfo.propertyId)
      const unitIds = (units || []).map((u: any) => u.id)

      if (unitIds.length > 0) {
        const { data: contracts } = await supabase
          .from('contracts').select('id').in('unit_id', unitIds)
        const contractIds = (contracts || []).map((c: any) => c.id)

        if (contractIds.length > 0) {
          await supabase.from('payments').delete().in('contract_id', contractIds)
          await supabase.from('contracts').delete().in('id', contractIds)
        }

        await supabase.from('tenants').delete().in('unit_id', unitIds)
      }

      const { error } = await supabase.from('properties').delete().eq('id', deleteInfo.propertyId)
      if (error) throw error

      setDeleteInfo(null)
      loadProperties(userId!)
    } catch (err: any) {
      alert('Fehler beim Löschen: ' + err.message)
    }

    setDeleting(false)
  }

  // === Styling ===

  const card = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '24px' }
  const input = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const inputSmall = { ...input, padding: '8px 10px', fontSize: '13px' }
  const label = { fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  const validUnitsCount = newUnits.filter(u => u.name.trim()).length

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
              Objekte
            </h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>{properties.length} Objekte gesamt</p>
          </div>
          <button onClick={handleNewProperty} style={{
            backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px',
            borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer',
          }}>
            + Objekt anlegen
          </button>
        </div>

        {/* Lösch-Dialog */}
        {deleteInfo && (
          <div style={{
            ...card,
            marginBottom: '24px',
            borderLeft: deleteInfo.paidPaymentsCount > 0 ? '4px solid #dc2626' : '4px solid #d97706'
          }}>
            {deleteInfo.paidPaymentsCount > 0 ? (
              <>
                <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#dc2626', margin: '0 0 12px', fontFamily: 'Georgia, serif' }}>
                  ⛔ Löschen nicht möglich
                </h2>
                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px' }}>
                  Dieses Objekt hat <strong>{deleteInfo.paidPaymentsCount} bereits bezahlte Zahlung(en)</strong>.
                </p>
                <p style={{ fontSize: '13px', color: '#999', margin: '0 0 16px' }}>
                  Aus Buchhaltungsgründen (10-Jahre-Aufbewahrung nach §147 AO) kann das Objekt nicht gelöscht werden.
                </p>
                <button onClick={() => setDeleteInfo(null)} style={{
                  backgroundColor: '#fff', color: '#666', padding: '10px 20px',
                  borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer'
                }}>
                  Verstanden
                </button>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#d97706', margin: '0 0 12px', fontFamily: 'Georgia, serif' }}>
                  ⚠️ Objekt wirklich löschen?
                </h2>
                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px' }}>
                  Folgende Daten werden <strong>unwiderruflich</strong> mitgelöscht:
                </p>
                <ul style={{ fontSize: '14px', color: '#1a1a1a', margin: '0 0 16px', paddingLeft: '20px' }}>
                  <li>{deleteInfo.unitsCount} Einheit(en)</li>
                  <li>{deleteInfo.tenantsCount} Mieter</li>
                  <li>{deleteInfo.contractsCount} Vertrag/Verträge</li>
                </ul>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleConfirmDelete} disabled={deleting} style={{
                    backgroundColor: '#dc2626', color: '#fff', padding: '10px 20px',
                    borderRadius: '8px', border: 'none', fontSize: '13px',
                    cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1
                  }}>
                    {deleting ? 'Lösche...' : 'Ja, alles löschen'}
                  </button>
                  <button onClick={() => setDeleteInfo(null)} disabled={deleting} style={{
                    backgroundColor: '#fff', color: '#666', padding: '10px 20px',
                    borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer'
                  }}>
                    Abbrechen
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {showForm && (
          <div style={{ ...card, marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>
              {editingId ? 'Objekt bearbeiten' : 'Neues Objekt anlegen'}
            </h2>

            {/* === Objekt-Daten === */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: editingId ? '20px' : '32px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={label}>Name *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="z.B. Mehrfamilienhaus Musterstraße" style={input} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={label}>Adresse</label>
                <input value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="Musterstraße 1" style={input} />
              </div>
              <div>
                <label style={label}>PLZ</label>
                <input value={zip} onChange={e => setZip(e.target.value)}
                  placeholder="12345" style={input} />
              </div>
              <div>
                <label style={label}>Stadt</label>
                <input value={city} onChange={e => setCity(e.target.value)}
                  placeholder="Berlin" style={input} />
              </div>
            </div>

            {/* === Einheiten-Sektion: NUR beim Neuanlegen === */}
            {!editingId && (
              <div style={{ borderTop: '1px solid #f0eee8', paddingTop: '24px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
                      Einheiten <span style={{ color: '#bbb', fontWeight: '400' }}>(optional)</span>
                    </h3>
                    <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
                      Du kannst direkt die Einheiten dieses Objekts anlegen — oder später nachholen.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '11px', color: '#999', alignSelf: 'center', marginRight: '4px' }}>Schnell:</span>
                    <button type="button" onClick={() => quickAdd(3)} style={{
                      backgroundColor: '#f5f4f0', color: '#1a1a1a', padding: '6px 12px',
                      borderRadius: '6px', border: 'none', fontSize: '12px', cursor: 'pointer'
                    }}>3 Wohnungen</button>
                    <button type="button" onClick={() => quickAdd(5)} style={{
                      backgroundColor: '#f5f4f0', color: '#1a1a1a', padding: '6px 12px',
                      borderRadius: '6px', border: 'none', fontSize: '12px', cursor: 'pointer'
                    }}>5 Wohnungen</button>
                    <button type="button" onClick={() => quickAdd(10)} style={{
                      backgroundColor: '#f5f4f0', color: '#1a1a1a', padding: '6px 12px',
                      borderRadius: '6px', border: 'none', fontSize: '12px', cursor: 'pointer'
                    }}>10 Wohnungen</button>
                  </div>
                </div>

                {/* Tabellen-Kopf */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '110px 1fr 60px 70px 60px 90px 90px 32px',
                  gap: '8px',
                  padding: '0 4px 8px',
                  borderBottom: '1px solid #f0eee8',
                  marginBottom: '8px'
                }}>
                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Typ</div>
                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bezeichnung *</div>
                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Etage</div>
                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>m²</div>
                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Zi.</div>
                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kalt €</div>
                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>NK €</div>
                  <div></div>
                </div>

                {/* Einheiten-Zeilen */}
                {newUnits.map((unit, idx) => (
                  <div key={idx} style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr 60px 70px 60px 90px 90px 32px',
                    gap: '8px',
                    padding: '4px',
                    marginBottom: '4px'
                  }}>
                    <select
                      value={unit.type}
                      onChange={e => updateUnit(idx, 'type', e.target.value)}
                      style={inputSmall}
                    >
                      <option value="wohnung">Wohnung</option>
                      <option value="gewerbe">Gewerbe</option>
                      <option value="stellplatz">Stellplatz</option>
                      <option value="sonstige">Sonstige</option>
                    </select>
                    <input
                      value={unit.name}
                      onChange={e => updateUnit(idx, 'name', e.target.value)}
                      placeholder={unit.type === 'wohnung' ? 'z.B. Wohnung 1' : unit.type === 'gewerbe' ? 'z.B. Ladenlokal EG' : unit.type === 'stellplatz' ? 'z.B. Stellplatz 1' : 'z.B. Lagerraum'}
                      style={inputSmall}
                    />
                    <input
                      value={unit.floor}
                      onChange={e => updateUnit(idx, 'floor', e.target.value)}
                      placeholder="-"
                      type="number"
                      style={inputSmall}
                      disabled={unit.type === 'stellplatz'}
                    />
                    <input
                      value={unit.size_sqm}
                      onChange={e => updateUnit(idx, 'size_sqm', e.target.value)}
                      placeholder="-"
                      type="number"
                      style={inputSmall}
                    />
                    <input
                      value={unit.rooms}
                      onChange={e => updateUnit(idx, 'rooms', e.target.value)}
                      placeholder="-"
                      type="number"
                      style={inputSmall}
                      disabled={unit.type !== 'wohnung'}
                    />
                    <input
                      value={unit.rent_amount}
                      onChange={e => updateUnit(idx, 'rent_amount', e.target.value)}
                      placeholder="0"
                      type="number"
                      style={inputSmall}
                    />
                    <input
                      value={unit.utilities_amount}
                      onChange={e => updateUnit(idx, 'utilities_amount', e.target.value)}
                      placeholder="0"
                      type="number"
                      style={inputSmall}
                    />
                    <button
                      type="button"
                      onClick={() => removeUnit(idx)}
                      title="Zeile entfernen"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#bbb',
                        cursor: 'pointer',
                        fontSize: '18px',
                        padding: '4px'
                      }}
                    >×</button>
                  </div>
                ))}

                <button type="button" onClick={addUnit} style={{
                  marginTop: '8px',
                  background: 'none',
                  border: '1px dashed #d4d2cc',
                  color: '#666',
                  padding: '10px',
                  width: '100%',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}>
                  + Einheit hinzufügen
                </button>

                {validUnitsCount > 0 && (
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '12px', marginBottom: 0 }}>
                    {validUnitsCount} Einheit{validUnitsCount === 1 ? '' : 'en'} wird zusammen mit dem Objekt angelegt.
                    {planInfo && ` (${planInfo.currentUnits + validUnitsCount} von ${planInfo.limit === Infinity ? '∞' : planInfo.limit} im ${planInfo.planName}-Plan)`}
                  </p>
                )}
              </div>
            )}

            {/* === Speichern / Abbrechen === */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSave} disabled={loading || !name} style={{
                backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px',
                borderRadius: '8px', border: 'none', fontSize: '13px',
                cursor: loading || !name ? 'not-allowed' : 'pointer',
                opacity: loading || !name ? 0.4 : 1,
              }}>
                {loading
                  ? 'Speichern...'
                  : editingId
                  ? 'Änderungen speichern'
                  : validUnitsCount > 0
                  ? `Objekt + ${validUnitsCount} Einheit${validUnitsCount === 1 ? '' : 'en'} anlegen`
                  : 'Nur Objekt anlegen'}
              </button>
              <button onClick={handleCancel} style={{
                backgroundColor: '#fff', color: '#666', padding: '10px 20px',
                borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer',
              }}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {properties.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '64px' }}>
            <p style={{ fontSize: '14px', color: '#bbb', margin: '0 0 12px' }}>Noch keine Objekte angelegt.</p>
            <button onClick={handleNewProperty} style={{
              background: 'none', border: 'none', color: '#1a1a1a',
              fontSize: '14px', cursor: 'pointer', textDecoration: 'underline',
            }}>
              Erstes Objekt anlegen →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {properties.map((p: any) => (
              <div key={p.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 4px' }}>{p.name}</p>
                    <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>
                      {[p.address, p.zip, p.city].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#999', backgroundColor: '#f5f4f0', padding: '4px 12px', borderRadius: '20px' }}>
                      {p.units?.[0]?.count || 0} Einheiten
                    </span>
                    <button onClick={() => handleEdit(p)} style={{
                      backgroundColor: '#fff', color: '#666', padding: '8px 14px',
                      borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer',
                    }}>Bearbeiten</button>
                    <button onClick={() => handleDeleteClick(p.id)} style={{
                      backgroundColor: '#fff', color: '#dc2626', padding: '8px 14px',
                      borderRadius: '8px', border: '1px solid #fecaca', fontSize: '13px', cursor: 'pointer',
                    }}>Löschen</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}