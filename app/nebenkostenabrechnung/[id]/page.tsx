'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Nav from '@/components/Nav'

const BETRKV_CATEGORIES = [
  { value: 'grundsteuer',        label: '§2 Nr.1  – Grundsteuer',                           defaultKey: 'sqm'      },
  { value: 'wasser',             label: '§2 Nr.2  – Wasserversorgung',                       defaultKey: 'sqm'      },
  { value: 'entwasserung',       label: '§2 Nr.3  – Entwässerung / Abwasser',                defaultKey: 'sqm'      },
  { value: 'heizung',            label: '§2 Nr.4  – Heizkosten (Ista/Techem)',               defaultKey: 'per_unit' },
  { value: 'warmwasser',         label: '§2 Nr.5  – Warmwasser (Ista/Techem)',               defaultKey: 'per_unit' },
  { value: 'heizung_warmwasser', label: '§2 Nr.6  – Heizung + Warmwasser (verbunden)',       defaultKey: 'per_unit' },
  { value: 'aufzug',             label: '§2 Nr.7  – Aufzug',                                 defaultKey: 'equal'    },
  { value: 'strassenreinigung',  label: '§2 Nr.8  – Straßenreinigung / Müllbeseitigung',     defaultKey: 'sqm'      },
  { value: 'gebaeudereinigung',  label: '§2 Nr.9  – Gebäudereinigung / Ungezieferbekämpfung',defaultKey: 'sqm'      },
  { value: 'gartenpflege',       label: '§2 Nr.10 – Gartenpflege',                           defaultKey: 'sqm'      },
  { value: 'allgemeinstrom',     label: '§2 Nr.11 – Allgemeinstrom / Beleuchtung',            defaultKey: 'equal'    },
  { value: 'schornstein',        label: '§2 Nr.12 – Schornsteinreinigung',                   defaultKey: 'equal'    },
  { value: 'versicherung',       label: '§2 Nr.13 – Sach- und Haftpflichtversicherung',      defaultKey: 'sqm'      },
  { value: 'hauswart',           label: '§2 Nr.14 – Hauswart / Hausmeister',                 defaultKey: 'sqm'      },
  { value: 'antenne',            label: '§2 Nr.15 – Gemeinschaftsantenne / Kabel / Internet',defaultKey: 'equal'    },
  { value: 'waeschepflege',      label: '§2 Nr.16 – Wäschepflege-Einrichtungen',             defaultKey: 'equal'    },
  { value: 'sonstige',           label: '§2 Nr.17 – Sonstige Betriebskosten',                defaultKey: 'sqm'      },
]

const DISTRIBUTION_KEYS = [
  { value: 'sqm',      label: 'Nach Wohnfläche m²'                         },
  { value: 'equal',    label: 'Gleichmäßig pro Einheit'                    },
  { value: 'per_unit', label: 'Einzelbeträge je Einheit (z.B. Ista/Techem)'},
]

