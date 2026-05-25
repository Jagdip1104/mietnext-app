'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Nav from '@/components/Nav'

const BETRKV_CATEGORIES = [
  { value: 'grundsteuer',        label: '§2 Nr.1  – Grundsteuer',                            defaultKey: 'sqm'      },
  { value: 'wasser',             label: '§2 Nr.2  – Wasserversorgung',                        defaultKey: 'sqm'      },
  { value: 'entwasserung',       label: '§2 Nr.3  – Entwässerung / Abwasser',                 defaultKey: 'sqm'      },
  { value: 'heizung',            label: '§2 Nr.4  – Heizkosten (Ista/Techem)',                defaultKey: 'per_unit' },
  { value: 'warmwasser',         label: '§2 Nr.5  – Warmwasser (Ista/Techem)',                defaultKey: 'per_unit' },
  { value: 'heizung_warmwasser', label: '§2 Nr.6  – Heizung + Warmwasser (verbunden)',        defaultKey: 'per_unit' },
  { value: 'aufzug',             label: '§2 Nr.7  – Aufzug',                                  defaultKey: 'equal'    },
  { value: 'strassenreinigung',  label: '§2 Nr.8  – Straßenreinigung / Müllbeseitigung',      defaultKey: 'sqm'      },
  { value: 'gebaeudereinigung',  label: '§2 Nr.9  – Gebäudereinigung / Ungezieferbekämpfung', defaultKey: 'sqm'      },
  { value: 'gartenpflege',       label: '§2 Nr.10 – Gartenpflege',                            defaultKey: 'sqm'      },
  { value: 'allgemeinstrom',     label: '§2 Nr.11 – Allgemeinstrom / Beleuchtung',             defaultKey: 'equal'    },
  { value: 'schornstein',        label: '§2 Nr.12 – Schornsteinreinigung',                    defaultKey: 'equal'    },
  { value: 'versicherung',       label: '§2 Nr.13 – Sach- und Haftpflichtversicherung',       defaultKey: 'sqm'      },
  { value: 'hauswart',           label: '§2 Nr.14 – Hauswart / Hausmeister',                  defaultKey: 'sqm'      },
  { value: 'antenne',            label: '§2 Nr.15 – Gemeinschaftsantenne / Kabel / Internet', defaultKey: 'equal'    },
  { value: 'waeschepflege',      label: '§2 Nr.16 – Wäschepflege-Einrichtungen',              defaultKey: 'equal'    },
  { value: 'sonstige',           label: '§2 Nr.17 – Sonstige Betriebskosten',                 defaultKey: 'sqm'      },
]

const DISTRIBUTION_KEYS = [
  { value: 'sqm',      label: 'Nach Wohnfläche m²'                          },
  { value: 'equal',    label: 'Gleichmäßig pro Einheit'                     },
  { value: 'per_unit', label: 'Einzelbeträge je Einheit (z.B. Ista/Techem)' },
]

