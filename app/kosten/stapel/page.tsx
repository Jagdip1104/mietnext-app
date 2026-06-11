'use client'

import { EXPENSE_CATEGORIES } from '@/lib/categories'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { useToast } from '@/components/ui/Toast'

const SONSTIGE = new Set(['sonstige_uml', 'sonstige_nicht'])
const MAX_FILES = 10
const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']

type Row = {
  uid: string
  file: File
  property_id: string
  category: string
  custom_category: string
  amount: string
  expense_date: string
  description: string
  invoice_number: string
  status: 'scanning' | 'done' | 'failed'
  confidence: number | null
  is_mock: boolean
}
type StringField = 'property_id' | 'category' | 'custom_category' | 'amount' | 'expense_date' | 'invoice_number' | 'description'

export default function KostenStapelPage() {
  const router = useRouter()
  const toast = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [bulkProperty, setBulkProperty] = useState('')
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState<{ done: number; total: number } | null>(null)
  const [saveErrors, setSaveErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      const { data } = await supabase.from('properties').select('id, name, city').eq('owner_id', session.user.id).order('name')
      setProperties(data || [])
    }
    check()
  }, [])

  const today = () => new Date().toISOString().split('T')[0]

  const downscaleImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) { resolve(file); return }
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const maxEdge = 1568
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(file); return }
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        }, 'image/jpeg', 0.85)
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })
  }

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList)
    if (rows.length + files.length > MAX_FILES) {
      toast.error(`Maximal ${MAX_FILES} Belege. Du hast schon ${rows.length}, ${files.length} weitere überschreiten das Limit.`)
      return
    }
    const valid: File[] = []
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name}: zu groß (max. 10 MB) — übersprungen`); continue }
      if (!ALLOWED_MIMES.includes(f.type)) { toast.error(`${f.name}: nur PDF/JPG/PNG/HEIC/WebP — übersprungen`); continue }
      valid.push(f)
    }
    if (valid.length === 0) return

    const newRows: Row[] = valid.map((f, i) => ({
      uid: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      file: f, property_id: bulkProperty || '', category: '', custom_category: '',
      amount: '', expense_date: today(), description: '', invoice_number: '',
      status: 'scanning', confidence: null, is_mock: false,
    }))
    setRows(prev => [...prev, ...newRows])
    if (fileInputRef.current) fileInputRef.current.value = ''

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    setScanProgress({ done: 0, total: newRows.length })
    for (let i = 0; i < newRows.length; i++) {
      const r = newRows[i]
      try {
        const scanFile = await downscaleImage(r.file)
        const fd = new FormData()
        fd.append('file', scanFile)
        const res = await fetch('/api/scan-receipt', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          body: fd,
        })
        if (!res.ok) {
          setRows(prev => prev.map((x): Row => x.uid === r.uid ? { ...x, status: 'failed' } : x))
        } else {
          const scan = await res.json()
          setRows(prev => prev.map((x): Row => {
            if (x.uid !== r.uid) return x
            const catExists = scan.kategorie_vorschlag && EXPENSE_CATEGORIES.find((c: any) => c.value === scan.kategorie_vorschlag)
            return {
              ...x,
              status: 'done',
              confidence: typeof scan.confidence === 'number' ? scan.confidence : null,
              is_mock: !!scan.is_mock,
              amount: scan.betrag_brutto ? String(scan.betrag_brutto) : x.amount,
              expense_date: scan.datum || x.expense_date,
              invoice_number: scan.rechnungs_nr || x.invoice_number,
              description: scan.lieferant || x.description,
              category: catExists ? scan.kategorie_vorschlag : x.category,
              property_id: x.property_id || (scan.property_match?.id || ''),
            }
          }))
        }
      } catch {
        setRows(prev => prev.map((x): Row => x.uid === r.uid ? { ...x, status: 'failed' } : x))
      }
      setScanProgress(p => p ? { ...p, done: p.done + 1 } : p)
    }
    setScanProgress(null)
  }

  const updateRow = (uid: string, field: StringField, value: string) =>
    setRows(prev => prev.map((r): Row => r.uid === uid ? { ...r, [field]: value } : r))
  const removeRow = (uid: string) => setRows(prev => prev.filter(r => r.uid !== uid))
  const applyBulkProperty = (pid: string) => {
    setBulkProperty(pid)
    if (pid) setRows(prev => prev.map((r): Row => ({ ...r, property_id: pid })))
  }

  const rowValid = (r: Row) =>
    !!(r.property_id && r.category && r.amount && parseFloat(r.amount) > 0 && r.expense_date &&
      !(SONSTIGE.has(r.category) && !r.custom_category))
  const validCount = rows.filter(rowValid).length

  const uploadReceipt = async (file: File): Promise<{ path: string, filename: string, mime: string } | null> => {
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 100)
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
    const { error } = await supabase.storage.from('receipts').upload(path, file, { contentType: file.type, upsert: false })
    if (error) return null
    return { path, filename: file.name, mime: file.type }
  }

  const handleSaveAll = async () => {
    const valid = rows.filter(rowValid)
    if (valid.length === 0) { toast.error('Mindestens eine Zeile mit Objekt, Kategorie, Betrag und Datum ausfüllen.'); return }
    setSaving(true); setSaveErrors([]); setSaveProgress({ done: 0, total: valid.length })
    const errors: string[] = []
    const savedUids: string[] = []
    for (let i = 0; i < valid.length; i++) {
      const r = valid[i]
      const cat = EXPENSE_CATEGORIES.find((c: any) => c.value === r.category)
      let receiptData: any = {}
      const uploaded = await uploadReceipt(r.file)
      if (uploaded) {
        receiptData = { receipt_path: uploaded.path, receipt_filename: uploaded.filename, receipt_mime: uploaded.mime, receipt_uploaded_at: new Date().toISOString() }
      }
      const expenseData = {
        owner_id: userId, property_id: r.property_id, category: r.category,
        custom_category: SONSTIGE.has(r.category) ? (r.custom_category || null) : null,
        amount: parseFloat(r.amount), expense_date: r.expense_date,
        description: r.description || null, invoice_number: r.invoice_number || null,
        umlagefaehig: cat?.umlagefaehig ?? false, ...receiptData,
      }
      const { error } = await supabase.from('expenses').insert(expenseData)
      if (error) {
        errors.push(`${r.file.name}: ${error.message}`)
        if (uploaded) await supabase.storage.from('receipts').remove([uploaded.path])
      } else { savedUids.push(r.uid) }
      setSaveProgress(p => p ? { ...p, done: p.done + 1 } : p)
    }
    setSaving(false); setSaveProgress(null)
    if (errors.length > 0) {
      setSaveErrors(errors)
      setRows(prev => prev.filter(r => !savedUids.includes(r.uid)))
    } else { router.push('/kosten') }
  }

  const card = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '24px' }
  const inp = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const lbl = { fontSize: '11px', color: '#999', marginBottom: '4px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div className="max-w-[960px] mx-auto px-5 py-8 md:px-12 md:py-12 pb-24 md:pb-12">

        <div style={{ marginBottom: '24px' }}>
          <button onClick={() => router.push('/kosten')} style={{ background: 'none', border: 'none', color: '#999', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '12px' }}>← Zurück zur Kostenerfassung</button>
          <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>Belege scannen</h1>
          <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>Bis zu {MAX_FILES} Belege auf einmal — die KI liest jeden aus, du prüfst und speicherst alle gemeinsam.</p>
        </div>

        {rows.length > 0 && (
          <div style={{ ...card, marginBottom: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: 500 }}>Objekt für alle:</label>
            <select value={bulkProperty} onChange={e => applyBulkProperty(e.target.value)} style={{ ...inp, width: 'auto', minWidth: '220px' }}>
              <option value="">— wählen —</option>
              {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name} – {p.city}</option>)}
            </select>
            <span style={{ fontSize: '12px', color: '#999' }}>setzt das Objekt in allen Zeilen (pro Zeile überschreibbar)</span>
          </div>
        )}

        <div style={{ ...card, marginBottom: '16px' }}>
          <input ref={fileInputRef} type="file" multiple
            accept="application/pdf,image/jpeg,image/png,image/heic,image/heif,image/webp"
            onChange={e => handleFiles(e.target.files)} style={{ display: 'none' }} />
          <button type="button" onClick={() => fileInputRef.current?.click()}
            disabled={rows.length >= MAX_FILES || !!scanProgress}
            style={{ backgroundColor: '#fff', color: '#1a1a1a', padding: '14px 16px', borderRadius: '8px', border: '1.5px dashed #1a1a1a', fontSize: '14px', cursor: (rows.length >= MAX_FILES || scanProgress) ? 'default' : 'pointer', width: '100%', textAlign: 'center', fontWeight: 500, opacity: (rows.length >= MAX_FILES || scanProgress) ? 0.5 : 1 }}>
            📎 Belege auswählen {rows.length > 0 && `(${rows.length}/${MAX_FILES})`}
          </button>
          {scanProgress && <p style={{ fontSize: '13px', color: '#1e40af', margin: '12px 0 0', textAlign: 'center' }}>🤖 Scanne {scanProgress.done} / {scanProgress.total}…</p>}
        </div>

        {saveErrors.length > 0 && (
          <div style={{ ...card, marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
            <p style={{ fontSize: '13px', color: '#991b1b', fontWeight: 500, margin: '0 0 6px' }}>Einige Belege konnten nicht gespeichert werden (bleiben hier zur Korrektur):</p>
            {saveErrors.map((e, i) => <p key={i} style={{ fontSize: '12px', color: '#991b1b', margin: '2px 0' }}>• {e}</p>)}
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '56px' }}>
            <p style={{ fontSize: '32px', margin: '0 0 12px' }}>📚</p>
            <p style={{ fontSize: '15px', color: '#999', margin: 0 }}>Noch keine Belege ausgewählt.</p>
            <p style={{ fontSize: '13px', color: '#bbb', margin: '4px 0 0' }}>Lade bis zu {MAX_FILES} Fotos oder PDFs auf einmal hoch.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rows.map((r) => {
              const umlage = EXPENSE_CATEGORIES.find((c: any) => c.value === r.category)?.umlagefaehig
              return (
                <div key={r.uid} style={{ ...card, padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                    <button type="button" onClick={() => window.open(URL.createObjectURL(r.file), '_blank')}
                      style={{ background: 'none', border: 'none', padding: 0, fontSize: '13px', color: '#1a1a1a', fontWeight: 500, cursor: 'pointer', textAlign: 'left', textDecoration: 'underline', wordBreak: 'break-word', overflowWrap: 'anywhere', minWidth: 0, flex: 1 }}>
                      📎 {r.file.name}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {r.status === 'scanning' && <span style={{ fontSize: '11px', color: '#1e40af' }}>🤖 scannt…</span>}
                      {r.status === 'done' && <span style={{ fontSize: '11px', color: r.confidence && r.confidence > 0.85 ? '#16a34a' : '#92400e' }}>✨ erkannt{r.confidence != null && ` ${Math.round(r.confidence * 100)}%`}{r.is_mock && ' (Demo)'}</span>}
                      {r.status === 'failed' && <span style={{ fontSize: '11px', color: '#991b1b' }}>⚠️ Scan fehlgeschlagen — manuell</span>}
                      <button onClick={() => removeRow(r.uid)} title="Beleg entfernen" style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '16px', cursor: 'pointer', padding: '0 4px' }}>✕</button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-3">
                    <div>
                      <label style={lbl}>Objekt *</label>
                      <select value={r.property_id} onChange={e => updateRow(r.uid, 'property_id', e.target.value)} style={inp}>
                        <option value="">Objekt wählen…</option>
                        {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name} – {p.city}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Kategorie *</label>
                      <select value={r.category} onChange={e => updateRow(r.uid, 'category', e.target.value)} style={inp}>
                        <option value="">Kategorie wählen…</option>
                        <optgroup label="✅ Umlagefähig (§2 BetrKV)">
                          {EXPENSE_CATEGORIES.filter((c: any) => c.umlagefaehig).map((c: any) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </optgroup>
                        <optgroup label="❌ Nicht umlagefähig">
                          {EXPENSE_CATEGORIES.filter((c: any) => !c.umlagefaehig).map((c: any) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </optgroup>
                      </select>
                    </div>
                    {SONSTIGE.has(r.category) && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={lbl}>Eigene Bezeichnung *</label>
                        <input type="text" value={r.custom_category} onChange={e => updateRow(r.uid, 'custom_category', e.target.value)} placeholder="z.B. Dachrinnenreinigung" style={inp} />
                      </div>
                    )}
                    <div>
                      <label style={lbl}>Betrag (€) *</label>
                      <input type="number" value={r.amount} onChange={e => updateRow(r.uid, 'amount', e.target.value)} placeholder="z.B. 450.00" style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Datum *</label>
                      <input type="date" value={r.expense_date} onChange={e => updateRow(r.uid, 'expense_date', e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Rechnungsnummer</label>
                      <input type="text" value={r.invoice_number} onChange={e => updateRow(r.uid, 'invoice_number', e.target.value)} placeholder="z.B. RE-2024-0042" style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Beschreibung / Lieferant</label>
                      <input type="text" value={r.description} onChange={e => updateRow(r.uid, 'description', e.target.value)} placeholder="z.B. Stadtwerke Osnabrück" style={inp} />
                    </div>
                  </div>
                  {r.category && (
                    <span style={{ display: 'inline-block', marginTop: '10px', fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500, color: umlage ? '#16a34a' : '#dc2626', backgroundColor: umlage ? '#f0fdf4' : '#fef2f2' }}>
                      {umlage ? '✅ Umlagefähig' : '❌ Nicht umlagefähig'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {rows.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button onClick={handleSaveAll} disabled={saving || validCount === 0}
              style={{ backgroundColor: '#16a34a', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: (saving || validCount === 0) ? 'default' : 'pointer', opacity: (saving || validCount === 0) ? 0.4 : 1 }}>
              {saving ? (saveProgress ? `Speichere ${saveProgress.done}/${saveProgress.total}…` : 'Speichern…') : `Alle speichern (${validCount})`}
            </button>
            <button onClick={() => router.push('/kosten')} disabled={saving}
              style={{ backgroundColor: '#fff', color: '#666', padding: '12px 20px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '14px', cursor: 'pointer' }}>Abbrechen</button>
            {validCount < rows.length && <span style={{ fontSize: '12px', color: '#92400e' }}>{rows.length - validCount} Zeile(n) noch unvollständig</span>}
          </div>
        )}

      </div>
    </main>
  )
}