export default function NebenkostenabrechnungDetail() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [statement, setStatement]   = useState<any>(null)
  const [units, setUnits]           = useState<any[]>([])
  const [contracts, setContracts]   = useState<any[]>([])
  const [costItems, setCostItems]   = useState<any[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const [newItem, setNewItem]       = useState({
    category: '', description: '', total_amount: '',
    distribution_key: 'sqm', unit_amounts: {} as Record<string, string>,
  })

  useEffect(() => { if (id) loadData() }, [id])

  const loadData = async () => {
    const { data: stmt } = await supabase
      .from('utility_statements')
      .select('*, properties(id, name, address, city)')
      .eq('id', id).single()
    setStatement(stmt)
    if (!stmt) return

    const { data: unitsData } = await supabase
      .from('units').select('*')
      .eq('property_id', stmt.properties.id).order('name')
    setUnits(unitsData || [])

    const unitIds = (unitsData || []).map((u: any) => u.id)
    if (unitIds.length > 0) {
      const { data: contractsData } = await supabase
        .from('contracts')
        .select('*, tenants(full_name, email)')
        .in('unit_id', unitIds)
        .lte('start_date', `${stmt.year}-12-31`)
        .or(`end_date.gte.${stmt.year}-01-01,end_date.is.null`)
      setContracts(contractsData || [])
    }

    const { data: itemsData } = await supabase
      .from('utility_cost_items').select('*')
      .eq('statement_id', id).order('created_at')
    setCostItems(itemsData || [])
  }

  const handleCategoryChange = (category: string) => {
    const cat = BETRKV_CATEGORIES.find((c: any) => c.value === category)
    setNewItem(prev => ({ ...prev, category, distribution_key: cat?.defaultKey || 'sqm' }))
  }

  const handleUnitAmountChange = (unitId: string, value: string) => {
    const updated = { ...newItem.unit_amounts, [unitId]: value }
    const total = Object.values(updated).reduce((s: number, v: any) => s + (parseFloat(v) || 0), 0)
    setNewItem(prev => ({ ...prev, unit_amounts: updated, total_amount: total.toFixed(2) }))
  }

  const handleAddItem = async () => {
    if (!newItem.category || !newItem.total_amount) return
    setSaving(true)
    const itemData: any = {
      statement_id: id,
      category: newItem.category,
      description: newItem.description || null,
      total_amount: parseFloat(newItem.total_amount),
      distribution_key: newItem.distribution_key,
    }
    if (newItem.distribution_key === 'per_unit') {
      itemData.unit_amounts = newItem.unit_amounts
    }
    const { error } = await supabase.from('utility_cost_items').insert(itemData)
    if (error) { alert('Fehler: ' + error.message); setSaving(false); return }
    setNewItem({ category: '', description: '', total_amount: '', distribution_key: 'sqm', unit_amounts: {} })
    setShowAddForm(false)
    setSaving(false)
    loadData()
  }

  const handleDeleteItem = async (itemId: string) => {
    await supabase.from('utility_cost_items').delete().eq('id', itemId)
    setDeleteConfirm(null)
    loadData()
  }

  const handleFinalize = async () => {
    await supabase.from('utility_statements').update({ status: 'finalized' }).eq('id', id)
    loadData()
  }

  // ─── Berechnungen ───────────────────────────────────────────────────────────
  const totalSqm = units.reduce((s: number, u: any) => s + (Number(u.size_sqm) || 0), 0)

  const getUnitShare = (item: any, unit: any): number => {
    const total = Number(item.total_amount)
    if (item.distribution_key === 'sqm') {
      return totalSqm > 0 ? (Number(unit.size_sqm) || 0) / totalSqm * total : 0
    } else if (item.distribution_key === 'equal') {
      return units.length > 0 ? total / units.length : 0
    } else if (item.distribution_key === 'per_unit') {
      return Number((item.unit_amounts || {})[unit.id] || 0)
    }
    return 0
  }

  const getContractForUnit = (unitId: string) =>
    contracts.find((c: any) => c.unit_id === unitId)

  const getPrepayments = (unit: any): number => {
    if (!statement || !unit.utilities_amount) return 0
    const contract = getContractForUnit(unit.id)
    if (!contract) return 0
    const year = statement.year
    const yearStart  = new Date(`${year}-01-01`)
    const yearEnd    = new Date(`${year}-12-31`)
    const start      = new Date(contract.start_date)
    const end        = contract.end_date ? new Date(contract.end_date) : yearEnd
    const effStart   = start > yearStart ? start : yearStart
    const effEnd     = end   < yearEnd   ? end   : yearEnd
    if (effStart > effEnd) return 0
    const months = Math.min(
      Math.round((effEnd.getTime() - effStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44)) + 1,
      12
    )
    return Number(unit.utilities_amount) * months
  }

  const getTotalAllocated = (unit: any) =>
    costItems.reduce((s: number, item: any) => s + getUnitShare(item, unit), 0)

  const totalCosts       = costItems.reduce((s: number, i: any) => s + Number(i.total_amount), 0)
  const totalPrepayments = units.reduce((s: number, u: any) => s + getPrepayments(u), 0)
  const totalBalance     = totalCosts - totalPrepayments

  const formatEur = (n: number) =>
    n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  const getCatLabel  = (v: string) => BETRKV_CATEGORIES.find((c: any) => c.value === v)?.label || v
  const getKeyLabel  = (v: string) => DISTRIBUTION_KEYS.find((d: any) => d.value === v)?.label || v

  // ─── Styles ─────────────────────────────────────────────────────────────────
  const card  = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '24px' }
  const inp   = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const lbl   = { fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  if (!statement) return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px' }}>
        <p style={{ color: '#999', fontSize: '14px' }}>Lade Abrechnung...</p>
      </div>
    </main>
  )

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px' }}>

        {/* ── Header ── */}
        <button onClick={() => router.push('/nebenkostenabrechnung')}
          style={{ background: 'none', border: 'none', color: '#888', fontSize: '13px', cursor: 'pointer', marginBottom: '24px', padding: 0 }}>
          ← Zurück zur Übersicht
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
              {statement.properties?.name} · {statement.year}
            </h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
              {statement.properties?.address}, {statement.properties?.city} · Abrechnungszeitraum 01.01.{statement.year} – 31.12.{statement.year}
            </p>
          </div>
          <span style={{
            fontSize: '11px', padding: '6px 14px', borderRadius: '20px', fontWeight: '500',
            color: statement.status === 'finalized' ? '#16a34a' : '#d97706',
            backgroundColor: statement.status === 'finalized' ? '#f0fdf4' : '#fffbeb',
          }}>
            {statement.status === 'finalized' ? 'Abgeschlossen' : 'Entwurf'}
          </span>
        </div>

        {/* ── Summary Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'Gesamtkosten', value: totalCosts, color: '#1a1a1a', sub: `${costItems.length} Positionen` },
            { label: 'Vorauszahlungen', value: totalPrepayments, color: '#1a1a1a', sub: 'aus Nebenkostenvorauszahlung' },
            { label: totalBalance > 0 ? 'Nachzahlung gesamt' : 'Guthaben gesamt', value: Math.abs(totalBalance), color: totalBalance > 0 ? '#dc2626' : '#16a34a', sub: totalBalance > 0 ? 'Mieter zahlen nach' : 'Mieter erhalten zurück' },
          ].map((s: any) => (
            <div key={s.label} style={card}>
              <p style={{ fontSize: '12px', color: '#999', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
              <p style={{ fontSize: '26px', fontWeight: '300', color: s.color, margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>{formatEur(s.value)}</p>
              <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Kostenpositionen ── */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#1a1a1a', margin: 0 }}>Kostenpositionen</h2>
            {!showAddForm && (
              <button onClick={() => setShowAddForm(true)}
                style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
                + Position hinzufügen
              </button>
            )}
          </div>

          {showAddForm && (
            <div style={{ ...card, marginBottom: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={lbl}>Kostenkategorie *</label>
                  <select value={newItem.category} onChange={e => handleCategoryChange(e.target.value)} style={inp}>
                    <option value="">Kategorie wählen...</option>
                    {BETRKV_CATEGORIES.map((cat: any) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Umlageschlüssel</label>
                  <select value={newItem.distribution_key}
                    onChange={e => setNewItem(prev => ({ ...prev, distribution_key: e.target.value }))} style={inp}>
                    {DISTRIBUTION_KEYS.map((dk: any) => (
                      <option key={dk.value} value={dk.value}>{dk.label}</option>
                    ))}
                  </select>
                </div>
                {newItem.distribution_key !== 'per_unit' && (
                  <div>
                    <label style={lbl}>Gesamtbetrag (€) *</label>
                    <input type="number" value={newItem.total_amount}
                      onChange={e => setNewItem(prev => ({ ...prev, total_amount: e.target.value }))}
                      placeholder="z.B. 1200.00" style={inp} />
                  </div>
                )}
                {newItem.category === 'sonstige' && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={lbl}>Beschreibung</label>
                    <input type="text" value={newItem.description}
                      onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="z.B. Wartung Heizungsanlage" style={inp} />
                  </div>
                )}
              </div>

              {newItem.distribution_key === 'per_unit' && (
                <div style={{ backgroundColor: '#fafaf8', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', color: '#999', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Betrag je Einheit (aus Ista/Techem-Abrechnung)
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {units.map((unit: any) => (
                      <div key={unit.id}>
                        <label style={{ fontSize: '13px', color: '#666', marginBottom: '4px', display: 'block' }}>{unit.name}</label>
                        <input type="number"
                          value={newItem.unit_amounts[unit.id] || ''}
                          onChange={e => handleUnitAmountChange(unit.id, e.target.value)}
                          placeholder="0.00" style={inp} />
                      </div>
                    ))}
                  </div>
                  {newItem.total_amount && (
                    <p style={{ fontSize: '13px', color: '#666', margin: '12px 0 0' }}>
                      Summe: <strong>{formatEur(parseFloat(newItem.total_amount) || 0)}</strong>
                    </p>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleAddItem}
                  disabled={saving || !newItem.category || !newItem.total_amount}
                  style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', opacity: saving || !newItem.category || !newItem.total_amount ? 0.4 : 1 }}>
                  {saving ? 'Speichern...' : 'Speichern'}
                </button>
                <button onClick={() => { setShowAddForm(false); setNewItem({ category: '', description: '', total_amount: '', distribution_key: 'sqm', unit_amounts: {} }) }}
                  style={{ backgroundColor: '#fff', color: '#666', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {costItems.length === 0 && !showAddForm ? (
            <div style={{ ...card, textAlign: 'center', padding: '40px' }}>
              <p style={{ fontSize: '14px', color: '#bbb', margin: 0 }}>Noch keine Kostenpositionen. Füge die erste Position hinzu.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {costItems.map((item: any) => (
                <div key={item.id} style={{ ...card, padding: '16px 24px' }}>
                  {deleteConfirm === item.id ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>Position wirklich löschen?</p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleDeleteItem(item.id)}
                          style={{ backgroundColor: '#dc2626', color: '#fff', padding: '6px 14px', borderRadius: '6px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
                          Ja, löschen
                        </button>
                        <button onClick={() => setDeleteConfirm(null)}
                          style={{ backgroundColor: '#fff', color: '#666', padding: '6px 14px', borderRadius: '6px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 2px' }}>
                          {getCatLabel(item.category)}
                          {item.description && <span style={{ color: '#999', fontWeight: '400' }}> · {item.description}</span>}
                        </p>
                        <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>{getKeyLabel(item.distribution_key)}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <p style={{ fontSize: '16px', fontWeight: '500', color: '#1a1a1a', margin: 0, fontFamily: 'Georgia, serif' }}>
                          {formatEur(Number(item.total_amount))}
                        </p>
                        <button onClick={() => setDeleteConfirm(item.id)}
                          style={{ backgroundColor: '#fff', color: '#dc2626', padding: '6px 12px', borderRadius: '6px', border: '1px solid #fecaca', fontSize: '12px', cursor: 'pointer' }}>
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

        {/* ── Ergebnisse pro Einheit ── */}
        {costItems.length > 0 && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>
              Ergebnis pro Einheit
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {units.map((unit: any) => {
                const contract    = getContractForUnit(unit.id)
                const allocated   = getTotalAllocated(unit)
                const prepayments = getPrepayments(unit)
                const balance     = allocated - prepayments
                const isNach      = balance > 0

                return (
                  <div key={unit.id} style={{ ...card, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 2px' }}>
                          {unit.name}
                          {unit.size_sqm && <span style={{ fontSize: '13px', color: '#999', fontWeight: '400' }}> · {unit.size_sqm} m²</span>}
                        </p>
                        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                          {contract ? contract.tenants?.full_name : '⚠ Kein aktiver Mieter – Kosten trägt Vermieter'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '32px', textAlign: 'right' }}>
                        <div>
                          <p style={{ fontSize: '11px', color: '#999', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Anteil</p>
                          <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: 0 }}>{formatEur(allocated)}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '11px', color: '#999', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vorauszahlung</p>
                          <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: 0 }}>− {formatEur(prepayments)}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '11px', color: '#999', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {isNach ? 'Nachzahlung' : 'Guthaben'}
                          </p>
                          <p style={{ fontSize: '22px', fontWeight: '500', color: isNach ? '#dc2626' : '#16a34a', margin: 0, fontFamily: 'Georgia, serif' }}>
                            {isNach ? '+' : '−'} {formatEur(Math.abs(balance))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {statement.status === 'draft' && (
              <div style={{ marginTop: '24px', padding: '20px 24px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#15803d', margin: '0 0 2px' }}>Abrechnung abschließen</p>
                  <p style={{ fontSize: '13px', color: '#16a34a', margin: 0 }}>Status auf "Abgeschlossen" setzen und PDF exportieren</p>
                </div>
                <button onClick={handleFinalize}
                  style={{ backgroundColor: '#16a34a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
                  ✓ Abrechnung abschließen
                </button>
              </div>
            )}

            {statement.status === 'finalized' && (
              <div style={{ marginTop: '24px', padding: '20px 24px', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#1d4ed8', margin: '0 0 2px' }}>PDF-Export</p>
                  <p style={{ fontSize: '13px', color: '#3b82f6', margin: 0 }}>Abrechnungsdokument pro Mieter generieren</p>
                </div>
                <button disabled
                  style={{ backgroundColor: '#3b82f6', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'not-allowed', opacity: 0.5 }}>
                  📄 PDF exportieren (Etappe 3)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}