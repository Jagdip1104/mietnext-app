'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

const EXPENSE_CATEGORIES: Record<string, string> = {
  grundsteuer: 'Grundsteuer', wasser: 'Wasserversorgung', abwasser: 'Entwässerung / Abwasser',
  heizung: 'Heizkosten', warmwasser: 'Warmwasserversorgung', heizung_warmwasser: 'Heizung + Warmwasser',
  aufzug: 'Aufzug', strassenreinigung: 'Straßenreinigung + Winterdienst', muell: 'Müllbeseitigung',
  gebaeudereinigung: 'Gebäudereinigung', ungeziefer: 'Ungezieferbekämpfung', gartenpflege: 'Gartenpflege',
  allgemeinstrom: 'Allgemeinstrom', schornstein: 'Schornsteinreinigung',
  versicherung_uml: 'Gebäude- & Haftpflichtversicherung', hauswart_uml: 'Hausmeister (umlagefähig)',
  antenne: 'Gemeinschaftsantenne / SAT', waeschepflege: 'Wäschepflege', rauchmelder: 'Rauchwarnmelder',
  co2_umlage: 'CO₂-Kostenteilung', dachrinne: 'Dachrinnenreinigung', pool_sauna: 'Pool / Sauna',
  sonstige_uml: 'Sonstige Betriebskosten', instandhaltung: 'Instandhaltung / Reparaturen',
  modernisierung: 'Modernisierung / Sanierung', hausverwaltung: 'Hausverwaltungsgebühren',
  steuerberatung: 'Steuerberatung / Buchhaltung', rechtskosten: 'Rechtskosten / Anwalt',
  versicherung_nicht: 'Mietausfall- / Rechtsschutzversicherung', kredit: 'Kreditzinsen / Finanzierung',
  weg_ruecklagen: 'WEG-Rücklagen', neuvermietung: 'Neuvermietung / Makler',
  leerstand: 'Leerstandskosten', anschaffung: 'Anschaffungen', hauswart_nicht: 'Hausmeister (nicht umlagefähig)',
  bankgebuehren: 'Bankgebühren', sonstige_nicht: 'Sonstige nicht umlagefähige Kosten',
}

const getCatLabel = (e: any) =>
  (e.custom_category) || EXPENSE_CATEGORIES[e.category] || e.category

