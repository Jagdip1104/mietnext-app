'use client'

import { EXPENSE_CATEGORIES } from '@/lib/categories'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { ScanLine, Paperclip, Pencil, Bot, Sparkles, AlertTriangle, Receipt } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'


const UMLAGE_CATS  = new Set(EXPENSE_CATEGORIES.filter((c: any) => c.umlagefaehig).map((c: any) => c.value))
const SONSTIGE     = new Set(['sonstige_uml', 'sonstige_nicht'])

export default function KostenPage() {
  const toast = useToast()
  const [expenses, setExpenses]       = useState<any[]>([])
  const [properties, setProperties]   = useState<any[]>([])
  const [showForm, setShowForm]       = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [bulkRows, setBulkRows] = useState<any[]>([])
  
  // Beleg-Upload States
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [existingReceipt, setExistingReceipt] = useState<{path: string, filename: string, mime: string} | null>(null)
  const [removeReceipt, setRemoveReceipt] = useState(false)
  const [receiptUploading, setReceiptUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // KI-Scan States
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set())
  
  const handleFileSelect = async (file: File | null) => {
    if (!file) { setReceiptFile(null); setScanResult(null); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Datei zu groß (max. 10 MB)'); return }
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
    if (!allowedMimes.includes(file.type)) { toast.error('Nur PDF, JPG, PNG, HEIC oder WebP erlaubt'); return }
    setReceiptFile(file)
    setRemoveReceipt(false)
    
    // KI-Scan im Hintergrund triggern
    await runScan(file)
  }
  
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

  const runScan = async (file: File) => {
    setScanning(true)
    setScanResult(null)
    setAutoFilledFields(new Set())
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setScanning(false); return }
      
      const scanFile = await downscaleImage(file)
      const formData = new FormData()
      formData.append('file', scanFile)
      
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData,
      })
      
      if (!res.ok) {
        let m = `Fehler ${res.status}`
        try { const ej = await res.json(); if (ej?.error) m = ej.error } catch {}
        setScanResult({ error: m })
        setScanning(false)
        return
      }
      const data = await res.json()
      setScanResult(data)
      autoFillFromScan(data)
    } catch (e: any) {
      console.error('Scan failed:', e)
    } finally {
      setScanning(false)
    }
  }
  
  const autoFillFromScan = (scan: any) => {
    const filled = new Set<string>()
    const newForm = { ...form }
    
    if (scan.property_match?.id && !newForm.property_id) {
      newForm.property_id = scan.property_match.id
      filled.add('property_id')
    }
    if (scan.betrag_brutto && !newForm.amount) {
      newForm.amount = String(scan.betrag_brutto)
      filled.add('amount')
    }
    if (scan.datum && newForm.expense_date === new Date().toISOString().split('T')[0]) {
      newForm.expense_date = scan.datum
      filled.add('expense_date')
    }
    if (scan.rechnungs_nr && !newForm.invoice_number) {
      newForm.invoice_number = scan.rechnungs_nr
      filled.add('invoice_number')
    }
    if (scan.lieferant && !newForm.description) {
      newForm.description = scan.lieferant
      filled.add('description')
    }
    if (scan.kategorie_vorschlag && !newForm.category) {
      // Check ob Kategorie in EXPENSE_CATEGORIES existiert
      const exists = EXPENSE_CATEGORIES.find((c: any) => c.value === scan.kategorie_vorschlag)
      if (exists) {
        newForm.category = scan.kategorie_vorschlag
        filled.add('category')
      }
    }
    
    setForm(newForm)
    setAutoFilledFields(filled)
  }
  
  const uploadReceipt = async (file: File): Promise<{path: string, filename: string, mime: string} | null> => {
    setReceiptUploading(true)
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 100)
    const path = `${userId}/${Date.now()}-${safeName}`
    const { error } = await supabase.storage.from('receipts').upload(path, file, {
      contentType: file.type, upsert: false,
    })
    setReceiptUploading(false)
    if (error) { toast.error('Beleg-Upload fehlgeschlagen: ' + error.message); return null }
    return { path, filename: file.name, mime: file.type }
  }
  
  const deleteReceiptFromStorage = async (path: string) => {
    await supabase.storage.from('receipts').remove([path])
  }
  
  const getReceiptSignedUrl = async (path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 3600)
    if (error) { toast.error('Beleg kann nicht geöffnet werden: ' + error.message); return null }
    return data?.signedUrl || null
  }
  
  const handleViewReceipt = async (path: string) => {
    const win = window.open('', '_blank')
    const url = await getReceiptSignedUrl(path)
    if (!url) { if (win) win.close(); return }
    if (win) { win.location.href = url } else { window.open(url, '_blank') }
  }
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
    
    // Beleg-Logik
    let receiptData: any = {}
    if (receiptFile) {
      const uploaded = await uploadReceipt(receiptFile)
      if (!uploaded) { setLoading(false); return }
      if (existingReceipt?.path) await deleteReceiptFromStorage(existingReceipt.path)
      receiptData = {
        receipt_path: uploaded.path, receipt_filename: uploaded.filename,
        receipt_mime: uploaded.mime, receipt_uploaded_at: new Date().toISOString(),
      }
    } else if (removeReceipt && existingReceipt?.path) {
      await deleteReceiptFromStorage(existingReceipt.path)
      receiptData = { receipt_path: null, receipt_filename: null, receipt_mime: null, receipt_uploaded_at: null }
    }
    
    const expenseData = {
      property_id:     form.property_id,
      category:        form.category,
      custom_category: SONSTIGE.has(form.category) ? form.custom_category || null : null,
      amount:          parseFloat(form.amount),
      expense_date:    form.expense_date,
      description:     form.description || null,
      invoice_number:  form.invoice_number || null,
      umlagefaehig:    cat?.umlagefaehig ?? false,
      ...receiptData,
    }
    const { error } = editingId
      ? await supabase.from('expenses').update(expenseData).eq('id', editingId)
      : await supabase.from('expenses').insert({ ...expenseData, owner_id: userId })
    if (error) { toast.error('Speichern fehlgeschlagen: ' + error.message); setLoading(false); return }
    toast.success(editingId ? 'Kosten aktualisiert' : 'Kosten gespeichert')
    setForm({ property_id: '', category: '', custom_category: '', amount: '', expense_date: new Date().toISOString().split('T')[0], description: '', invoice_number: '' })
    setReceiptFile(null); setExistingReceipt(null); setRemoveReceipt(false)
    setScanResult(null); setAutoFilledFields(new Set())
    setEditingId(null)
    setShowForm(false)
    setLoading(false)
    loadData(userId!)
  }

  const handleEditExpense = (e: any) => {
    setForm({
      property_id:    e.property_id || '',
      category:       e.category || '',
      custom_category: e.custom_category || '',
      amount:         String(e.amount || ''),
      expense_date:   e.expense_date || new Date().toISOString().split('T')[0],
      description:    e.description || '',
      invoice_number: e.invoice_number || '',
    })
    setExistingReceipt(e.receipt_path ? {
      path: e.receipt_path, filename: e.receipt_filename || 'Beleg', mime: e.receipt_mime || '',
    } : null)
    setReceiptFile(null); setRemoveReceipt(false)
    setEditingId(e.id)
    setShowForm(true)
    setTimeout(() => document.getElementById('formcard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const handleDelete = async (id: string) => {
    const exp = expenses.find((e: any) => e.id === id)
    if (exp?.receipt_path) await deleteReceiptFromStorage(exp.receipt_path)
    await supabase.from('expenses').delete().eq('id', id)
    toast.success('Kosten gelöscht')
    setDeleteConfirm(null)
    loadData(userId!)
  }

  const openBulkForm = () => {
    const today = new Date().toISOString().split('T')[0]
    const pid = filterProperty || ''
    setBulkRows([
      { property_id: pid, category: '', amount: '', expense_date: today, description: '' },
      { property_id: pid, category: '', amount: '', expense_date: today, description: '' },
      { property_id: pid, category: '', amount: '', expense_date: today, description: '' },
    ])
    setShowBulkForm(true)
    setTimeout(() => document.getElementById('bulkcard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  const updateBulkRow = (i: number, field: string, value: string) =>
    setBulkRows(prev => prev.map((r: any, idx: number) => idx === i ? { ...r, [field]: value } : r))
  const addBulkRow = () => setBulkRows(prev => {
    const last: any = prev[prev.length - 1] || {}
    const today = new Date().toISOString().split('T')[0]
    return [...prev, { property_id: last.property_id || '', category: '', amount: '', expense_date: last.expense_date || today, description: '' }]
  })
  const removeBulkRow = (i: number) => setBulkRows(prev => prev.filter((_: any, idx: number) => idx !== i))

  const handleBulkSave = async () => {
    const valid = bulkRows.filter((r: any) => r.property_id && r.category && r.amount && parseFloat(r.amount) > 0 && r.expense_date)
    if (valid.length === 0) { toast.error('Mindestens eine Zeile mit Objekt, Kategorie, Betrag und Datum ausfüllen.'); return }
    setLoading(true)
    const rows = valid.map((r: any) => {
      const cat = EXPENSE_CATEGORIES.find((c: any) => c.value === r.category)
      return {
        owner_id: userId,
        property_id: r.property_id,
        category: r.category,
        custom_category: null,
        amount: parseFloat(r.amount),
        expense_date: r.expense_date,
        description: r.description || null,
        invoice_number: null,
        umlagefaehig: cat?.umlagefaehig ?? false,
      }
    })
    const { error } = await supabase.from('expenses').insert(rows)
    setLoading(false)
    if (error) { toast.error('Speichern fehlgeschlagen: ' + error.message); return }
    toast.success(rows.length + ' Kosten gespeichert')
    setShowBulkForm(false)
    setBulkRows([])
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
      <div className="max-w-[960px] mx-auto px-5 py-8 md:px-12 md:py-12 pb-24 md:pb-12">

        {/* ── Header ── */}
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start mb-8">
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>Kostenerfassung</h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>Umlagefähige und nicht umlagefähige Kosten pro Objekt</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/kosten/stapel')}
              style={{ backgroundColor: '#fff', color: '#1a1a1a', padding: '10px 20px', borderRadius: '8px', border: '1.5px solid #1a1a1a', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              <ScanLine size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />Belege scannen
            </button>
            <button onClick={openBulkForm}
              style={{ backgroundColor: '#fff', color: '#1a1a1a', padding: '10px 20px', borderRadius: '8px', border: '1.5px solid #1a1a1a', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              + Mehrere
            </button>
            <button onClick={() => { setShowForm(true); setTimeout(() => document.getElementById('formcard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }}
              style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
              + Kosten erfassen
            </button>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-[24px]">
          {([
            { label: 'Gesamtkosten',          value: totalAll,   color: '#1a1a1a' },
            { label: 'Davon umlagefähig',      value: totalUml,   color: '#16a34a' },
            { label: 'Davon nicht umlagefähig',value: totalNicht, color: '#dc2626' },
          ] as any[]).map((s: any, i: number) => {
            const key = ['all', 'ja', 'nein'][i]
            const active = filterUmlage === key
            return (
              <div key={s.label} onClick={() => setFilterUmlage((active && key !== 'all' ? 'all' : key) as any)}
                style={{ ...card, cursor: 'pointer', border: active ? '1.5px solid ' + s.color : card.border }}>
                <p style={{ fontSize: '12px', color: '#999', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
                <p style={{ fontSize: '26px', fontWeight: '300', color: s.color, margin: 0, fontFamily: 'Georgia, serif' }}>{formatEur(s.value)}</p>
              </div>
            )
          })}
        </div>

        {/* ── Filter ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
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
          <div id="formcard" className="scroll-mt-24" style={{ ...card, marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>
              Kosten erfassen
            </h2>
            <div className="flex flex-col md:grid md:grid-cols-2 md:gap-4 gap-4 mb-[16px]">

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
                    {umlageLabel ? 'Umlagefähig – kann auf Mieter umgelegt werden' : 'Nicht umlagefähig – Vermieter trägt diese Kosten'}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* KI-Scan Status-Banner */}
              {(scanning || scanResult) && (
                <div style={{
                  padding: '12px 16px', marginBottom: '12px',
                  backgroundColor: scanning ? '#eff6ff' : (scanResult?.confidence > 0.85 ? '#f0fdf4' : '#fffbeb'),
                  border: '1px solid ' + (scanning ? '#bfdbfe' : (scanResult?.confidence > 0.85 ? '#bbf7d0' : '#fed7aa')),
                  borderRadius: '8px',
                  fontSize: '13px',
                }}>
                  {scanning ? (
                    <span style={{ color: '#1e40af' }}><Bot size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />Beleg wird analysiert... (1-3 Sekunden)</span>
                  ) : scanResult?.error ? (
                    <span style={{ color: '#991b1b' }}><AlertTriangle size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />Scan fehlgeschlagen: {scanResult.error}</span>
                  ) : (
                    <div>
                      <p style={{ margin: '0 0 4px', color: scanResult?.confidence > 0.85 ? '#166534' : '#92400e', fontWeight: '500' }}>
                        <Sparkles size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />Daten erkannt {scanResult?.is_mock && '(Demo-Modus — KI nicht aktiviert)'} — Bitte prüfen
                      </p>
                      <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>
                        Lieferant: <strong>{scanResult?.lieferant || '?'}</strong>
                        {scanResult?.confidence && ` · Sicherheit: ${Math.round(scanResult.confidence * 100)}%`}
                        {scanResult?.property_match && ` · Objekt: ${scanResult.property_match.name} (${Math.round(scanResult.property_match.address_confidence * 100)}% Match)`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Beleg-Upload */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '6px' }}>
                  Beleg (PDF, JPG, PNG · max. 10 MB)
                </label>
                
                {/* Bestehender Beleg */}
                {existingReceipt && !receiptFile && !removeReceipt && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', backgroundColor: '#f5f3ed',
                    border: '1px solid #e8e6e0', borderRadius: '8px', gap: '8px',
                  }}>
                    <button type="button" onClick={() => handleViewReceipt(existingReceipt.path)}
                      style={{ background: 'none', border: 'none', color: '#1a1a1a',
                        fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                        flex: 1, padding: 0, textDecoration: 'underline' }}>
                      <Paperclip size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />{existingReceipt.filename}
                    </button>
                    <button type="button" onClick={() => setRemoveReceipt(true)}
                      style={{ background: '#fff', color: '#dc2626', padding: '4px 10px',
                        borderRadius: '6px', border: '1px solid #fecaca', fontSize: '12px',
                        cursor: 'pointer' }}>
                      Entfernen
                    </button>
                  </div>
                )}
                
                {/* Neuer Beleg ausgewählt */}
                {receiptFile && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0', borderRadius: '8px', gap: '8px',
                  }}>
                    <span style={{ fontSize: '13px', color: '#1a1a1a', flex: 1, wordBreak: 'break-word', overflowWrap: 'anywhere', minWidth: 0 }}>
                      <Paperclip size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />{receiptFile.name} ({(receiptFile.size / 1024).toFixed(0)} KB)
                    </span>
                    <button type="button" onClick={() => { setReceiptFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      style={{ background: '#fff', color: '#666', padding: '4px 10px',
                        borderRadius: '6px', border: '1px solid #e8e6e0', fontSize: '12px',
                        cursor: 'pointer' }}>
                      Verwerfen
                    </button>
                  </div>
                )}
                
                {/* Lösch-Bestätigung */}
                {removeReceipt && existingReceipt && !receiptFile && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca', borderRadius: '8px', gap: '8px',
                  }}>
                    <span style={{ fontSize: '13px', color: '#991b1b', flex: 1 }}>
                      <Paperclip size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />{existingReceipt.filename} wird beim Speichern entfernt
                    </span>
                    <button type="button" onClick={() => setRemoveReceipt(false)}
                      style={{ background: '#fff', color: '#1a1a1a', padding: '4px 10px',
                        borderRadius: '6px', border: '1px solid #e8e6e0', fontSize: '12px',
                        cursor: 'pointer' }}>
                      Behalten
                    </button>
                  </div>
                )}
                
                {/* Datei-Picker (wenn kein Beleg oder bestehender entfernt wird) */}
                {!receiptFile && (!existingReceipt || removeReceipt) && (
                  <>
                    <input ref={fileInputRef} type="file"
                      accept="application/pdf,image/jpeg,image/png,image/heic,image/heif,image/webp"
                      onChange={e => handleFileSelect(e.target.files?.[0] || null)}
                      style={{ display: 'none' }} />
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      style={{ backgroundColor: '#fff', color: '#1a1a1a', padding: '10px 16px',
                        borderRadius: '8px', border: '1.5px dashed #1a1a1a', fontSize: '13px',
                        cursor: 'pointer', width: '100%', textAlign: 'center', fontWeight: '500' }}>
                      <Paperclip size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />Beleg hochladen
                    </button>
                  </>
                )}
              </div>

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

        {showBulkForm && (
          <div id="bulkcard" className="scroll-mt-24" style={{ ...card, marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>Mehrere Kosten erfassen</h2>
            <p style={{ fontSize: '13px', color: '#999', margin: '0 0 16px' }}>Schnelle Erfassung ohne Beleg/Scan — Belege später je Position via Bearbeiten ergänzen.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {bulkRows.map((row: any, i: number) => (
                <div key={i} className="flex flex-col gap-2 md:grid md:grid-cols-[1.2fr_1.4fr_110px_140px_auto] md:items-center md:gap-2">
                  <select value={row.property_id} onChange={e => updateBulkRow(i, 'property_id', e.target.value)} style={inp}>
                    <option value="">Objekt...</option>
                    {properties.map((pr: any) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                  </select>
                  <select value={row.category} onChange={e => updateBulkRow(i, 'category', e.target.value)} style={inp}>
                    <option value="">Kategorie...</option>
                    <optgroup label="✅ Umlagefähig">
                      {EXPENSE_CATEGORIES.filter((cc: any) => cc.umlagefaehig).map((cc: any) => (<option key={cc.value} value={cc.value}>{cc.label}</option>))}
                    </optgroup>
                    <optgroup label="❌ Nicht umlagefähig">
                      {EXPENSE_CATEGORIES.filter((cc: any) => !cc.umlagefaehig).map((cc: any) => (<option key={cc.value} value={cc.value}>{cc.label}</option>))}
                    </optgroup>
                  </select>
                  <input type="number" value={row.amount} onChange={e => updateBulkRow(i, 'amount', e.target.value)} placeholder="€" style={inp} />
                  <input type="date" value={row.expense_date} onChange={e => updateBulkRow(i, 'expense_date', e.target.value)} style={inp} />
                  <button onClick={() => removeBulkRow(i)} title="Zeile entfernen"
                    style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '18px', cursor: 'pointer', padding: '0 8px' }}>✕</button>
                </div>
              ))}
            </div>
            <button onClick={addBulkRow}
              style={{ marginTop: '12px', backgroundColor: '#fff', color: '#1a1a1a', padding: '8px 14px', borderRadius: '8px', border: '1px dashed #ccc', fontSize: '13px', cursor: 'pointer' }}>
              + Zeile
            </button>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={handleBulkSave} disabled={loading}
                style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.4 : 1 }}>
                {loading ? 'Speichern...' : 'Alle speichern'}
              </button>
              <button onClick={() => setShowBulkForm(false)}
                style={{ backgroundColor: '#fff', color: '#666', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* ── Liste ── */}
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '64px' }}>
            <Receipt size={36} style={{ color: '#d4d2cc', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: '15px', color: '#999', margin: '0 0 4px' }}>Keine Kosten gefunden.</p>
            <p style={{ fontSize: '13px', color: '#bbb', margin: '0 0 20px' }}>Erfasse deine erste Ausgabe für ein Objekt.</p>
            <button onClick={() => { setShowForm(true); setTimeout(() => document.getElementById('formcard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }}
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
                      {e.receipt_path && (
                        <button onClick={() => handleViewReceipt(e.receipt_path)}
                          title={e.receipt_filename || 'Beleg ansehen'}
                          style={{ backgroundColor: '#fff', color: '#1a1a1a', padding: '6px 12px',
                            borderRadius: '6px', border: '1px solid #e8e6e0', fontSize: '12px',
                            cursor: 'pointer', marginRight: '6px' }}>
                          <Paperclip size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />Beleg
                        </button>
                      )}
                      <button onClick={() => handleEditExpense(e)}
                        style={{ backgroundColor: '#fff', color: '#1a1a1a', padding: '6px 12px',
                          borderRadius: '6px', border: '1px solid #e8e6e0', fontSize: '12px',
                          cursor: 'pointer', marginRight: '6px' }}>
                        <Pencil size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />Bearbeiten
                      </button>
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