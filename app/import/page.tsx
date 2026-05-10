'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import * as XLSX from 'xlsx'

interface ImportRow {
  rowNum: number
  // Property
  property: string
  street: string
  zip: string
  city: string
  yearBuilt: number | null
  // Unit
  unit: string
  floor: string
  sizeSqm: number | null
  rooms: number | null
  type: string
  usageType: string
  parkingType: string
  rentAmount: number | null
  utilities: number | null
  vatApplicable: boolean | null
  vatRate: number | null
  notes: string
  // Tenant
  tenantName: string
  tenantEmail: string
  tenantPhone: string
  errors: string[]
}

interface PreviewStats {
  totalRows: number
  validRows: number
  invalidRows: number
  uniqueProperties: number
  totalUnits: number
  totalTenants: number
  totalKaltmiete: number
  totalNebenkosten: number
}

interface ImportResult {
  propertiesAdded: number
  propertiesReused: number
  unitsAdded: number
  tenantsAdded: number
  rowsSkipped: number
  errors: string[]
}

export default function Import() {
  const [userId, setUserId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [stats, setStats] = useState<PreviewStats | null>(null)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
    }
    check()
  }, [])

  // Smart-Mapping: alle möglichen Spaltennamen-Varianten
  const columnMap: { [key: string]: string[] } = {
    property: ['objekt', 'objekt *', 'haus', 'gebäude', 'property'],
    street: ['straße', 'strasse', 'str', 'street', 'address', 'adresse'],
    zip: ['plz', 'postleitzahl', 'zip', 'postal'],
    city: ['stadt', 'ort', 'city'],
    yearBuilt: ['baujahr', 'jahr', 'year', 'year built'],
    unit: ['einheit', 'einheit *', 'wohnung', 'unit'],
    floor: ['stockwerk', 'etage', 'floor', 'geschoss'],
    sizeSqm: ['fläche', 'fläche m²', 'flaeche', 'qm', 'wohnfläche', 'size'],
    rooms: ['zimmer', 'rooms', 'räume'],
    type: ['typ', 'type', 'art'],
    usageType: ['nutzungsart', 'nutzung', 'usage'],
    parkingType: ['stellplatz', 'parkplatz', 'parking', 'garage'],
    rentAmount: ['kaltmiete', 'kaltmiete €', 'miete', 'rent', 'nettomiete'],
    utilities: ['nebenkosten', 'nebenkosten €', 'nk', 'utilities'],
    vatApplicable: ['mwst-pflichtig', 'mwst pflichtig', 'umsatzsteuerpflichtig', 'vat applicable'],
    vatRate: ['mwst', 'mwst %', 'ust', 'vat', 'mehrwertsteuer'],
    notes: ['notizen', 'notiz', 'bemerkung', 'notes'],
    tenantName: ['mieter name', 'mieter', 'name'],
    tenantEmail: ['mieter e-mail', 'e-mail', 'email', 'mail'],
    tenantPhone: ['mieter telefon', 'telefon', 'phone', 'tel']
  }

  const findColumn = (headers: string[], targetField: string): string | null => {
    const candidates = columnMap[targetField] || []
    const lowerHeaders = headers.map(h => String(h || '').toLowerCase().trim())
    for (const candidate of candidates) {
      const idx = lowerHeaders.indexOf(candidate.toLowerCase())
      if (idx >= 0) return headers[idx]
    }
    return null
  }

  const toNumber = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null
    const num = parseFloat(String(val).replace(',', '.'))
    return isNaN(num) ? null : num
  }

  const toBool = (val: any): boolean | null => {
    if (val === null || val === undefined || val === '') return null
    const s = String(val).toLowerCase().trim()
    if (['ja', 'yes', '1', 'true', 'wahr', 'x'].includes(s)) return true
    if (['nein', 'no', '0', 'false', 'falsch'].includes(s)) return false
    return null
  }

  const handleFile = async (selectedFile: File) => {
    setError('')
    setRows([])
    setStats(null)
    setResult(null)

    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Bitte eine Excel- oder CSV-Datei hochladen (.xlsx, .xls, .csv)')
      return
    }

    setFile(selectedFile)
    setParsing(true)

    try {
      const buffer = await selectedFile.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })

      let sheetName = wb.SheetNames[0]
      for (const name of wb.SheetNames) {
        if (!name.toLowerCase().includes('anleitung') && !name.toLowerCase().includes('hilfe')) {
          sheetName = name
          break
        }
      }

      const ws = wb.Sheets[sheetName]
      const jsonData: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

      if (jsonData.length === 0) {
        setError('Keine Daten in der Excel-Datei gefunden. Bitte die Vorlage verwenden.')
        setParsing(false)
        return
      }

      if (jsonData.length > 500) {
        setError(`Maximal 500 Zeilen pro Upload erlaubt. Deine Datei hat ${jsonData.length} Zeilen. Bitte aufteilen.`)
        setParsing(false)
        return
      }

      const headers = Object.keys(jsonData[0])
      const propertyCol = findColumn(headers, 'property')
      const unitCol = findColumn(headers, 'unit')

      if (!propertyCol || !unitCol) {
        setError('Pflichtspalten "Objekt" und "Einheit" nicht gefunden. Bitte die Vorlage verwenden.')
        setParsing(false)
        return
      }

      // Alle Spalten mappen
      const cols = {
        property: propertyCol,
        street: findColumn(headers, 'street'),
        zip: findColumn(headers, 'zip'),
        city: findColumn(headers, 'city'),
        yearBuilt: findColumn(headers, 'yearBuilt'),
        unit: unitCol,
        floor: findColumn(headers, 'floor'),
        sizeSqm: findColumn(headers, 'sizeSqm'),
        rooms: findColumn(headers, 'rooms'),
        type: findColumn(headers, 'type'),
        usageType: findColumn(headers, 'usageType'),
        parkingType: findColumn(headers, 'parkingType'),
        rentAmount: findColumn(headers, 'rentAmount'),
        utilities: findColumn(headers, 'utilities'),
        vatApplicable: findColumn(headers, 'vatApplicable'),
        vatRate: findColumn(headers, 'vatRate'),
        notes: findColumn(headers, 'notes'),
        tenantName: findColumn(headers, 'tenantName'),
        tenantEmail: findColumn(headers, 'tenantEmail'),
        tenantPhone: findColumn(headers, 'tenantPhone')
      }

      const get = (raw: any, col: string | null) =>
        col ? String(raw[col] || '').trim() : ''

      const parsedRows: ImportRow[] = jsonData.map((raw, idx) => {
        const errors: string[] = []
        const property = get(raw, cols.property)
        const unit = get(raw, cols.unit)

        if (!property) errors.push('Objekt fehlt')
        if (!unit) errors.push('Einheit fehlt')

        const tenantEmail = get(raw, cols.tenantEmail).toLowerCase()
        if (tenantEmail && !tenantEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          errors.push('Ungültige E-Mail')
        }

        return {
          rowNum: idx + 2,
          property,
          street: get(raw, cols.street),
          zip: get(raw, cols.zip),
          city: get(raw, cols.city),
          yearBuilt: toNumber(cols.yearBuilt ? raw[cols.yearBuilt] : ''),
          unit,
          floor: get(raw, cols.floor),
          sizeSqm: toNumber(cols.sizeSqm ? raw[cols.sizeSqm] : ''),
          rooms: toNumber(cols.rooms ? raw[cols.rooms] : ''),
          type: get(raw, cols.type),
          usageType: get(raw, cols.usageType),
          parkingType: get(raw, cols.parkingType),
          rentAmount: toNumber(cols.rentAmount ? raw[cols.rentAmount] : ''),
          utilities: toNumber(cols.utilities ? raw[cols.utilities] : ''),
          vatApplicable: toBool(cols.vatApplicable ? raw[cols.vatApplicable] : ''),
          vatRate: toNumber(cols.vatRate ? raw[cols.vatRate] : ''),
          notes: get(raw, cols.notes),
          tenantName: get(raw, cols.tenantName),
          tenantEmail,
          tenantPhone: get(raw, cols.tenantPhone),
          errors
        }
      })

      const validRows = parsedRows.filter(r => r.errors.length === 0)
      const uniqueProperties = new Set(validRows.map(r => r.property)).size
      const totalUnits = validRows.length
      const totalTenants = validRows.filter(r => r.tenantName).length
      const totalKaltmiete = validRows.reduce((sum, r) => sum + (r.rentAmount || 0), 0)
      const totalNebenkosten = validRows.reduce((sum, r) => sum + (r.utilities || 0), 0)

      setRows(parsedRows)
      setStats({
        totalRows: parsedRows.length,
        validRows: validRows.length,
        invalidRows: parsedRows.length - validRows.length,
        uniqueProperties,
        totalUnits,
        totalTenants,
        totalKaltmiete,
        totalNebenkosten
      })
    } catch (err: any) {
      setError('Fehler beim Lesen der Datei: ' + err.message)
    }
    setParsing(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleReset = () => {
    setFile(null)
    setRows([])
    setStats(null)
    setError('')
    setResult(null)
  }

  // ============================================
  // ECHTE IMPORT-LOGIK
  // ============================================
  const handleImport = async () => {
    if (!userId) return
    const validRows = rows.filter(r => r.errors.length === 0)
    if (validRows.length === 0) return

    setImporting(true)
    setError('')

    const importErrors: string[] = []
    const createdPropertyIds: string[] = []
    const createdUnitIds: string[] = []
    const createdTenantIds: string[] = []
    let propertiesAdded = 0
    let propertiesReused = 0
    let unitsAdded = 0
    let tenantsAdded = 0

    try {
      // 1) Bestehende Objekte des Owners laden (für Duplikat-Check)
      const { data: existingProps } = await supabase
        .from('properties').select('id, name').eq('owner_id', userId)
      const propertyMap = new Map<string, string>()
      ;(existingProps || []).forEach((p: any) => propertyMap.set(p.name.toLowerCase(), p.id))

      // 2) Neue eindeutige Objekte sammeln
      const seenInImport = new Set<string>()
      const propsToInsert: any[] = []
      for (const row of validRows) {
        const key = row.property.toLowerCase()
        if (propertyMap.has(key)) {
          if (!seenInImport.has(key)) {
            propertiesReused++
            seenInImport.add(key)
          }
        } else if (!seenInImport.has(key)) {
          seenInImport.add(key)
          propsToInsert.push({
            name: row.property,
            address: row.street || null,
            zip: row.zip || null,
            city: row.city || null,
            year_built: row.yearBuilt,
            owner_id: userId
          })
        }
      }

      // 3) Neue Objekte einfügen
      if (propsToInsert.length > 0) {
        const { data: insertedProps, error: propsError } = await supabase
          .from('properties').insert(propsToInsert).select('id, name')
        if (propsError) throw new Error('Objekte: ' + propsError.message)
        ;(insertedProps || []).forEach((p: any) => {
          propertyMap.set(p.name.toLowerCase(), p.id)
          createdPropertyIds.push(p.id)
          propertiesAdded++
        })
      }

      // 4) Einheiten anlegen
      const unitsToInsert = validRows.map(row => ({
        property_id: propertyMap.get(row.property.toLowerCase()),
        name: row.unit,
        floor: row.floor || null,
        size_sqm: row.sizeSqm,
        rooms: row.rooms,
        type: row.type || null,
        usage_type: row.usageType || null,
        parking_type: row.parkingType || null,
        rent_amount: row.rentAmount,
        utilities_amount: row.utilities,
        vat_applicable: row.vatApplicable,
        vat_rate: row.vatRate,
        notes: row.notes || null,
        is_occupied: !!row.tenantName
      }))

      const { data: insertedUnits, error: unitsError } = await supabase
        .from('units').insert(unitsToInsert).select('id, name, property_id')
      if (unitsError) throw new Error('Einheiten: ' + unitsError.message)

      const unitMap = new Map<string, string>()
      ;(insertedUnits || []).forEach((u: any) => {
        unitMap.set(`${u.property_id}-${u.name.toLowerCase()}`, u.id)
        createdUnitIds.push(u.id)
        unitsAdded++
      })

      // 5) Mieter anlegen (nur wenn Name vorhanden)
      const tenantsToInsert = validRows
        .filter(row => row.tenantName)
        .map(row => {
          const propertyId = propertyMap.get(row.property.toLowerCase())
          const unitId = unitMap.get(`${propertyId}-${row.unit.toLowerCase()}`)
          return {
            full_name: row.tenantName,
            email: row.tenantEmail || null,
            phone: row.tenantPhone || null,
            unit_id: unitId || null,
            owner_id: userId
          }
        })

      if (tenantsToInsert.length > 0) {
        const { data: insertedTenants, error: tenantsError } = await supabase
          .from('tenants').insert(tenantsToInsert).select('id')
        if (tenantsError) {
          importErrors.push('Manche Mieter konnten nicht angelegt werden: ' + tenantsError.message)
        } else {
          ;(insertedTenants || []).forEach((t: any) => {
            createdTenantIds.push(t.id)
            tenantsAdded++
          })
        }
      }

      // 6) Audit-Log
      await supabase.from('imports').insert({
        owner_id: userId,
        filename: file?.name || 'unbekannt',
        properties_added: propertiesAdded,
        units_added: unitsAdded,
        tenants_added: tenantsAdded,
        rows_skipped: rows.length - validRows.length,
        errors: importErrors.length > 0 ? importErrors : null,
        property_ids: createdPropertyIds,
        unit_ids: createdUnitIds,
        tenant_ids: createdTenantIds
      })

      setResult({
        propertiesAdded,
        propertiesReused,
        unitsAdded,
        tenantsAdded,
        rowsSkipped: rows.length - validRows.length,
        errors: importErrors
      })
    } catch (err: any) {
      setError('Import fehlgeschlagen: ' + err.message)
    }

    setImporting(false)
  }

  const formatEur = (val: number) => val.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  const card = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '24px' }

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
            Import
          </h1>
          <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
            Lade alle Objekte, Einheiten und Mieter per Excel auf einmal hoch
          </p>
        </div>

        {/* Erfolgs-Übersicht nach Import */}
        {result && (
          <div style={{ ...card, marginBottom: '16px', borderLeft: '4px solid #16a34a' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '500', color: '#16a34a', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>
              ✓ Import erfolgreich!
            </h2>
            <p style={{ fontSize: '14px', color: '#666', margin: '0 0 20px' }}>
              Datei <strong>{file?.name}</strong> wurde verarbeitet.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#f0fdf4', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '11px', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Neue Objekte</p>
                <p style={{ fontSize: '24px', color: '#16a34a', fontWeight: '300', fontFamily: 'Georgia, serif', margin: 0 }}>{result.propertiesAdded}</p>
                {result.propertiesReused > 0 && (
                  <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0' }}>+{result.propertiesReused} bestehende</p>
                )}
              </div>
              <div style={{ backgroundColor: '#eff6ff', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '11px', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Neue Einheiten</p>
                <p style={{ fontSize: '24px', color: '#2563eb', fontWeight: '300', fontFamily: 'Georgia, serif', margin: 0 }}>{result.unitsAdded}</p>
              </div>
              <div style={{ backgroundColor: '#fffbeb', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '11px', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Neue Mieter</p>
                <p style={{ fontSize: '24px', color: '#d97706', fontWeight: '300', fontFamily: 'Georgia, serif', margin: 0 }}>{result.tenantsAdded}</p>
              </div>
              <div style={{ backgroundColor: result.rowsSkipped > 0 ? '#fef2f2' : '#fafaf8', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '11px', color: result.rowsSkipped > 0 ? '#dc2626' : '#999', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Übersprungen</p>
                <p style={{ fontSize: '24px', color: result.rowsSkipped > 0 ? '#dc2626' : '#bbb', fontWeight: '300', fontFamily: 'Georgia, serif', margin: 0 }}>{result.rowsSkipped}</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: '#dc2626', margin: 0, fontWeight: '500' }}>Hinweise:</p>
                <ul style={{ fontSize: '13px', color: '#dc2626', margin: '4px 0 0', paddingLeft: '20px' }}>
                  {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => router.push('/properties')}
                style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
                Zu meinen Objekten →
              </button>
              <button onClick={handleReset}
                style={{ backgroundColor: '#fff', color: '#666', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
                Weiteren Import starten
              </button>
            </div>
          </div>
        )}

        {!result && !file && (
          <div style={{ ...card, marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>
              1. Vorlage herunterladen
            </h2>
            <p style={{ fontSize: '13px', color: '#999', margin: '0 0 16px' }}>
              Lade die Excel-Vorlage herunter, fülle deine Objekte/Einheiten/Mieter ein und lade sie unten hoch.
            </p>
            <a href="/api/import-template" download
              style={{ display: 'inline-block', backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
              📥 Vorlage herunterladen (.xlsx)
            </a>
          </div>
        )}

        {!result && !file && (
          <div style={{ ...card, marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px', fontFamily: 'Georgia, serif' }}>
              2. Datei hochladen
            </h2>
            <div
              onDragOver={e => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragActive ? '#1a1a1a' : '#e8e6e0'}`,
                borderRadius: '12px',
                padding: '64px 24px',
                textAlign: 'center',
                backgroundColor: dragActive ? '#fafaf8' : '#fff',
                transition: 'all 0.2s'
              }}>
              <p style={{ fontSize: '16px', color: '#1a1a1a', margin: '0 0 8px' }}>
                {parsing ? '⏳ Datei wird analysiert...' : '📂 Datei hier hineinziehen'}
              </p>
              <p style={{ fontSize: '13px', color: '#999', margin: '0 0 16px' }}>
                oder
              </p>
              <label style={{ display: 'inline-block', backgroundColor: '#fff', color: '#1a1a1a', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
                Datei auswählen
                <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
                  onChange={e => e.target.files && e.target.files[0] && handleFile(e.target.files[0])} />
              </label>
              <p style={{ fontSize: '12px', color: '#bbb', margin: '16px 0 0' }}>
                Erlaubt: .xlsx, .xls, .csv · Max 500 Zeilen
              </p>
            </div>
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', fontSize: '14px', color: '#dc2626' }}>
            ⚠️ {error}
            <button onClick={handleReset} style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#dc2626', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}>
              Zurücksetzen
            </button>
          </div>
        )}

        {!result && stats && file && (
          <div style={{ ...card, marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
                  Vorschau: {file.name}
                </h2>
                <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>{stats.totalRows} Zeilen erkannt</p>
              </div>
              <button onClick={handleReset} disabled={importing}
                style={{ backgroundColor: '#fff', color: '#666', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer', opacity: importing ? 0.5 : 1 }}>
                Andere Datei
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#f0fdf4', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '11px', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Objekte</p>
                <p style={{ fontSize: '24px', color: '#16a34a', fontWeight: '300', fontFamily: 'Georgia, serif', margin: 0 }}>{stats.uniqueProperties}</p>
              </div>
              <div style={{ backgroundColor: '#eff6ff', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '11px', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Einheiten</p>
                <p style={{ fontSize: '24px', color: '#2563eb', fontWeight: '300', fontFamily: 'Georgia, serif', margin: 0 }}>{stats.totalUnits}</p>
              </div>
              <div style={{ backgroundColor: '#fffbeb', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '11px', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Mieter</p>
                <p style={{ fontSize: '24px', color: '#d97706', fontWeight: '300', fontFamily: 'Georgia, serif', margin: 0 }}>{stats.totalTenants}</p>
              </div>
              <div style={{ backgroundColor: stats.invalidRows > 0 ? '#fef2f2' : '#fafaf8', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '11px', color: stats.invalidRows > 0 ? '#dc2626' : '#999', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Übersprungen</p>
                <p style={{ fontSize: '24px', color: stats.invalidRows > 0 ? '#dc2626' : '#bbb', fontWeight: '300', fontFamily: 'Georgia, serif', margin: 0 }}>{stats.invalidRows}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#fafaf8', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Gesamt-Kaltmiete / Monat</p>
                <p style={{ fontSize: '20px', color: '#1a1a1a', fontWeight: '500', margin: 0 }}>{formatEur(stats.totalKaltmiete)}</p>
              </div>
              <div style={{ backgroundColor: '#fafaf8', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Gesamt-Nebenkosten / Monat</p>
                <p style={{ fontSize: '20px', color: '#1a1a1a', fontWeight: '500', margin: 0 }}>{formatEur(stats.totalNebenkosten)}</p>
              </div>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #e8e6e0', borderRadius: '10px' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#fafaf8' }}>
                  <tr>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#999', fontWeight: '500' }}>#</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#999', fontWeight: '500' }}>Objekt</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#999', fontWeight: '500' }}>Einheit</th>
                    <th style={{ padding: '10px', textAlign: 'right', color: '#999', fontWeight: '500' }}>Miete</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#999', fontWeight: '500' }}>Mieter</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#999', fontWeight: '500' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map(row => (
                    <tr key={row.rowNum} style={{ borderTop: '1px solid #f5f4f0' }}>
                      <td style={{ padding: '10px', color: '#bbb' }}>{row.rowNum}</td>
                      <td style={{ padding: '10px', color: '#1a1a1a' }}>{row.property || '—'}</td>
                      <td style={{ padding: '10px', color: '#1a1a1a' }}>{row.unit || '—'}</td>
                      <td style={{ padding: '10px', color: '#1a1a1a', textAlign: 'right' }}>
                        {row.rentAmount ? formatEur(row.rentAmount) : '—'}
                      </td>
                      <td style={{ padding: '10px', color: '#666' }}>{row.tenantName || '—'}</td>
                      <td style={{ padding: '10px' }}>
                        {row.errors.length === 0 ? (
                          <span style={{ color: '#16a34a' }}>✓ OK</span>
                        ) : (
                          <span style={{ color: '#dc2626' }}>⚠ {row.errors.join(', ')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 50 && (
                <div style={{ padding: '12px', textAlign: 'center', backgroundColor: '#fafaf8', fontSize: '12px', color: '#999' }}>
                  + {rows.length - 50} weitere Zeilen (alle werden importiert)
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={handleReset} disabled={importing}
                style={{ backgroundColor: '#fff', color: '#666', padding: '12px 24px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer', opacity: importing ? 0.5 : 1 }}>
                Abbrechen
              </button>
              <button onClick={handleImport} disabled={stats.validRows === 0 || importing}
                style={{
                  backgroundColor: stats.validRows === 0 || importing ? '#ccc' : '#1a1a1a',
                  color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none',
                  fontSize: '13px', cursor: stats.validRows === 0 || importing ? 'not-allowed' : 'pointer'
                }}>
                {importing ? '⏳ Importiere...' : `${stats.validRows} Zeilen importieren →`}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}