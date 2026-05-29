'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { getUserPlanInfo } from '@/lib/plans'
import { generateUnitCode, isValidUnitCode, makeUniqueCode } from '@/lib/unit-code'

interface UnitInput {
  type: string
  name: string
  unit_code: string
  unit_code_auto: string
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
  unit_code: '',
  unit_code_auto: '',
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
  const [allUnitCodes, setAllUnitCodes] = useState<string[]>([])
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

    const propertyIds = (data || []).map((p: any) => p.id)
    if (propertyIds.length > 0) {
      const { data: existingUnits } = await supabase
        .from('units')
        .select('unit_code')
        .in('property_id', propertyIds)
        .not('unit_code', 'is', null)
      setAllUnitCodes((existingUnits || []).map((u: any) => u.unit_code).filter(Boolean))
    }
  }

  const handleEdit = (p: any) => {
    setEditingId(p.id); setName(p.name)
    setAddress(p.address || ''); setCity(p.city || ''); setZip(p.zip || '')
    setNewUnits([])
    setShowForm(true)
  }

  const handleNewProperty = () => {
    setEditingId(null)
    setName(''); setAddress(''); setCity(''); setZip('')
    setNewUnits([emptyUnit()])
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false); setEditingId(null)
    setName(''); setAddress(''); setCity(''); setZip('')
    setNewUnits([emptyUnit()])
  }

  // Auto-Code neu generieren wenn city/address sich ändern
  useEffect(() => {
    if (editingId || !showForm) return
    setNewUnits(prev => {
      const updated: UnitInput[] = []
      const reservedCodes = [...allUnitCodes]
      prev.forEach(unit => {
        const auto = generateUnitCode({
          city, address, type: unit.type, existingCodes: reservedCodes,
        })
        updated.push({ ...unit, unit_code_auto: auto })
        reservedCodes.push(auto)
      })
      return updated
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, address, editingId, showForm, allUnitCodes.length])

  const addUnit = () => {
    const last = newUnits[newUnits.length - 1]
    const unit = emptyUnit()
    if (last) {
      unit.type = last.type
      const match = last.name.match(/^(.*?)(\d+)\s*$/)
      if (match) {
        const prefix = match[1]
        const num = parseInt(match[2]) + 1
        unit.name = `${prefix}${num}`
      }
    }
    const usedInForm = newUnits.map(u => u.unit_code || u.unit_code_auto).filter(Boolean)
    unit.unit_code_auto = generateUnitCode({
      city, address, type: unit.type,
      existingCodes: [...allUnitCodes, ...usedInForm],
    })
    setNewUnits([...newUnits, unit])
  }

  const quickAdd = (count: number, type: string = 'wohnung') => {
    const base: UnitInput[] = []
    const reservedCodes = [...allUnitCodes]
    for (let i = 1; i <= count; i++) {
      const u = {
        ...emptyUnit(),
        type,
        name: `${typeLabel[type] || 'Einheit'} ${i}`,
      }
      u.unit_code_auto = generateUnitCode({
        city, address, type, existingCodes: reservedCodes,
      })
      reservedCodes.push(u.unit_code_auto)
      base.push(u)
    }
    setNewUnits(base)
  }

  const removeUnit = (idx: number) => {
    if (newUnits.length === 1) {
      setNewUnits([emptyUnit()])
      return
    }
    setNewUnits(newUnits.filter((_, i) => i !== idx))
  }

  const updateUnit = (idx: number, field: keyof UnitInput, value: string) => {
    const updated = [...newUnits]
    updated[idx] = { ...updated[idx], [field]: value }
    if (field === 'type') {
      const usedCodes = updated
        .filter((_, i) => i !== idx)
        .map(u => u.unit_code || u.unit_code_auto)
        .filter(Boolean)
      updated[idx].unit_code_auto = generateUnitCode({
        city, address, type: value,
        existingCodes: [...allUnitCodes, ...usedCodes],
      })
    }
    setNewUnits(updated)
  }

  const regenerateCode = (idx: number) => {
    const updated = [...newUnits]
    const usedCodes = updated
      .filter((_, i) => i !== idx)
      .map(u => u.unit_code || u.unit_code_auto)
      .filter(Boolean)
    updated[idx].unit_code_auto = generateUnitCode({
      city, address, type: updated[idx].type,
      existingCodes: [...allUnitCodes, ...usedCodes],
    })
    updated[idx].unit_code = ''
    setNewUnits(updated)
  }

  const handleSave = async () => {
    if (!name) return
    setLoading(true)

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

    const validUnits = newUnits.filter(u => u.name.trim())

    if (validUnits.length > 0 && planInfo) {
      const remaining = (planInfo.limit === Infinity ? 999999 : planInfo.limit) - planInfo.currentUnits
      if (validUnits.length > remaining) {
        alert(
          `Plan-Limit überschritten!\n\n` +
          `Du nutzt ${planInfo.currentUnits} von ${planInfo.limit === Infinity ? '∞' : planInfo.limit} Einheiten (${planInfo.planName}).\n` +
          `Du versuchst ${validUnits.length} weitere Einheiten anzulegen.`
        )
        setLoading(false)
        return
      }
    }

    const finalCodes: string[] = []
    for (const u of validUnits) {
      let code = (u.unit_code.trim() || u.unit_code_auto).toUpperCase()
      if (!isValidUnitCode(code)) {
        alert(`Ungültiger Code für "${u.name}": "${code}"\nNur Buchstaben, Zahlen, Bindestriche erlaubt.`)
        setLoading(false)
        return
      }
      code = makeUniqueCode(code, [...allUnitCodes, ...finalCodes])
      finalCodes.push(code)
    }

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

    if (validUnits.length > 0) {
      const unitsToInsert = validUnits.map((u, idx) => {
        const data: any = {
          property_id: propData.id,
          type: u.type,
          name: u.name.trim(),
          unit_code: finalCodes[idx],
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
    setDeleteInfo({ propertyId, unitsCount: unitIds.length, tenantsCount, contractsCount, paidPaymentsCount })
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

  const card = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '24px' }
  const input = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const inputSmall = { ...input, padding: '8px 10px', fontSize: '13px' }
  const inputCode = { ...inputSmall, fontFamily: 'ui-monospace, monospace', fontSize: '12px', letterSpacing: '0.3px' }
  const label = { fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  const validUnitsCount = newUnits.filter(u => u.name.trim()).length
  const showCodeHint = !editingId && !!city && !!address

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div className="max-w-[1200px] mx-auto px-5 py-8 md:px-12 md:py-12 pb-24 md:pb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-10">
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
              Objekte
            </h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>{properties.length} Objekte gesamt</p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-3">
            <a href="/import" style={{
              backgroundColor: '#fff', color: '#1a1a1a', padding: '10px 20px',
              borderRadius: '8px', border: '1.5px solid #1a1a1a', fontSize: '13px',
              fontWeight: '500', textDecoration: 'none', display: 'inline-block',
            }}>📥 Excel-Import</a>
            <button onClick={handleNewProperty} style={{
              backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px',
              borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer',
            }}>
              + Objekt anlegen
            </button>
          </div>
        </div>

        {deleteInfo && (
          <div style={{
            ...card, marginBottom: '24px',
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
                }}>Verstanden</button>
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
                  }}>Abbrechen</button>
                </div>
              </>
            )}
          </div>
        )}

        {showForm && (
          <div id="formcard" className="scroll-mt-24" style={{ ...card, marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>
              {editingId ? 'Objekt bearbeiten' : 'Neues Objekt anlegen'}
            </h2>

            <div className="flex flex-col gap-4 md:grid md:grid-cols-2" style={{ marginBottom: editingId ? '20px' : '32px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={label}>Name *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="z.B. Mehrfamilienhaus Wielandstraße" style={input} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={label}>Adresse (Straße + Hausnummer)</label>
                <input value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="z.B. Wielandstraße 11" style={input} />
              </div>
              <div>
                <label style={label}>PLZ</label>
                <input value={zip} onChange={e => setZip(e.target.value)}
                  placeholder="49134" style={input} />
              </div>
              <div>
                <label style={label}>Stadt</label>
                <input value={city} onChange={e => setCity(e.target.value)}
                  placeholder="Wallenhorst" style={input} />
              </div>
            </div>

            {!editingId && (
              <div style={{ borderTop: '1px solid #f0eee8', paddingTop: '24px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
                      Einheiten <span style={{ color: '#bbb', fontWeight: '400' }}>(optional)</span>
                    </h3>
                    <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
                      {showCodeHint
                        ? `Codes werden automatisch generiert (z.B. ${generateUnitCode({ city, address, type: 'wohnung', existingCodes: [] })}). Du kannst sie überschreiben.`
                        : 'Fülle erst Stadt + Adresse aus, dann werden Codes automatisch erzeugt.'}
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

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr 130px 50px 60px 50px 75px 75px 28px', minWidth: '720px',
                  gap: '6px', padding: '0 4px 8px',
                  borderBottom: '1px solid #f0eee8', marginBottom: '8px'
                }}>
                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Typ</div>
                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bezeichnung *</div>
                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Code</div>
                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Etage</div>
                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>m²</div>
                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Zi.</div>
                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kalt €</div>
                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>NK €</div>
                  <div></div>
                </div>

                {newUnits.map((unit, idx) => {
                  const codeShown = unit.unit_code || unit.unit_code_auto
                  const isCustom = !!unit.unit_code.trim()
                  return (
                    <div key={idx} style={{
                      display: 'grid',
                      gridTemplateColumns: '100px 1fr 130px 50px 60px 50px 75px 75px 28px', minWidth: '720px',
                      gap: '6px', padding: '4px', marginBottom: '4px'
                    }}>
                      <select value={unit.type} onChange={e => updateUnit(idx, 'type', e.target.value)} style={inputSmall}>
                        <option value="wohnung">Wohnung</option>
                        <option value="gewerbe">Gewerbe</option>
                        <option value="stellplatz">Stellplatz</option>
                        <option value="sonstige">Sonstige</option>
                      </select>
                      <input value={unit.name} onChange={e => updateUnit(idx, 'name', e.target.value)}
                        placeholder={unit.type === 'wohnung' ? 'z.B. Wohnung 1' : unit.type === 'gewerbe' ? 'z.B. Ladenlokal EG' : unit.type === 'stellplatz' ? 'z.B. Stellplatz 1' : 'z.B. Lagerraum'}
                        style={inputSmall} />
                      <div style={{ position: 'relative' }}>
                        <input
                          value={codeShown}
                          onChange={e => updateUnit(idx, 'unit_code', e.target.value.toUpperCase())}
                          placeholder="auto"
                          style={{
                            ...inputCode,
                            color: isCustom ? '#1a1a1a' : '#666',
                            backgroundColor: isCustom ? '#fff' : '#f9f8f5',
                            paddingRight: isCustom ? '26px' : '10px',
                          }}
                          title={isCustom ? 'Manuell überschrieben' : 'Automatisch generiert'}
                        />
                        {isCustom && (
                          <button type="button" onClick={() => regenerateCode(idx)}
                            title="Auf Auto-Code zurücksetzen"
                            style={{
                              position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)',
                              background: 'none', border: 'none', color: '#999',
                              cursor: 'pointer', fontSize: '14px', padding: '2px 4px'
                            }}
                          >↺</button>
                        )}
                      </div>
                      <input value={unit.floor} onChange={e => updateUnit(idx, 'floor', e.target.value)}
                        placeholder="-" type="number" style={inputSmall}
                        disabled={unit.type === 'stellplatz'} />
                      <input value={unit.size_sqm} onChange={e => updateUnit(idx, 'size_sqm', e.target.value)}
                        placeholder="-" type="number" style={inputSmall} />
                      <input value={unit.rooms} onChange={e => updateUnit(idx, 'rooms', e.target.value)}
                        placeholder="-" type="number" style={inputSmall}
                        disabled={unit.type !== 'wohnung'} />
                      <input value={unit.rent_amount} onChange={e => updateUnit(idx, 'rent_amount', e.target.value)}
                        placeholder="0" type="number" style={inputSmall} />
                      <input value={unit.utilities_amount} onChange={e => updateUnit(idx, 'utilities_amount', e.target.value)}
                        placeholder="0" type="number" style={inputSmall} />
                      <button type="button" onClick={() => removeUnit(idx)} title="Zeile entfernen"
                        style={{
                          background: 'none', border: 'none', color: '#bbb',
                          cursor: 'pointer', fontSize: '18px', padding: '4px'
                        }}>×</button>
                    </div>
                  )
                })}

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
                }}>+ Einheit hinzufügen</button>

                {validUnitsCount > 0 && (
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '12px', marginBottom: 0 }}>
                    {validUnitsCount} Einheit{validUnitsCount === 1 ? '' : 'en'} wird zusammen mit dem Objekt angelegt.
                    {planInfo && ` (${planInfo.currentUnits + validUnitsCount} von ${planInfo.limit === Infinity ? '∞' : planInfo.limit} im ${planInfo.planName}-Plan)`}
                  </p>
                )}
              </div>
            )}

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
              }}>Abbrechen</button>
            </div>
          </div>
        )}

        {properties.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '64px' }}>
            <p style={{ fontSize: '14px', color: '#bbb', margin: '0 0 12px' }}>Noch keine Objekte angelegt.</p>
            <button onClick={handleNewProperty} style={{
              background: 'none', border: 'none', color: '#1a1a1a',
              fontSize: '14px', cursor: 'pointer', textDecoration: 'underline',
            }}>Erstes Objekt anlegen →</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {properties.map((p: any) => (
              <div key={p.id} style={card}>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div className="min-w-0">
                  <Link href={`/properties/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 4px', cursor: 'pointer' }}>{p.name} →</p>
                    </Link>
                    <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>
                      {[p.address, p.zip, p.city].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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