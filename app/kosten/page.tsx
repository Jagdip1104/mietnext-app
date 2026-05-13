'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

const EXPENSE_CATEGORIES = [
  // ── Umlagefähig (§2 BetrKV) ──────────────────────────────────────────────
  { value: 'grundsteuer',        label: 'Grundsteuer',                               umlagefaehig: true  },
  { value: 'wasser',             label: 'Wasserversorgung',                          umlagefaehig: true  },
  { value: 'abwasser',           label: 'Entwässerung / Abwasser',                   umlagefaehig: true  },
  { value: 'heizung',            label: 'Heizkosten',                                umlagefaehig: true  },
  { value: 'warmwasser',         label: 'Warmwasserversorgung',                      umlagefaehig: true  },
  { value: 'heizung_warmwasser', label: 'Heizung + Warmwasser (verbunden)',          umlagefaehig: true  },
  { value: 'aufzug',             label: 'Aufzug (Betrieb + Wartung)',                umlagefaehig: true  },
  { value: 'strassenreinigung',  label: 'Straßenreinigung + Winterdienst',           umlagefaehig: true  },
  { value: 'muell',              label: 'Müllbeseitigung',                           umlagefaehig: true  },
  { value: 'gebaeudereinigung',  label: 'Gebäudereinigung',                          umlagefaehig: true  },
  { value: 'ungeziefer',         label: 'Ungezieferbekämpfung (laufend)',            umlagefaehig: true  },
  { value: 'gartenpflege',       label: 'Gartenpflege',                              umlagefaehig: true  },
  { value: 'allgemeinstrom',     label: 'Allgemeinstrom / Gemeinschaftsbeleuchtung', umlagefaehig: true  },
  { value: 'schornstein',        label: 'Schornsteinreinigung',                      umlagefaehig: true  },
  { value: 'versicherung_uml',   label: 'Gebäude- & Haftpflichtversicherung',       umlagefaehig: true  },
  { value: 'hauswart_uml',       label: 'Hausmeister (umlagefähige Tätigkeiten)',   umlagefaehig: true  },
  { value: 'antenne',            label: 'Gemeinschaftsantenne / SAT',               umlagefaehig: true  },
  { value: 'waeschepflege',      label: 'Wäschepflege-Einrichtungen',               umlagefaehig: true  },
  { value: 'rauchmelder',        label: 'Rauchwarnmelder (Wartung / Miete)',        umlagefaehig: true  },
  { value: 'co2_umlage',         label: 'CO₂-Kostenanteil Mieter (ab 2023)',        umlagefaehig: true  },
  { value: 'dachrinne',          label: 'Dachrinnenreinigung',                      umlagefaehig: true  },
  { value: 'pool_sauna',         label: 'Pool / Sauna / Gemeinschaftsanlage',       umlagefaehig: true  },
  { value: 'sonstige_uml',       label: 'Sonstige Betriebskosten §2 Nr.17 …',      umlagefaehig: true  },
  // ── Nicht umlagefähig ─────────────────────────────────────────────────────
  { value: 'instandhaltung',     label: 'Instandhaltung / Reparaturen',             umlagefaehig: false },
  { value: 'modernisierung',     label: 'Modernisierung / Sanierung',               umlagefaehig: false },
  { value: 'hausverwaltung',     label: 'Hausverwaltungsgebühren',                  umlagefaehig: false },
  { value: 'steuerberatung',     label: 'Steuerberatung / Buchhaltung',             umlagefaehig: false },
  { value: 'rechtskosten',       label: 'Rechtskosten / Anwalt',                   umlagefaehig: false },
  { value: 'versicherung_nicht', label: 'Mietausfall- / Rechtsschutzversicherung',  umlagefaehig: false },
  { value: 'kredit',             label: 'Kreditzinsen / Finanzierung',              umlagefaehig: false },
  { value: 'weg_ruecklagen',     label: 'WEG-Rücklagen',                            umlagefaehig: false },
  { value: 'neuvermietung',      label: 'Neuvermietung / Makler / Inserate',        umlagefaehig: false },
  { value: 'leerstand',          label: 'Leerstandskosten',                         umlagefaehig: false },
  { value: 'anschaffung',        label: 'Anschaffungen (Geräte, Ausstattung)',      umlagefaehig: false },
  { value: 'hauswart_nicht',     label: 'Hausmeister (Verwaltungstätigkeiten)',     umlagefaehig: false },
  { value: 'bankgebuehren',      label: 'Bankgebühren / Kontoführung',              umlagefaehig: false },
  { value: 'sonstige_nicht',     label: 'Sonstige nicht umlagefähige Kosten …',    umlagefaehig: false },
]

const UMLAGE_CATS  = new Set(EXPENSE_CATEGORIES.filter((c: any) => c.umlagefaehig).map((c: any) => c.value))
const SONSTIGE     = new Set(['sonstige_uml', 'sonstige_nicht'])

