'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import * as XLSX from 'xlsx'

interface ImportRow {
  rowNum: number
  property: string
  address: string
  yearBuilt: number | null
  unit: string
  sizeSqm: number | null
  rooms: number | null
  rentAmount: number | null
  utilities: number | null
  vatRate: number | null
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

export default function Import() {
  const [userId, setUserId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [stats, setStats] = useState<PreviewStats | null>(null)
  const [parsing, setParsing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
    }
    check()
  }, [])

  const columnMap: { [key: string]: string[] } = {
    property: ['objekt', 'objekt *', 'haus', 'gebäude', 'property'],
    address: ['adresse', 'address', 'anschrift'],
    yearBuilt: ['baujahr', 'jahr', 'year'],
    unit: ['einheit', 'einheit *', 'wohnung', 'unit'],
    sizeSqm: ['fläche', 'fläche m²', 'qm', 'wohnfläche', 'size'],
    rooms: ['zimmer', 'rooms', 'räume'],
    rentAmount: ['kaltmiete', 'kaltmiete €', 'miete', 'rent'],
    utilities: ['nebenkosten', 'nebenkosten €', 'nk'],
    vatRate: ['mwst', 'mwst %', 'ust', 'vat'],
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

  const handleFile = async (selectedFile: File) => {
    setError('')
    setRows([])
    setStats(null)

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

      const parsedRows: ImportRow[] = jsonData.map((raw, idx) => {
        const errors: string[] = []
        const property = String(raw[propertyCol] || '').trim()
        const unit = String(raw[unitCol] || '').trim()

        if (!property) errors.push('Objekt fehlt')
        if (!unit) errors.push('Einheit fehlt')

        const addressCol = findColumn(headers, 'address')
        const yearCol = findColumn(headers, 'yearBuilt')
        const sizeCol = findColumn(headers, 'sizeSqm')
        const roomsCol = findColumn(headers, 'rooms')
        const rentCol = findColumn(headers, 'rentAmount')
        const utilCol = findColumn(headers, 'utilities')
        const vatCol = findColumn(headers, 'vatRate')
        const nameCol = findColumn(headers, 'tenantName')
        const emailCol = findColumn(headers, 'tenantEmail')
        const phoneCol = findColumn(headers, 'tenantPhone')

        const tenantEmail = String(raw[emailCol || ''] || '').toLowerCase().trim()
        if (tenantEmail && !tenantEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          errors.push('Ungültige E-Mail')
        }

        return {
          rowNum: idx + 2,
          property,
          address: String(raw[addressCol || ''] || '').trim(),
          yearBuilt: toNumber(raw[yearCol || '']),
          unit,
          sizeSqm: toNumber(raw[sizeCol || '']),
          rooms: toNumber(raw[roomsCol || '']),
          rentAmount: toNumber(raw[rentCol || '']),
          utilities: toNumber(raw[utilCol || '']),
          vatRate: toNumber(raw[vatCol || '']),
          tenantName: String(raw[nameCol || ''] || '').trim(),
          tenantEmail,
          tenantPhone: String(raw[phoneCol || ''] || '').trim(),
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
  }

  const handleImport = async () => {
    alert('Import-Logik kommt in Etappe 2 – aktuell nur Vorschau!')
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

        {!file && (
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

        {!file && (
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

        {stats && file && (
          <div style={{ ...card, marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
                  Vorschau: {file.name}
                </h2>
                <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>{stats.totalRows} Zeilen erkannt</p>
              </div>
              <button onClick={handleReset} style={{ backgroundColor: '#fff', color: '#666', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
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
              <button onClick={handleReset} style={{ backgroundColor: '#fff', color: '#666', padding: '12px 24px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
                Abbrechen
              </button>
              <button onClick={handleImport} disabled={stats.validRows === 0}
                style={{
                  backgroundColor: stats.validRows === 0 ? '#ccc' : '#1a1a1a',
                  color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none',
                  fontSize: '13px', cursor: stats.validRows === 0 ? 'not-allowed' : 'pointer'
                }}>
                {stats.validRows} Zeilen importieren →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}