export default function NebenkostenabrechnungDetail() {
  const router = useRouter()
  const params = useParams()
  const id     = params?.id as string

  const [statement, setStatement]             = useState<any>(null)
  const [units, setUnits]                     = useState<any[]>([])
  const [contracts, setContracts]             = useState<any[]>([])
  const [costItems, setCostItems]             = useState<any[]>([])
  const [showAddForm, setShowAddForm]         = useState(false)
  const [deleteConfirm, setDeleteConfirm]     = useState<string | null>(null)
  const [saving, setSaving]                   = useState(false)
  const [pdfLoading, setPdfLoading]           = useState(false)
  const [manualPrepayments, setManualPrepayments] = useState<Record<string, number | null>>({})
  const [editingPrepayment, setEditingPrepayment] = useState<string | null>(null)
  const [editPrepaymentValue, setEditPrepaymentValue] = useState('')
  const [newItem, setNewItem] = useState({
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
    setManualPrepayments(stmt?.manual_prepayments || {})
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
    const total   = Object.values(updated).reduce((s: number, v: any) => s + (parseFloat(v) || 0), 0)
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
    if (newItem.distribution_key === 'per_unit') itemData.unit_amounts = newItem.unit_amounts
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

  const handleReopen = async () => {
    await supabase.from('utility_statements').update({ status: 'draft' }).eq('id', id)
    loadData()
  }

  const handleDeleteStatement = async () => {
    const { error } = await supabase.from('utility_statements').delete().eq('id', id)
    if (error) { alert('Fehler: ' + error.message); return }
    router.push('/nebenkostenabrechnung')
  }

  // ─── Manuelle Vorauszahlung speichern ───────────────────────────────────────
  const saveManualPrepayment = async (unitId: string) => {
    const value   = parseFloat(editPrepaymentValue)
    const updated = { ...manualPrepayments, [unitId]: isNaN(value) ? null : value }
    await supabase.from('utility_statements').update({ manual_prepayments: updated }).eq('id', id)
    setManualPrepayments(updated)
    setEditingPrepayment(null)
    setEditPrepaymentValue('')
  }

  const resetManualPrepayment = async (unitId: string) => {
    const updated = { ...manualPrepayments }
    delete updated[unitId]
    await supabase.from('utility_statements').update({ manual_prepayments: updated }).eq('id', id)
    setManualPrepayments(updated)
  }

  // ─── Berechnungen ────────────────────────────────────────────────────────────
  const totalSqm = units.reduce((s: number, u: any) => s + (Number(u.size_sqm) || 0), 0)

  const getUnitShare = (item: any, unit: any): number => {
    const total = Number(item.total_amount)
    if (item.distribution_key === 'sqm')      return totalSqm > 0 ? (Number(unit.size_sqm) || 0) / totalSqm * total : 0
    if (item.distribution_key === 'equal')    return units.length > 0 ? total / units.length : 0
    if (item.distribution_key === 'per_unit') return Number((item.unit_amounts || {})[unit.id] || 0)
    return 0
  }

  const getContractForUnit = (unitId: string) => contracts.find((c: any) => c.unit_id === unitId)

  // Berechnet Soll-Vorauszahlung aus Vertrag
  const getCalculatedPrepayments = (unit: any): number => {
    if (!statement || !unit.utilities_amount) return 0
    const contract = getContractForUnit(unit.id)
    if (!contract) return 0
    const year      = statement.year
    const yearStart = new Date(`${year}-01-01`)
    const yearEnd   = new Date(`${year}-12-31`)
    const start     = new Date(contract.start_date)
    const end       = contract.end_date ? new Date(contract.end_date) : yearEnd
    const effStart  = start > yearStart ? start : yearStart
    const effEnd    = end   < yearEnd   ? end   : yearEnd
    if (effStart > effEnd) return 0
    const months = Math.min(Math.round((effEnd.getTime() - effStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44)) + 1, 12)
    return Number(unit.utilities_amount) * months
  }

  // Gibt manuelle Überschreibung zurück, sonst Soll-Berechnung
  const getPrepayments = (unit: any): number => {
    const manual = manualPrepayments[unit.id]
    if (manual !== undefined && manual !== null) return Number(manual)
    return getCalculatedPrepayments(unit)
  }

  const isManuallySet = (unitId: string) =>
    manualPrepayments[unitId] !== undefined && manualPrepayments[unitId] !== null

  const getTotalAllocated = (unit: any) =>
    costItems.reduce((s: number, item: any) => s + getUnitShare(item, unit), 0)

  const totalCosts       = costItems.reduce((s: number, i: any) => s + Number(i.total_amount), 0)
  const totalPrepayments = units.reduce((s: number, u: any) => s + getPrepayments(u), 0)
  const totalBalance     = totalCosts - totalPrepayments

  const formatEur   = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  const getCatLabel = (v: string) => BETRKV_CATEGORIES.find((c: any) => c.value === v)?.label || v
  const getKeyLabel = (v: string) => DISTRIBUTION_KEYS.find((d: any) => d.value === v)?.label || v

  // ─── PDF Export ──────────────────────────────────────────────────────────────
  const generatePDF = async () => {
    setPdfLoading(true)
    try {
      const { jsPDF }   = await import('jspdf')
      const doc         = new jsPDF({ unit: 'mm', format: 'a4' })
      const activeUnits = units.filter((u: any) => getContractForUnit(u.id))

      if (activeUnits.length === 0) {
        alert('Keine Mieter für den Abrechnungszeitraum gefunden.')
        setPdfLoading(false)
        return
      }

      activeUnits.forEach((unit: any, pageIndex: number) => {
        if (pageIndex > 0) doc.addPage()

        const contract  = getContractForUnit(unit.id)
        const allocated = getTotalAllocated(unit)
        const prepays   = getPrepayments(unit)
        const balance   = allocated - prepays
        const isNach    = balance > 0
        const prop      = statement.properties
        const tenant    = contract?.tenants
        const isManual  = isManuallySet(unit.id)

        doc.setFillColor(26, 26, 26)
        doc.rect(0, 0, 210, 20, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(255, 255, 255)
        doc.text('MietNext', 20, 13)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.text('Nebenkostenabrechnung', 190, 13, { align: 'right' })

        doc.setTextColor(26, 26, 26)
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.text(`Nebenkostenabrechnung ${statement.year}`, 105, 35, { align: 'center' })
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(120, 120, 120)
        doc.text(`Abrechnungszeitraum: 01.01.${statement.year} – 31.12.${statement.year}`, 105, 43, { align: 'center' })
        doc.setDrawColor(220, 218, 214)
        doc.setLineWidth(0.4)
        doc.line(20, 48, 190, 48)

        doc.setFontSize(7.5)
        doc.setTextColor(150, 150, 150)
        doc.setFont('helvetica', 'bold')
        doc.text('OBJEKT', 20, 56)
        doc.text('MIETER', 115, 56)
        doc.setFontSize(11)
        doc.setTextColor(26, 26, 26)
        doc.setFont('helvetica', 'bold')
        doc.text(prop?.name || '', 20, 63)
        doc.text(tenant?.full_name || '', 115, 63)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9.5)
        doc.setTextColor(100, 100, 100)
        doc.text(`${prop?.address}, ${prop?.city}`, 20, 69)
        doc.text(`Einheit: ${unit.name}${unit.size_sqm ? ` · ${unit.size_sqm} m²` : ''}`, 115, 69)

        let y = 83
        doc.setFillColor(245, 244, 241)
        doc.rect(20, y - 5, 170, 8, 'F')
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(26, 26, 26)
        doc.text('Kostenposition', 22, y)
        doc.text('Gesamtkosten', 130, y, { align: 'right' })
        doc.text('Ihr Anteil', 190, y, { align: 'right' })
        y += 5

        costItems.forEach((item: any) => {
          const share = getUnitShare(item, unit)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(30, 30, 30)
          const label = getCatLabel(item.category)
          doc.text(label.length > 55 ? label.slice(0, 52) + '…' : label, 22, y)
          doc.setTextColor(120, 120, 120)
          doc.text(formatEur(Number(item.total_amount)), 130, y, { align: 'right' })
          doc.setTextColor(30, 30, 30)
          doc.text(formatEur(share), 190, y, { align: 'right' })
          y += 7
          doc.setDrawColor(240, 238, 234)
          doc.setLineWidth(0.2)
          doc.line(20, y - 3, 190, y - 3)
        })

        y += 4
        doc.setDrawColor(180, 178, 174)
        doc.setLineWidth(0.4)
        doc.line(20, y, 190, y)
        y += 8

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text('Gesamtkosten Ihr Anteil:', 22, y)
        doc.setTextColor(26, 26, 26)
        doc.text(formatEur(allocated), 190, y, { align: 'right' })
        y += 7

        doc.setTextColor(100, 100, 100)
        doc.text(`Geleistete Vorauszahlungen${isManual ? ' (tatsächlich)' : ''}:`, 22, y)
        doc.setTextColor(26, 26, 26)
        doc.text(`− ${formatEur(prepays)}`, 190, y, { align: 'right' })
        y += 5

        doc.setDrawColor(26, 26, 26)
        doc.setLineWidth(0.8)
        doc.line(20, y, 190, y)
        y += 10

        const [r, g, b] = isNach ? [185, 28, 28] : [21, 128, 61]
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(80, 80, 80)
        doc.text(isNach ? 'NACHZAHLUNG:' : 'GUTHABEN:', 22, y)
        doc.setTextColor(r, g, b)
        doc.text(`${isNach ? '+' : '−'} ${formatEur(Math.abs(balance))}`, 190, y, { align: 'right' })
        y += 9

        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(160, 160, 160)
        doc.text(
          isNach
            ? 'Bitte überweisen Sie den Nachzahlungsbetrag innerhalb von 30 Tagen nach Erhalt dieser Abrechnung.'
            : 'Der Guthabenbetrag wird mit der nächsten Mietzahlung verrechnet oder auf Wunsch überwiesen.',
          22, y
        )

        doc.setDrawColor(220, 218, 214)
        doc.setLineWidth(0.3)
        doc.line(20, 275, 190, 275)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(160, 160, 160)
        doc.text(`Erstellt am ${new Date().toLocaleDateString('de-DE')} · MietNext`, 20, 281)
        doc.text(`Seite ${pageIndex + 1} von ${activeUnits.length}`, 190, 281, { align: 'right' })
      })

      const safeName = (statement.properties?.name || 'Objekt').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
      doc.save(`NK_${safeName}_${statement.year}.pdf`)

    } catch (err: any) {
      alert('PDF-Fehler: ' + err.message)
    }
    setPdfLoading(false)
  }

  // ─── Styles ──────────────────────────────────────────────────────────────────
  const card = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '24px' }
  const inp  = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const lbl  = { fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  if (!statement) return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div className="max-w-[900px] mx-auto px-5 py-8 md:px-12 md:py-12 pb-24 md:pb-12">
        <p style={{ color: '#999', fontSize: '14px' }}>Lade Abrechnung...</p>
      </div>
    </main>
  )

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div className="max-w-[900px] mx-auto px-5 py-8 md:px-12 md:py-12 pb-24 md:pb-12">

        <button onClick={() => router.push('/nebenkostenabrechnung')}
          style={{ background: 'none', border: 'none', color: '#888', fontSize: '13px', cursor: 'pointer', marginBottom: '24px', padding: 0 }}>
          ← Zurück zur Übersicht
        </button>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
              {statement.properties?.name} · {statement.year}
            </h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
              {statement.properties?.address}, {statement.properties?.city} · 01.01.{statement.year} – 31.12.{statement.year}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-[32px]">
          {([
            { label: 'Gesamtkosten',    value: totalCosts,       color: '#1a1a1a', sub: `${costItems.length} Positionen`          },
            { label: 'Vorauszahlungen', value: totalPrepayments, color: '#1a1a1a', sub: 'geleistete Vorauszahlungen'              },
            { label: totalBalance > 0 ? 'Nachzahlung gesamt' : 'Guthaben gesamt',
              value: Math.abs(totalBalance),
              color: totalBalance > 0 ? '#dc2626' : '#16a34a',
              sub: totalBalance > 0 ? 'Mieter zahlen nach' : 'Mieter erhalten zurück' },
          ] as any[]).map((s: any) => (
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-[16px]">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {units.map((unit: any) => (
                      <div key={unit.id}>
                        <label style={{ fontSize: '13px', color: '#666', marginBottom: '4px', display: 'block' }}>{unit.name}</label>
                        <input type="number" value={newItem.unit_amounts[unit.id] || ''}
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
                <button onClick={handleAddItem} disabled={saving || !newItem.category || !newItem.total_amount}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#1a1a1a', margin: 0 }}>Ergebnis pro Einheit</h2>
              <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>✏️ Vorauszahlungen anpassen falls abweichend</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {units.map((unit: any) => {
                const contract      = getContractForUnit(unit.id)
                const allocated     = getTotalAllocated(unit)
                const prepayments   = getPrepayments(unit)
                const calculated    = getCalculatedPrepayments(unit)
                const balance       = allocated - prepayments
                const isNach        = balance > 0
                const isManual      = isManuallySet(unit.id)
                const isEditing     = editingPrepayment === unit.id

                return (
                  <div key={unit.id} style={{ ...card, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 2px' }}>
                          {unit.name}
                          {unit.size_sqm && <span style={{ fontSize: '13px', color: '#999', fontWeight: '400' }}> · {unit.size_sqm} m²</span>}
                        </p>
                        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                          {contract ? contract.tenants?.full_name : '⚠ Kein aktiver Mieter – Kosten trägt Vermieter'}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                        {/* Anteil */}
                        <div style={{ textAlign: 'right' as const }}>
                          <p style={{ fontSize: '11px', color: '#999', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Anteil Kosten</p>
                          <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: 0 }}>{formatEur(allocated)}</p>
                        </div>

                        {/* Vorauszahlung – editierbar */}
                        <div style={{ textAlign: 'right' as const }}>
                          <p style={{ fontSize: '11px', color: '#999', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Vorauszahlung
                            {isManual && <span style={{ color: '#d97706', marginLeft: '4px' }}>● manuell</span>}
                          </p>
                          {isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="number"
                                value={editPrepaymentValue}
                                onChange={e => setEditPrepaymentValue(e.target.value)}
                                placeholder={calculated.toFixed(2)}
                                autoFocus
                                style={{ width: '100px', border: '1px solid #e8e6e0', borderRadius: '6px', padding: '4px 8px', fontSize: '13px', outline: 'none', textAlign: 'right' as const }}
                              />
                              <button onClick={() => saveManualPrepayment(unit.id)}
                                style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '4px 10px', borderRadius: '6px', border: 'none', fontSize: '12px', cursor: 'pointer' }}>
                                ✓
                              </button>
                              <button onClick={() => { setEditingPrepayment(null); setEditPrepaymentValue('') }}
                                style={{ backgroundColor: '#fff', color: '#666', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e8e6e0', fontSize: '12px', cursor: 'pointer' }}>
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: 0 }}>
                                − {formatEur(prepayments)}
                              </p>
                              <button
                                onClick={() => { setEditingPrepayment(unit.id); setEditPrepaymentValue(prepayments.toString()) }}
                                title="Vorauszahlung manuell anpassen"
                                style={{ background: 'none', border: 'none', color: '#bbb', fontSize: '14px', cursor: 'pointer', padding: '0 2px' }}>
                                ✏️
                              </button>
                              {isManual && (
                                <button onClick={() => resetManualPrepayment(unit.id)}
                                  title="Zurück zur Berechnung"
                                  style={{ background: 'none', border: 'none', color: '#bbb', fontSize: '12px', cursor: 'pointer', padding: '0 2px' }}>
                                  ↩
                                </button>
                              )}
                            </div>
                          )}
                          {isManual && !isEditing && (
                            <p style={{ fontSize: '11px', color: '#bbb', margin: '2px 0 0' }}>
                              berechnet: {formatEur(calculated)}
                            </p>
                          )}
                        </div>

                        {/* Ergebnis */}
                        <div style={{ textAlign: 'right' as const }}>
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

            {/* ── Aktionen ── */}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {statement.status === 'draft' && (
                <div style={{ padding: '20px 24px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#15803d', margin: '0 0 2px' }}>Abrechnung abschließen</p>
                    <p style={{ fontSize: '13px', color: '#16a34a', margin: 0 }}>Status auf "Abgeschlossen" – danach PDF exportieren</p>
                  </div>
                  <button onClick={handleFinalize}
                    style={{ backgroundColor: '#16a34a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
                    ✓ Abrechnung abschließen
                  </button>
                </div>
              )}

              {statement.status === 'finalized' && (
                <>
                  <div style={{ padding: '20px 24px', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#1d4ed8', margin: '0 0 2px' }}>PDF-Export</p>
                      <p style={{ fontSize: '13px', color: '#3b82f6', margin: 0 }}>Eine Seite pro Mieter mit allen Kostenpositionen und Ergebnis</p>
                    </div>
                    <button onClick={generatePDF} disabled={pdfLoading}
                      style={{ backgroundColor: '#3b82f6', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: pdfLoading ? 'wait' : 'pointer', opacity: pdfLoading ? 0.7 : 1 }}>
                      {pdfLoading ? '⏳ PDF wird erstellt...' : '📄 PDF exportieren'}
                    </button>
                  </div>
                  <div style={{ padding: '16px 24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e8e6e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>Abrechnung wieder bearbeiten (zurück auf Entwurf)</p>
                    <button onClick={handleReopen}
                      style={{ backgroundColor: '#fff', color: '#d97706', padding: '8px 16px', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '13px', cursor: 'pointer' }}>
                      ↩ Wieder öffnen
                    </button>
                  </div>
                </>
              )}

              <div style={{ padding: '16px 24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>Abrechnung und alle Kostenpositionen unwiderruflich löschen</p>
                <button onClick={handleDeleteStatement}
                  style={{ backgroundColor: '#fff', color: '#dc2626', padding: '8px 16px', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '13px', cursor: 'pointer' }}>
                  Abrechnung löschen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}