export default function KostenPage() {
  const [expenses, setExpenses]       = useState<any[]>([])
  const [properties, setProperties]   = useState<any[]>([])
  const [showForm, setShowForm]       = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)
  const [userId, setUserId]           = useState<string | null>(null)

  // Filter
  const [filterProperty, setFilterProperty] = useState('')
  const [filterYear, setFilterYear]         = useState('')
  const [filterUmlage, setFilterUmlage]     = useState<'all' | 'ja' | 'nein'>('all')

  // Form
  const [form, setForm] = useState({
    property_id:     '',
    category:        '',
    custom_category: '',
    amount:          '',
    expense_date:    new Date().toISOString().split('T')[0],
    description:     '',
    invoice_number:  '',
  })

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
    const { data: propsData } = await supabase
      .from('properties').select('id, name, city')
      .eq('owner_id', uid).order('name')
    setProperties(propsData || [])

    const { data: expData } = await supabase
      .from('expenses')
      .select('*, properties(name, city)')
      .eq('owner_id', uid)
      .order('expense_date', { ascending: false })
    setExpenses(expData || [])
  }

  const handleCategoryChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      category: value,
      custom_category: '',
    }))
  }

  const handleSave = async () => {
    if (!form.property_id || !form.category || !form.amount || !form.expense_date) return
    setLoading(true)
    const cat = EXPENSE_CATEGORIES.find((c: any) => c.value === form.category)
    const { error } = await supabase.from('expenses').insert({
      owner_id:        userId,
      property_id:     form.property_id,
      category:        form.category,
      custom_category: SONSTIGE.has(form.category) ? form.custom_category || null : null,
      amount:          parseFloat(form.amount),
      expense_date:    form.expense_date,
      description:     form.description || null,
      invoice_number:  form.invoice_number || null,
      umlagefaehig:    cat?.umlagefaehig ?? false,
    })
    if (error) { alert('Fehler: ' + error.message); setLoading(false); return }
    setForm({ property_id: '', category: '', custom_category: '', amount: '', expense_date: new Date().toISOString().split('T')[0], description: '', invoice_number: '' })
    setShowForm(false)
    setLoading(false)
    loadData(userId!)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id)
    setDeleteConfirm(null)
    loadData(userId!)
  }

  // Gefilterte Ausgaben
  const filtered = expenses.filter((e: any) => {
    if (filterProperty && e.property_id !== filterProperty) return false
    if (filterYear && new Date(e.expense_date).getFullYear().toString() !== filterYear) return false
    if (filterUmlage === 'ja'   && !e.umlagefaehig) return false
    if (filterUmlage === 'nein' &&  e.umlagefaehig) return false
    return true
  })

  const totalAll     = filtered.reduce((s: number, e: any) => s + Number(e.amount), 0)
  const totalUml     = filtered.filter((e: any) =>  e.umlagefaehig).reduce((s: number, e: any) => s + Number(e.amount), 0)
  const totalNicht   = filtered.filter((e: any) => !e.umlagefaehig).reduce((s: number, e: any) => s + Number(e.amount), 0)

  const getCatLabel = (e: any) => {
    const cat = EXPENSE_CATEGORIES.find((c: any) => c.value === e.category)
    if (SONSTIGE.has(e.category) && e.custom_category) return e.custom_category
    return cat?.label || e.category
  }

  const years = Array.from({ length: 6 }, (_, i) => (new Date().getFullYear() - i).toString())
  const formatEur = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  const card  = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '24px' }
  const inp   = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const lbl   = { fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  const umlageLabel = EXPENSE_CATEGORIES.find((c: any) => c.value === form.category)?.umlagefaehig

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '48px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>Kostenerfassung</h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>Umlagefähige und nicht umlagefähige Kosten pro Objekt</p>
          </div>
          <button onClick={() => setShowForm(true)}
            style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
            + Kosten erfassen
          </button>
        </div>

        {/* ── Summary Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {([
            { label: 'Gesamtkosten',          value: totalAll,   color: '#1a1a1a' },
            { label: 'Davon umlagefähig',      value: totalUml,   color: '#16a34a' },
            { label: 'Davon nicht umlagefähig',value: totalNicht, color: '#dc2626' },
          ] as any[]).map((s: any) => (
            <div key={s.label} style={card}>
              <p style={{ fontSize: '12px', color: '#999', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
              <p style={{ fontSize: '26px', fontWeight: '300', color: s.color, margin: 0, fontFamily: 'Georgia, serif' }}>{formatEur(s.value)}</p>
            </div>
          ))}
        </div>

        {/* ── Filter ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)} style={inp}>
            <option value="">Alle Objekte</option>
            {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={inp}>
            <option value="">Alle Jahre</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterUmlage} onChange={e => setFilterUmlage(e.target.value as any)} style={inp}>
            <option value="all">Alle Kostenarten</option>
            <option value="ja">✅ Nur umlagefähig</option>
            <option value="nein">❌ Nur nicht umlagefähig</option>
          </select>
        </div>

        {/* ── Formular ── */}
        {showForm && (
          <div style={{ ...card, marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>
              Kosten erfassen
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

              <div>
                <label style={lbl}>Objekt *</label>
                <select value={form.property_id} onChange={e => setForm(prev => ({ ...prev, property_id: e.target.value }))} style={inp}>
                  <option value="">Objekt wählen...</option>
                  {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name} – {p.city}</option>)}
                </select>
              </div>

              <div>
                <label style={lbl}>Kategorie *</label>
                <select value={form.category} onChange={e => handleCategoryChange(e.target.value)} style={inp}>
                  <option value="">Kategorie wählen...</option>
                  <optgroup label="✅ Umlagefähig (§2 BetrKV)">
                    {EXPENSE_CATEGORIES.filter((c: any) => c.umlagefaehig).map((c: any) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="❌ Nicht umlagefähig (Vermieter trägt)">
                    {EXPENSE_CATEGORIES.filter((c: any) => !c.umlagefaehig).map((c: any) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Freitext bei Sonstige */}
              {SONSTIGE.has(form.category) && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={lbl}>Eigene Bezeichnung *</label>
                  <input type="text" value={form.custom_category}
                    onChange={e => setForm(prev => ({ ...prev, custom_category: e.target.value }))}
                    placeholder="z.B. Dachrinnenreinigung, Poolwartung..."
                    style={inp} />
                </div>
              )}

              {/* Umlagefähig Badge */}
              {form.category && (
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{
                    fontSize: '12px', padding: '4px 12px', borderRadius: '20px', fontWeight: '500',
                    color: umlageLabel ? '#16a34a' : '#dc2626',
                    backgroundColor: umlageLabel ? '#f0fdf4' : '#fef2f2',
                  }}>
                    {umlageLabel ? '✅ Umlagefähig – kann auf Mieter umgelegt werden' : '❌ Nicht umlagefähig – Vermieter trägt diese Kosten'}
                  </span>
                </div>
              )}

              <div>
                <label style={lbl}>Betrag (€) *</label>
                <input type="number" value={form.amount}
                  onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="z.B. 450.00" style={inp} />
              </div>

              <div>
                <label style={lbl}>Datum *</label>
                <input type="date" value={form.expense_date}
                  onChange={e => setForm(prev => ({ ...prev, expense_date: e.target.value }))}
                  style={inp} />
              </div>

              <div>
                <label style={lbl}>Rechnungsnummer</label>
                <input type="text" value={form.invoice_number}
                  onChange={e => setForm(prev => ({ ...prev, invoice_number: e.target.value }))}
                  placeholder="z.B. RE-2024-0042" style={inp} />
              </div>

              <div>
                <label style={lbl}>Beschreibung</label>
                <input type="text" value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="z.B. Jahreswartung Heizung" style={inp} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSave}
                disabled={loading || !form.property_id || !form.category || !form.amount || !form.expense_date || (SONSTIGE.has(form.category) && !form.custom_category)}
                style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer',
                  opacity: loading || !form.property_id || !form.category || !form.amount ? 0.4 : 1 }}>
                {loading ? 'Speichern...' : 'Speichern'}
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ backgroundColor: '#fff', color: '#666', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* ── Liste ── */}
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '64px' }}>
            <p style={{ fontSize: '32px', margin: '0 0 12px' }}>🧾</p>
            <p style={{ fontSize: '15px', color: '#999', margin: '0 0 4px' }}>Keine Kosten gefunden.</p>
            <p style={{ fontSize: '13px', color: '#bbb', margin: '0 0 20px' }}>Erfasse deine erste Ausgabe für ein Objekt.</p>
            <button onClick={() => setShowForm(true)}
              style={{ background: 'none', border: 'none', color: '#1a1a1a', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}>
              Erste Kosten erfassen →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map((e: any) => (
              <div key={e.id} style={card}>
                {deleteConfirm === e.id ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>
                      Kosten von <strong>{formatEur(Number(e.amount))}</strong> wirklich löschen?
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleDelete(e.id)}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: 0 }}>
                          {getCatLabel(e)}
                        </p>
                        <span style={{
                          fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: '500',
                          color: e.umlagefaehig ? '#16a34a' : '#dc2626',
                          backgroundColor: e.umlagefaehig ? '#f0fdf4' : '#fef2f2',
                        }}>
                          {e.umlagefaehig ? 'umlagefähig' : 'nicht umlagefähig'}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>
                        {e.properties?.name}
                        {' · '}{new Date(e.expense_date).toLocaleDateString('de-DE')}
                        {e.invoice_number && ` · RE: ${e.invoice_number}`}
                        {e.description && ` · ${e.description}`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <p style={{ fontSize: '18px', fontWeight: '500', color: '#1a1a1a', margin: 0, fontFamily: 'Georgia, serif' }}>
                        {formatEur(Number(e.amount))}
                      </p>
                      <button onClick={() => setDeleteConfirm(e.id)}
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
    </main>
  )
}