export default function GuvPage() {
  const [properties, setProperties]   = useState<any[]>([])
  const [selectedProp, setSelectedProp] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1)
  const [payments, setPayments]       = useState<any[]>([])
  const [expenses, setExpenses]       = useState<any[]>([])
  const [loaded, setLoaded]           = useState(false)
  const [loading, setLoading]         = useState(false)
  const [pdfLoading, setPdfLoading]   = useState(false)
  const [userId, setUserId]           = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      const { data } = await supabase.from('properties').select('id, name, address, city').eq('owner_id', session.user.id).order('name')
      setProperties(data || [])
    }
    check()
  }, [])

  const loadGuV = async () => {
    if (!selectedProp) return
    setLoading(true)
    setLoaded(false)

    // Einnahmen: paid payments für dieses Objekt + Jahr
    const { data: unitsData } = await supabase.from('units').select('id').eq('property_id', selectedProp)
    const unitIds = (unitsData || []).map((u: any) => u.id)

    if (unitIds.length > 0) {
      const { data: contractsData } = await supabase.from('contracts').select('id, tenants(full_name), units(name)').in('unit_id', unitIds)
      const contractIds = (contractsData || []).map((c: any) => c.id)

      if (contractIds.length > 0) {
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*, contracts(id, tenants(full_name), units(name))')
          .in('contract_id', contractIds)
          .eq('status', 'paid')
          .gte('paid_date', `${selectedYear}-01-01`)
          .lte('paid_date', `${selectedYear}-12-31`)
          .order('paid_date')
        setPayments(paymentsData || [])
      } else {
        setPayments([])
      }
    } else {
      setPayments([])
    }

    // Ausgaben: expenses für dieses Objekt + Jahr
    const { data: expData } = await supabase
      .from('expenses')
      .select('*')
      .eq('property_id', selectedProp)
      .gte('expense_date', `${selectedYear}-01-01`)
      .lte('expense_date', `${selectedYear}-12-31`)
      .order('expense_date')
    setExpenses(expData || [])

    setLoading(false)
    setLoaded(true)
  }

  // Berechnungen
  const totalEinnahmen   = payments.reduce((s: number, p: any) => s + Number(p.amount), 0)
  const expUml           = expenses.filter((e: any) =>  e.umlagefaehig)
  const expNicht         = expenses.filter((e: any) => !e.umlagefaehig)
  const totalUml         = expUml.reduce((s: number, e: any) => s + Number(e.amount), 0)
  const totalNicht       = expNicht.reduce((s: number, e: any) => s + Number(e.amount), 0)
  const totalAusgaben    = totalUml + totalNicht
  const ergebnis         = totalEinnahmen - totalAusgaben
  const isGewinn         = ergebnis >= 0
  const selectedPropObj  = properties.find((p: any) => p.id === selectedProp)

  const formatEur = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  const formatDate = (d: string) => new Date(d).toLocaleDateString('de-DE')
  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

  // ─── PDF Export ──────────────────────────────────────────────────────────────
  const generatePDF = async () => {
    setPdfLoading(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const prop = selectedPropObj

      // Header
      doc.setFillColor(26, 26, 26)
      doc.rect(0, 0, 210, 20, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(255, 255, 255)
      doc.text('MietNext', 20, 13)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text('Jahres-Gewinn- und Verlustrechnung', 190, 13, { align: 'right' })

      // Titel
      doc.setTextColor(26, 26, 26)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text(`Jahres-GuV ${selectedYear}`, 105, 35, { align: 'center' })
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120, 120, 120)
      doc.text(`${prop?.name} · ${prop?.address}, ${prop?.city}`, 105, 43, { align: 'center' })
      doc.text(`Zeitraum: 01.01.${selectedYear} – 31.12.${selectedYear}`, 105, 49, { align: 'center' })
      doc.setDrawColor(220, 218, 214)
      doc.setLineWidth(0.4)
      doc.line(20, 54, 190, 54)

      let y = 64

      // ── EINNAHMEN ──
      doc.setFillColor(240, 253, 244)
      doc.rect(20, y - 5, 170, 8, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(21, 128, 61)
      doc.text('EINNAHMEN', 22, y)
      doc.text(formatEur(totalEinnahmen), 190, y, { align: 'right' })
      y += 6

      payments.forEach((p: any) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(50, 50, 50)
        const tenant = p.contracts?.tenants?.full_name || '–'
        const unit   = p.contracts?.units?.name || ''
        doc.text(`${formatDate(p.paid_date)}  ${tenant}${unit ? ` · ${unit}` : ''}`, 24, y)
        doc.setTextColor(26, 26, 26)
        doc.text(formatEur(Number(p.amount)), 190, y, { align: 'right' })
        y += 6
        doc.setDrawColor(240, 250, 244)
        doc.setLineWidth(0.2)
        doc.line(20, y - 2, 190, y - 2)
      })

      y += 6
      doc.setDrawColor(180, 178, 174)
      doc.setLineWidth(0.4)
      doc.line(20, y, 190, y)
      y += 10

      // ── AUSGABEN – Umlagefähig ──
      doc.setFillColor(254, 242, 242)
      doc.rect(20, y - 5, 170, 8, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(185, 28, 28)
      doc.text('AUSGABEN – Umlagefähig (§2 BetrKV)', 22, y)
      doc.text(formatEur(totalUml), 190, y, { align: 'right' })
      y += 6

      expUml.forEach((e: any) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(50, 50, 50)
        doc.text(`${formatDate(e.expense_date)}  ${getCatLabel(e)}${e.description ? ` · ${e.description}` : ''}`, 24, y)
        doc.setTextColor(26, 26, 26)
        doc.text(formatEur(Number(e.amount)), 190, y, { align: 'right' })
        y += 6
        doc.setDrawColor(254, 242, 242)
        doc.setLineWidth(0.2)
        doc.line(20, y - 2, 190, y - 2)
      })

      y += 4

      // ── AUSGABEN – Nicht umlagefähig ──
      doc.setFillColor(254, 242, 242)
      doc.rect(20, y - 5, 170, 8, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(185, 28, 28)
      doc.text('AUSGABEN – Nicht umlagefähig', 22, y)
      doc.text(formatEur(totalNicht), 190, y, { align: 'right' })
      y += 6

      expNicht.forEach((e: any) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(50, 50, 50)
        doc.text(`${formatDate(e.expense_date)}  ${getCatLabel(e)}${e.description ? ` · ${e.description}` : ''}`, 24, y)
        doc.setTextColor(26, 26, 26)
        doc.text(formatEur(Number(e.amount)), 190, y, { align: 'right' })
        y += 6
        doc.setDrawColor(254, 242, 242)
        doc.setLineWidth(0.2)
        doc.line(20, y - 2, 190, y - 2)
      })

      y += 6

      // ── Gesamt Ausgaben ──
      doc.setDrawColor(180, 178, 174)
      doc.setLineWidth(0.4)
      doc.line(20, y, 190, y)
      y += 8
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text('Gesamt Ausgaben:', 22, y)
      doc.setTextColor(185, 28, 28)
      doc.text(formatEur(totalAusgaben), 190, y, { align: 'right' })
      y += 10

      // ── Jahresergebnis ──
      const [r, g, b] = isGewinn ? [21, 128, 61] : [185, 28, 28]
      doc.setDrawColor(26, 26, 26)
      doc.setLineWidth(0.8)
      doc.line(20, y, 190, y)
      y += 10
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(80, 80, 80)
      doc.text(isGewinn ? 'JAHRESGEWINN:' : 'JAHRESVERLUST:', 22, y)
      doc.setTextColor(r, g, b)
      doc.text(formatEur(Math.abs(ergebnis)), 190, y, { align: 'right' })

      // Footer
      doc.setDrawColor(220, 218, 214)
      doc.setLineWidth(0.3)
      doc.line(20, 275, 190, 275)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(160, 160, 160)
      doc.text(`Erstellt am ${new Date().toLocaleDateString('de-DE')} · MietNext`, 20, 281)
      doc.text('Diese Aufstellung dient als interne Übersicht und ersetzt keine steuerliche Beratung.', 190, 281, { align: 'right' })

      const safeName = (prop?.name || 'Objekt').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
      doc.save(`GuV_${safeName}_${selectedYear}.pdf`)
    } catch (err: any) {
      alert('PDF-Fehler: ' + err.message)
    }
    setPdfLoading(false)
  }

  const card = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '24px' }
  const inp  = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const lbl  = { fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div className="max-w-[960px] mx-auto px-5 py-8 md:px-12 md:py-12 pb-24 md:pb-12">

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
              Jahres-GuV
            </h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
              Gewinn- und Verlustrechnung · Einnahmen vs. Ausgaben pro Objekt
            </p>
          </div>
          {loaded && (
            <button onClick={generatePDF} disabled={pdfLoading}
              style={{ backgroundColor: '#3b82f6', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: pdfLoading ? 'wait' : 'pointer', opacity: pdfLoading ? 0.7 : 1 }}>
              {pdfLoading ? '⏳ PDF...' : '📄 PDF exportieren'}
            </button>
          )}
        </div>

        {/* ── Auswahl ── */}
        <div style={{ ...card, marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'flex-end' }}>
            <div>
              <label style={lbl}>Objekt *</label>
              <select value={selectedProp} onChange={e => { setSelectedProp(e.target.value); setLoaded(false) }} style={inp}>
                <option value="">Objekt wählen...</option>
                {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name} – {p.city}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Jahr *</label>
              <select value={selectedYear} onChange={e => { setSelectedYear(parseInt(e.target.value)); setLoaded(false) }} style={inp}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={loadGuV} disabled={!selectedProp || loading}
              style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 24px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', opacity: !selectedProp ? 0.4 : 1, whiteSpace: 'nowrap' as const }}>
              {loading ? 'Lade...' : 'GuV laden →'}
            </button>
          </div>
        </div>

        {!loaded && !loading && (
          <div style={{ ...card, textAlign: 'center', padding: '64px' }}>
            <p style={{ fontSize: '32px', margin: '0 0 12px' }}>📊</p>
            <p style={{ fontSize: '15px', color: '#999', margin: '0 0 4px' }}>Objekt und Jahr wählen</p>
            <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>Dann auf "GuV laden" klicken</p>
          </div>
        )}

        {loaded && (
          <>
            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-[32px]">
              {([
                { label: 'Einnahmen',          value: totalEinnahmen, color: '#16a34a' },
                { label: 'Ausgaben gesamt',    value: totalAusgaben,  color: '#dc2626' },
                { label: 'Davon umlagefähig',  value: totalUml,       color: '#d97706' },
                { label: isGewinn ? 'Jahresgewinn' : 'Jahresverlust',
                  value: Math.abs(ergebnis),
                  color: isGewinn ? '#16a34a' : '#dc2626' },
              ] as any[]).map((s: any) => (
                <div key={s.label} style={card}>
                  <p style={{ fontSize: '11px', color: '#999', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
                  <p style={{ fontSize: '22px', fontWeight: '300', color: s.color, margin: 0, fontFamily: 'Georgia, serif' }}>{formatEur(s.value)}</p>
                </div>
              ))}
            </div>

            {/* ── Einnahmen ── */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#16a34a', margin: '0 0 12px', display: 'flex', justifyContent: 'space-between' }}>
                <span>✅ Einnahmen</span>
                <span>{formatEur(totalEinnahmen)}</span>
              </h2>
              {payments.length === 0 ? (
                <div style={{ ...card, padding: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>Keine bezahlten Mieten in {selectedYear} gefunden.</p>
                </div>
              ) : (
                <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                  {payments.map((p: any, i: number) => (
                    <div key={p.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '14px 24px',
                      borderBottom: i < payments.length - 1 ? '1px solid #f5f4f0' : 'none',
                    }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 2px' }}>
                          {p.contracts?.tenants?.full_name || '–'}
                          {p.contracts?.units?.name && <span style={{ color: '#999', fontWeight: '400' }}> · {p.contracts.units.name}</span>}
                        </p>
                        <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>Bezahlt: {formatDate(p.paid_date)}</p>
                      </div>
                      <p style={{ fontSize: '15px', fontWeight: '500', color: '#16a34a', margin: 0, fontFamily: 'Georgia, serif' }}>
                        + {formatEur(Number(p.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Ausgaben Umlagefähig ── */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#d97706', margin: '0 0 12px', display: 'flex', justifyContent: 'space-between' }}>
                <span>🔄 Ausgaben – Umlagefähig (§2 BetrKV)</span>
                <span>{formatEur(totalUml)}</span>
              </h2>
              {expUml.length === 0 ? (
                <div style={{ ...card, padding: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>Keine umlagefähigen Kosten in {selectedYear} erfasst.</p>
                </div>
              ) : (
                <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                  {expUml.map((e: any, i: number) => (
                    <div key={e.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '14px 24px',
                      borderBottom: i < expUml.length - 1 ? '1px solid #f5f4f0' : 'none',
                    }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 2px' }}>
                          {getCatLabel(e)}
                          {e.description && <span style={{ color: '#999', fontWeight: '400' }}> · {e.description}</span>}
                        </p>
                        <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>
                          {formatDate(e.expense_date)}
                          {e.invoice_number && ` · RE: ${e.invoice_number}`}
                        </p>
                      </div>
                      <p style={{ fontSize: '15px', fontWeight: '500', color: '#dc2626', margin: 0, fontFamily: 'Georgia, serif' }}>
                        − {formatEur(Number(e.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Ausgaben Nicht umlagefähig ── */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#dc2626', margin: '0 0 12px', display: 'flex', justifyContent: 'space-between' }}>
                <span>❌ Ausgaben – Nicht umlagefähig</span>
                <span>{formatEur(totalNicht)}</span>
              </h2>
              {expNicht.length === 0 ? (
                <div style={{ ...card, padding: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>Keine nicht umlagefähigen Kosten in {selectedYear} erfasst.</p>
                </div>
              ) : (
                <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                  {expNicht.map((e: any, i: number) => (
                    <div key={e.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '14px 24px',
                      borderBottom: i < expNicht.length - 1 ? '1px solid #f5f4f0' : 'none',
                    }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 2px' }}>
                          {getCatLabel(e)}
                          {e.description && <span style={{ color: '#999', fontWeight: '400' }}> · {e.description}</span>}
                        </p>
                        <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>
                          {formatDate(e.expense_date)}
                          {e.invoice_number && ` · RE: ${e.invoice_number}`}
                        </p>
                      </div>
                      <p style={{ fontSize: '15px', fontWeight: '500', color: '#dc2626', margin: 0, fontFamily: 'Georgia, serif' }}>
                        − {formatEur(Number(e.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Jahresergebnis ── */}
            <div style={{
              padding: '24px 32px', borderRadius: '12px',
              backgroundColor: isGewinn ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${isGewinn ? '#bbf7d0' : '#fecaca'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: '12px', color: isGewinn ? '#16a34a' : '#dc2626', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '500' }}>
                  {isGewinn ? 'Jahresgewinn' : 'Jahresverlust'} {selectedYear}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                  {formatEur(totalEinnahmen)} Einnahmen − {formatEur(totalAusgaben)} Ausgaben
                </p>
              </div>
              <p style={{ fontSize: '32px', fontWeight: '300', color: isGewinn ? '#16a34a' : '#dc2626', margin: 0, fontFamily: 'Georgia, serif' }}>
                {isGewinn ? '+' : '−'} {formatEur(Math.abs(ergebnis))}
              </p>
            </div>

            <p style={{ fontSize: '12px', color: '#bbb', margin: '12px 0 0', textAlign: 'center' }}>
              Diese Aufstellung dient als interne Übersicht und ersetzt keine steuerliche Beratung.
            </p>
          </>
        )}
      </div>
    </main>
  )
}