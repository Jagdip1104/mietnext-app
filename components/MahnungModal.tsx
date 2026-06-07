'use client'

import { useState } from 'react'

interface OverduePayment { id: string; due_date: string; amount: number }
interface MahnungInput {
  tenantId: string
  tenantName: string
  propertyName: string
  unitName: string
  payments: OverduePayment[]
  total: number
}

const STAGE_TITLES: Record<string, string> = {
  erinnerung: 'Zahlungserinnerung',
  mahnung1: '1. Mahnung',
  mahnung2: '2. Mahnung',
}

function buildIntro(key: string, frist: string): string {
  if (key === 'erinnerung')
    return 'vermutlich ist es Ihrer Aufmerksamkeit entgangen: die folgenden Beträge sind bei uns noch nicht eingegangen. Wir bitten Sie, den offenen Gesamtbetrag bis zum ' + frist + ' auszugleichen.'
  if (key === 'mahnung1')
    return 'trotz Fälligkeit sind die folgenden Beträge bislang nicht bei uns eingegangen. Wir fordern Sie auf, den offenen Gesamtbetrag bis zum ' + frist + ' zu begleichen. Mit Ablauf der Fälligkeit befinden Sie sich in Zahlungsverzug (§ 286 BGB).'
  return 'trotz unserer vorherigen Aufforderung sind die folgenden Beträge weiterhin offen. Wir setzen Ihnen hiermit eine letzte Frist bis zum ' + frist + '. Sollte der Ausgleich nicht fristgerecht erfolgen, behalten wir uns weitere Schritte (insbesondere das gerichtliche Mahnverfahren) ausdrücklich vor.'
}

