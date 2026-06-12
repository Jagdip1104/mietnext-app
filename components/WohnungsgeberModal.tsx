'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'

interface WgbInput {
  tenantName: string
  propertyName: string
  propertyAddress: string
  propertyZip: string
  propertyCity: string
  unitName: string
  startDate: string
}

export default function WohnungsgeberModal({ data, profile, onClose }: { data: WgbInput; profile: any; onClose: () => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const [art, setArt] = useState<'einzug' | 'auszug'>('einzug')
  const [datum, setDatum] = useState(data.startDate || new Date().toISOString().slice(0, 10))

  const [gName, setGName] = useState(profile?.landlord_name || '')
  const [gStreet, setGStreet] = useState(profile?.landlord_street || '')
  const [gZip, setGZip] = useState(profile?.landlord_zip || '')
  const [gCity, setGCity] = useState(profile?.landlord_city || '')

  const [isOwner, setIsOwner] = useState(true)
  const [ownerName, setOwnerName] = useState('')

  const [wStreet, setWStreet] = useState(data.propertyAddress || data.propertyName || '')
  const [wZip, setWZip] = useState(data.propertyZip || '')
  const [wCity, setWCity] = useState(data.propertyCity || '')

  const [persons, setPersons] = useState(data.tenantName || '')

  const fmtDE = (d: any) => {
    const dt = new Date(d)
    return String(dt.getDate()).padStart(2, '0') + '.' + String(dt.getMonth() + 1).padStart(2, '0') + '.' + dt.getFullYear()
  }

  const generatePDF = async () => {
    const personList = persons.split('\n').map(p => p.trim()).filter(Boolean)
    if (!gName.trim()) { toast.error('Name des Wohnungsgebers fehlt'); return }
    if (!datum) { toast.error('Datum fehlt'); return }
    if (personList.length === 0) { toast.error('Mindestens eine meldepflichtige Person angeben'); return }
    if (!isOwner && !ownerName.trim()) { toast.error('Name des Eigentümers fehlt'); return }

    setBusy(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })

      doc.setFillColor(26, 26, 26); doc.rect(0, 0, 210, 20, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(255, 255, 255)
      doc.text('MietNext', 20, 13)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      doc.text('Wohnungsgeberbestätigung', 190, 13, { align: 'right' })

      let y = 36
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(26, 26, 26)
      doc.text('Wohnungsgeberbestätigung', 20, y); y += 6
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(120, 120, 120)
      doc.text('gemäß § 19 Bundesmeldegesetz (BMG)', 20, y); y += 12

      const section = (title: string) => {
        doc.setFillColor(245, 244, 241); doc.rect(20, y - 5, 170, 8, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(26, 26, 26)
        doc.text(title.toUpperCase(), 22, y); y += 9
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(40, 40, 40)
      }
      const row = (label: string, value: string) => {
        doc.setTextColor(120, 120, 120); doc.text(label, 22, y)
        doc.setTextColor(26, 26, 26); doc.text(value || '—', 75, y); y += 6.5
      }

      section('Wohnungsgeber')
      row('Name', gName)
      row('Anschrift', [gStreet, [gZip, gCity].filter(Boolean).join(' ')].filter(Boolean).join(', '))
      row('Eigentümer der Wohnung', isOwner ? 'Ja, der Wohnungsgeber ist Eigentümer' : 'Nein')
      if (!isOwner) row('Eigentümer', ownerName)
      y += 4

      section('Meldepflichtiger Vorgang')
      row('Art', art === 'einzug' ? 'Einzug' : 'Auszug')
      row(art === 'einzug' ? 'Einzugsdatum' : 'Auszugsdatum', fmtDE(datum))
      y += 4

      section('Anschrift der Wohnung')
      row('Straße, Hausnummer', wStreet)
      row('PLZ, Ort', [wZip, wCity].filter(Boolean).join(' '))
      if (data.unitName) row('Wohnung/Einheit', data.unitName)
      y += 4

      section('Meldepflichtige Personen')
      personList.forEach((p, i) => { row(String(i + 1) + '.', p) })
      y += 8

      doc.setFontSize(8.5); doc.setTextColor(120, 120, 120)
      const hinweis = doc.splitTextToSize(
        'Hinweis: Der Wohnungsgeber ist verpflichtet, den Einzug innerhalb von zwei Wochen zu bestätigen (§ 19 Abs. 1 BMG). ' +
        'Es ist verboten, eine Wohnanschrift für eine Anmeldung anzubieten oder zu bestätigen, obwohl ein tatsächlicher Bezug der Wohnung nicht stattfindet ' +
        '(Gefälligkeitsbescheinigung, § 19 Abs. 6 BMG). Verstöße können als Ordnungswidrigkeit mit Geldbuße geahndet werden (§ 54 BMG).', 170)
      doc.text(hinweis, 20, y); y += hinweis.length * 4 + 14

      doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.3)
      doc.line(20, y, 85, y)
      doc.line(115, y, 190, y); y += 5
      doc.setFontSize(8.5)
      doc.text('Ort, Datum', 20, y)
      doc.text('Unterschrift Wohnungsgeber', 115, y)

      doc.setDrawColor(220, 218, 214); doc.setLineWidth(0.3); doc.line(20, 283, 190, 283)
      doc.setFontSize(8); doc.setTextColor(160, 160, 160)
      doc.text('Erstellt am ' + fmtDE(new Date()) + ' · MietNext', 20, 289)

      const safe = (personList[0] || 'Mieter').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
      doc.save('Wohnungsgeberbestaetigung_' + safe + '.pdf')
      toast.success('PDF erstellt')
      onClose()
    } catch (e: any) {
      toast.error('PDF-Fehler: ' + e.message)
    }
    setBusy(false)
  }

  const ov = { position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }
  const inp = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const lbl = { fontSize: '12px', color: '#999', marginBottom: '5px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
  const sub = { fontSize: '12px', fontWeight: 600 as const, color: '#1a1a1a', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '4px 0 0' }

  return (
    <div style={ov} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: '12px', maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e8e6e0' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 2px', fontFamily: 'Georgia, serif' }}>Wohnungsgeberbestätigung</h2>
          <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>§ 19 BMG · {data.propertyName}{data.unitName ? ' · ' + data.unitName : ''}</p>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={lbl}>Vorgang</label>
              <select value={art} onChange={(e) => setArt(e.target.value as any)} style={inp}>
                <option value="einzug">Einzug</option>
                <option value="auszug">Auszug</option>
              </select>
            </div>
            <div>
              <label style={lbl}>{art === 'einzug' ? 'Einzugsdatum' : 'Auszugsdatum'}</label>
              <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} style={{ ...inp, minWidth: 0, maxWidth: '100%' }} />
            </div>
          </div>
          {art === 'auszug' && (
            <p style={{ fontSize: '12px', color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 12px', margin: 0 }}>
              Eine Auszugsbestätigung ist nur erforderlich, wenn der Mieter ins Ausland zieht und sich abmeldet.
            </p>
          )}

          <p style={sub}>Wohnungsgeber</p>
          <div>
            <label style={lbl}>Name</label>
            <input value={gName} onChange={(e) => setGName(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Straße, Hausnummer</label>
            <input value={gStreet} onChange={(e) => setGStreet(e.target.value)} style={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={lbl}>PLZ</label>
              <input value={gZip} onChange={(e) => setGZip(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Ort</label>
              <input value={gCity} onChange={(e) => setGCity(e.target.value)} style={inp} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#444', cursor: 'pointer' }}>
            <input type="checkbox" checked={isOwner} onChange={(e) => setIsOwner(e.target.checked)} />
            Wohnungsgeber ist Eigentümer der Wohnung
          </label>
          {!isOwner && (
            <div>
              <label style={lbl}>Name des Eigentümers</label>
              <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} style={inp} />
            </div>
          )}

          <p style={sub}>Anschrift der Wohnung</p>
          <div>
            <label style={lbl}>Straße, Hausnummer</label>
            <input value={wStreet} onChange={(e) => setWStreet(e.target.value)} style={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={lbl}>PLZ</label>
              <input value={wZip} onChange={(e) => setWZip(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Ort</label>
              <input value={wCity} onChange={(e) => setWCity(e.target.value)} style={inp} />
            </div>
          </div>

          <p style={sub}>Meldepflichtige Personen</p>
          <div>
            <label style={lbl}>Eine Person pro Zeile (auch Partner/Kinder)</label>
            <textarea value={persons} onChange={(e) => setPersons(e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' as const, fontFamily: 'inherit' }} />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e8e6e0', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ backgroundColor: '#fff', color: '#666', padding: '9px 18px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>Abbrechen</button>
          <button onClick={generatePDF} disabled={busy} style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '9px 18px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'PDF wird erstellt…' : 'PDF erstellen'}
          </button>
        </div>
      </div>
    </div>
  )
}