export default function MahnungModal({ data, profile, onClose }: { data: MahnungInput; profile: any; onClose: () => void }) {
  const [stageKey, setStageKey] = useState('erinnerung')
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14)
    return d.toISOString().slice(0, 10)
  })
  const [gebuehr, setGebuehr] = useState('')
  const [busy, setBusy] = useState(false)

  const [sName, setSName] = useState(profile?.landlord_name || '')
  const [sStreet, setSStreet] = useState(profile?.landlord_street || '')
  const [sZip, setSZip] = useState(profile?.landlord_zip || '')
  const [sCity, setSCity] = useState(profile?.landlord_city || '')
  const [sIban, setSIban] = useState(profile?.landlord_iban || '')

  const [rName, setRName] = useState(data.tenantName || '')
  const [rStreet, setRStreet] = useState('')
  const [rZip, setRZip] = useState('')
  const [rCity, setRCity] = useState('')

  const eur = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  const fmtDE = (d: any) => {
    const dt = new Date(d)
    const dd = String(dt.getDate()).padStart(2, '0')
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    return dd + '.' + mm + '.' + dt.getFullYear()
  }

  const generatePDF = async () => {
    setBusy(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const title = STAGE_TITLES[stageKey]
      const gebuehrNum = parseFloat(gebuehr) || 0
      const gesamt = data.total + gebuehrNum

      doc.setFillColor(26, 26, 26); doc.rect(0, 0, 210, 20, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(255, 255, 255)
      doc.text('MietNext', 20, 13)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      doc.text(title, 190, 13, { align: 'right' })

      doc.setTextColor(120, 120, 120); doc.setFontSize(8)
      const sender = [sName, sStreet, [sZip, sCity].filter(Boolean).join(' ')].filter(Boolean).join(' · ')
      doc.text(sender || '', 20, 32)
      doc.text('Datum: ' + fmtDE(new Date()), 190, 32, { align: 'right' })

      let ay = 46
      doc.setTextColor(26, 26, 26); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
      doc.text(rName || data.tenantName, 20, ay); ay += 5.5
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(60, 60, 60)
      if (rStreet) { doc.text(rStreet, 20, ay); ay += 5 }
      const rZipCity = [rZip, rCity].filter(Boolean).join(' ')
      if (rZipCity) { doc.text(rZipCity, 20, ay); ay += 5 }
      doc.setFontSize(9.5); doc.setTextColor(120, 120, 120)
      doc.text([data.propertyName, data.unitName].filter(Boolean).join(' · '), 20, ay + 1)

      let y = 80
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(26, 26, 26)
      doc.text(title + (data.propertyName ? ' – ' + data.propertyName : ''), 20, y); y += 10

      doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5)
      doc.text('Sehr geehrte Damen und Herren,', 20, y); y += 7
      const introLines = doc.splitTextToSize(buildIntro(stageKey, fmtDE(deadline)), 170)
      doc.text(introLines, 20, y); y += introLines.length * 5.5 + 4

      doc.setFillColor(245, 244, 241); doc.rect(20, y - 5, 170, 8, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(26, 26, 26)
      doc.text('Fällig am', 22, y); doc.text('Betrag', 188, y, { align: 'right' }); y += 7
      doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40)
      data.payments.forEach((p) => {
        doc.text(fmtDE(p.due_date), 22, y)
        doc.text(eur(p.amount), 188, y, { align: 'right' })
        y += 6
        doc.setDrawColor(240, 238, 234); doc.setLineWidth(0.2); doc.line(20, y - 3, 190, y - 3)
      })
      y += 2

      doc.setDrawColor(180, 178, 174); doc.setLineWidth(0.4); doc.line(20, y, 190, y); y += 7
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(100, 100, 100)
      doc.text('Summe offener Forderungen:', 22, y)
      doc.setTextColor(26, 26, 26); doc.text(eur(data.total), 188, y, { align: 'right' }); y += 6
      if (gebuehrNum > 0) {
        doc.setTextColor(100, 100, 100); doc.text('Mahngebühr:', 22, y)
        doc.setTextColor(26, 26, 26); doc.text(eur(gebuehrNum), 188, y, { align: 'right' }); y += 6
      }
      doc.setDrawColor(26, 26, 26); doc.setLineWidth(0.6); doc.line(20, y, 190, y); y += 7
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(185, 28, 28)
      doc.text('Gesamtbetrag:', 22, y); doc.text(eur(gesamt), 188, y, { align: 'right' }); y += 12

      doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(26, 26, 26)
      const fristLines = doc.splitTextToSize('Bitte überweisen Sie den Gesamtbetrag bis spätestens ' + fmtDE(deadline) + ' auf das unten genannte Konto.', 170)
      doc.text(fristLines, 20, y); y += fristLines.length * 5.5 + 4

      if (sIban) {
        doc.setFontSize(9.5); doc.setTextColor(100, 100, 100)
        doc.text('Bankverbindung: ' + sIban + (profile?.landlord_bic ? '  BIC ' + profile.landlord_bic : '') + (profile?.landlord_bank ? '  ' + profile.landlord_bank : ''), 20, y)
        y += 8
      }

      doc.setFontSize(9); doc.setTextColor(120, 120, 120)
      const noteLines = doc.splitTextToSize('Sollte sich dieses Schreiben mit Ihrer Zahlung überschnitten haben, betrachten Sie es bitte als gegenstandslos.', 170)
      doc.text(noteLines, 20, y); y += noteLines.length * 5 + 6

      doc.setFontSize(10.5); doc.setTextColor(26, 26, 26)
      doc.text('Mit freundlichen Grüßen', 20, y); y += 6
      doc.text(sName || '', 20, y)

      doc.setDrawColor(220, 218, 214); doc.setLineWidth(0.3); doc.line(20, 283, 190, 283)
      doc.setFontSize(8); doc.setTextColor(160, 160, 160)
      doc.text('Erstellt am ' + fmtDE(new Date()) + ' · MietNext', 20, 289)

      const safe = (rName || data.tenantName || 'Mieter').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
      doc.save(title.replace(/[^a-zA-Z0-9]/g, '_') + '_' + safe + '.pdf')
    } catch (e: any) {
      alert('PDF-Fehler: ' + e.message)
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
          <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 2px', fontFamily: 'Georgia, serif' }}>Mahnung erstellen</h2>
          <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>{data.propertyName} · {data.payments.length} offene Posten</p>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={lbl}>Stufe</label>
            <select value={stageKey} onChange={(e) => setStageKey(e.target.value)} style={inp}>
              <option value="erinnerung">Zahlungserinnerung (freundlich)</option>
              <option value="mahnung1">1. Mahnung</option>
              <option value="mahnung2">2. Mahnung (letzte Frist)</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Frist bis</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={inp} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Mahngebühr (€)</label>
              <input type="number" value={gebuehr} onChange={(e) => setGebuehr(e.target.value)} placeholder="0.00" style={inp} />
            </div>
          </div>

          <p style={sub}>Absender (Vermieter)</p>
          <input value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Name / Firma" style={inp} />
          <input value={sStreet} onChange={(e) => setSStreet(e.target.value)} placeholder="Straße & Hausnummer" style={inp} />
          <div style={{ display: 'flex', gap: '12px' }}>
            <input value={sZip} onChange={(e) => setSZip(e.target.value)} placeholder="PLZ" style={{ ...inp, maxWidth: '120px' }} />
            <input value={sCity} onChange={(e) => setSCity(e.target.value)} placeholder="Ort" style={inp} />
          </div>
          <input value={sIban} onChange={(e) => setSIban(e.target.value)} placeholder="IBAN" style={inp} />

          <p style={sub}>Empfänger (Mieter)</p>
          <input value={rName} onChange={(e) => setRName(e.target.value)} placeholder="Name" style={inp} />
          <input value={rStreet} onChange={(e) => setRStreet(e.target.value)} placeholder="Straße & Hausnummer" style={inp} />
          <div style={{ display: 'flex', gap: '12px' }}>
            <input value={rZip} onChange={(e) => setRZip(e.target.value)} placeholder="PLZ" style={{ ...inp, maxWidth: '120px' }} />
            <input value={rCity} onChange={(e) => setRCity(e.target.value)} placeholder="Ort" style={inp} />
          </div>

          <div style={{ backgroundColor: '#fafaf8', borderRadius: '8px', padding: '14px 16px', marginTop: '4px' }}>
            {data.payments.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#444', padding: '3px 0' }}>
                <span>Fällig {fmtDE(p.due_date)}</span><span>{eur(p.amount)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600', color: '#1a1a1a', borderTop: '1px solid #e8e6e0', marginTop: '6px', paddingTop: '6px' }}>
              <span>Summe</span><span>{eur(data.total)}</span>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e8e6e0', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ backgroundColor: '#fff', color: '#666', padding: '10px 18px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>Schließen</button>
          <button onClick={generatePDF} disabled={busy} style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 18px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'PDF wird erstellt...' : 'PDF erstellen'}
          </button>
        </div>
      </div>
    </div>
  )
}
