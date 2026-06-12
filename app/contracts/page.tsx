'use client'

import { useToast } from '@/components/ui/Toast'
import { Banknote, TrendingUp, FileText } from 'lucide-react'
import WohnungsgeberModal from '@/components/WohnungsgeberModal'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { generatePaymentsForContract, countPaymentsForContract } from '@/lib/payments'

export default function Contracts() {
  const toast = useToast()
  const [tenants, setTenants] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [paymentCounts, setPaymentCounts] = useState<{ [key: string]: number }>({})
  const [paidCounts, setPaidCounts] = useState<{ [key: string]: number }>({})
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedTenant, setSelectedTenant] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [rentCold, setRentCold] = useState('')
  const [utilityAdvance, setUtilityAdvance] = useState('')
  // Mieterhöhung Modal
  const [increaseModalId, setIncreaseModalId] = useState<string | null>(null)
  const [newRentCold, setNewRentCold] = useState('')
  const [newUtilityAdvance, setNewUtilityAdvance] = useState('')
  const [increaseReason, setIncreaseReason] = useState('vergleichsmiete')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [increaseNotes, setIncreaseNotes] = useState('')
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0)
  const [updatePaymentsToo, setUpdatePaymentsToo] = useState(true)
  const [increaseLoading, setIncreaseLoading] = useState(false)
  const [rentIncreasesByContract, setRentIncreasesByContract] = useState<{[key: string]: any[]}>({})
  const [deposit, setDeposit] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [endConfirm, setEndConfirm] = useState<string | null>(null)
  const [wgbContract, setWgbContract] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
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
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    setProfile(prof)
    const { data: props } = await supabase.from('properties').select('id').eq('owner_id', uid)
    const propertyIds = (props || []).map((p: any) => p.id)
    const { data: tenantsData } = await supabase.from('tenants').select('*').eq('owner_id', uid).order('full_name')
    setTenants(tenantsData || [])
    const { data: unitsData } = await supabase.from('units').select('*, properties(name)')
      .in('property_id', propertyIds.length > 0 ? propertyIds : ['none']).order('name')
    setUnits(unitsData || [])
    const { data: contractsData } = await supabase.from('contracts')
      .select('*, tenants(full_name), units(name, type, total_rent, properties(name, address, zip, city))')
      .in('tenant_id', (tenantsData || []).map((t: any) => t.id).length > 0 ? (tenantsData || []).map((t: any) => t.id) : ['none'])
      .order('created_at', { ascending: false })
    setContracts(contractsData || [])

    // Gesamt- und bezahlte Zahlungen pro Vertrag zählen
    const counts: { [key: string]: number } = {}
    const paidCountsTmp: { [key: string]: number } = {}
    for (const c of contractsData || []) {
      counts[c.id] = await countPaymentsForContract(c.id)
      const { count: paid } = await supabase
        .from('payments').select('*', { count: 'exact', head: true })
        .eq('contract_id', c.id).eq('status', 'paid')
      paidCountsTmp[c.id] = paid || 0
    }
    setPaymentCounts(counts)
    setPaidCounts(paidCountsTmp)
    // Mieterhoehungen pro Vertrag laden
    const contractIds = (contractsData || []).map((cc: any) => cc.id)
    if (contractIds.length > 0) {
      const { data: increases } = await supabase
        .from('rent_increases').select('*')
        .in('contract_id', contractIds)
        .order('effective_date', { ascending: false })
      const byContract: {[key: string]: any[]} = {}
      ;(increases || []).forEach((inc: any) => {
        if (!byContract[inc.contract_id]) byContract[inc.contract_id] = []
        byContract[inc.contract_id].push(inc)
      })
      setRentIncreasesByContract(byContract)
    }
  }

  const handleEdit = (c: any) => {
    setEditingId(c.id); setSelectedTenant(c.tenant_id); setSelectedUnit(c.unit_id)
    setRentCold(c.rent_cold?.toString() || ''); setUtilityAdvance(c.utility_advance?.toString() || '0'); setDeposit(c.deposit?.toString() || '')
    setStartDate(c.start_date || ''); setEndDate(c.end_date || '')
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false); setEditingId(null)
    setSelectedTenant(''); setSelectedUnit(''); setRentCold(''); setUtilityAdvance('')
    setDeposit(''); setStartDate(''); setEndDate('')
  }

  const handleUnitChange = (unitId: string) => {
    setSelectedUnit(unitId)
    const unit = units.find(u => u.id === unitId)
    if (unit && !editingId) {
      if (unit.rent_amount) setRentCold(parseFloat(unit.rent_amount).toFixed(2))
      if (unit.utilities_amount) setUtilityAdvance(parseFloat(unit.utilities_amount).toFixed(2))
    }
  }

  const handleSave = async () => {
    if (!selectedTenant || !selectedUnit || !rentCold || !startDate) return
    setLoading(true)
    const data = {
      tenant_id: selectedTenant, unit_id: selectedUnit,
      rent_cold: parseFloat(rentCold),
      utility_advance: parseFloat(utilityAdvance || '0'),
      deposit: deposit ? parseFloat(deposit) : null,
      start_date: startDate, end_date: endDate || null, is_active: true
    }
    if (editingId) {
      await supabase.from('contracts').update(data).eq('id', editingId)
    } else {
      const { data: newContract } = await supabase.from('contracts').insert(data).select().single()
      if (newContract) {
        const { error } = await generatePaymentsForContract(
          newContract.id, startDate, parseFloat(rentCold) + parseFloat(utilityAdvance || '0'), 12, 0
        )
        if (error) {
          toast.error('Vertrag erstellt, aber Zahlungen konnten nicht generiert werden: ' + error.message)
        }
      }
    }
    handleCancel(); setLoading(false); loadData(userId!)
  }

  // Vertrag beenden (is_active = false, zukünftige Zahlungen entfernen)
  const handleEndContract = async (id: string) => {
    const today = new Date().toISOString().split('T')[0]
    const { error: contractError } = await supabase.from('contracts')
      .update({ is_active: false, end_date: today })
      .eq('id', id)
    if (contractError) {
      toast.error('Fehler beim Beenden: ' + contractError.message)
      setEndConfirm(null); return
    }
    // Zukünftige unbezahlte Zahlungen löschen (nicht bezahlte bleiben für Buchhaltung)
    await supabase.from('payments').delete()
      .eq('contract_id', id).eq('status', 'pending').gt('due_date', today)
    setEndConfirm(null)
    loadData(userId!)
  }

  // Vertrag löschen (nur erlaubt wenn keine bezahlten Zahlungen)
  const handleDelete = async (id: string) => {
    const paid = paidCounts[id] || 0
    if (paid > 0) {
      toast.error(`Dieser Vertrag hat ${paid} bereits bezahlte Zahlung(en).\n\nAus Buchhaltungsgründen (10-Jahre-Aufbewahrung nach §147 AO) kann er nicht gelöscht werden.\n\nNutze stattdessen "Beenden" um den Vertrag zu archivieren – die Daten bleiben dabei erhalten.`)
      setDeleteConfirm(null); return
    }
    // Alle pending Zahlungen löschen
    const { error: paymentsError } = await supabase
      .from('payments').delete().eq('contract_id', id)
    if (paymentsError) {
      toast.error('Fehler beim Löschen der Zahlungen: ' + paymentsError.message)
      setDeleteConfirm(null); return
    }
    // Vertrag löschen
    const { error } = await supabase.from('contracts').delete().eq('id', id)
    if (error) {
      toast.error('Fehler beim Löschen: ' + error.message)
      setDeleteConfirm(null); return
    }
    setDeleteConfirm(null); loadData(userId!)
  }

  const handleGeneratePayments = async (c: any) => {
    setGeneratingId(c.id)
    const existingCount = paymentCounts[c.id] || 0
    const { error } = await generatePaymentsForContract(
      c.id, c.start_date, parseFloat(c.rent_amount), 12, existingCount
    )
    setGeneratingId(null)
    if (error) {
      toast.error('Fehler: ' + error.message)
    } else {
      toast.success(`12 Zahlungen generiert! (Monat ${existingCount + 1} bis ${existingCount + 12})`)
      loadData(userId!)
    }
  }

  const openIncreaseModal = async (contractId: string, rc: number, ua: number) => {
    setIncreaseModalId(contractId)
    setNewRentCold(rc.toString())
    setNewUtilityAdvance(ua.toString())
    setIncreaseReason('vergleichsmiete')
    setEffectiveDate(new Date().toISOString().split('T')[0])
    setIncreaseNotes('')
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('payments').select('*', { count: 'exact', head: true })
      .eq('contract_id', contractId)
      .in('status', ['pending', 'late'])
      .gte('due_date', today)
    setPendingPaymentsCount(count || 0)
    setUpdatePaymentsToo(true)
  }

  const handleSaveIncrease = async () => {
    if (!increaseModalId || !newRentCold || !effectiveDate) return
    const contract: any = contracts.find((c: any) => c.id === increaseModalId)
    if (!contract) return
    setIncreaseLoading(true)
    const oldCold = parseFloat(contract.rent_cold || '0')
    const oldUtil = parseFloat(contract.utility_advance || '0')
    const newCold = parseFloat(newRentCold)
    const newUtil = parseFloat(newUtilityAdvance || '0')
    const { error: auditErr } = await supabase.from('rent_increases').insert({
      contract_id: increaseModalId, effective_date: effectiveDate,
      old_rent_cold: oldCold, new_rent_cold: newCold,
      old_utility_advance: oldUtil, new_utility_advance: newUtil,
      reason: increaseReason, notes: increaseNotes || null,
    })
    if (auditErr) { toast.error('Audit-Log fehlgeschlagen: ' + auditErr.message); setIncreaseLoading(false); return }
    const { error: updErr } = await supabase.from('contracts')
      .update({ rent_cold: newCold, utility_advance: newUtil }).eq('id', increaseModalId)
    if (updErr) { toast.error('Vertrag-Update fehlgeschlagen: ' + updErr.message); setIncreaseLoading(false); return }
    if (updatePaymentsToo && pendingPaymentsCount > 0) {
      await supabase.from('payments').update({ amount: newCold + newUtil })
        .eq('contract_id', increaseModalId).in('status', ['pending', 'late']).gte('due_date', effectiveDate)
    }
    setIncreaseModalId(null); setIncreaseLoading(false); loadData(userId!)
    toast.success('Mieterhöhung gespeichert!')
  }

  const formatEur = (val: number | string | null | undefined) => {
    if (val === null || val === undefined || val === '') return '0,00 €'
    const n = typeof val === 'string' ? parseFloat(val) : val
    return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  }

  const card = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '24px' }
  const input = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const label = { fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div className="max-w-[900px] mx-auto px-5 py-8 md:px-12 md:py-12 pb-24 md:pb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-10">
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>Mietverträge</h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
              {contracts.filter(c => c.is_active).length} aktiv · {contracts.length} gesamt
            </p>
          </div>
          <button onClick={() => { setShowForm(true); setTimeout(() => document.getElementById('formcard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }} style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
            + Vertrag anlegen
          </button>
        </div>

        {showForm && (
          <div id="formcard" className="scroll-mt-24" style={{ ...card, marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>
              {editingId ? 'Vertrag bearbeiten' : 'Neuer Mietvertrag'}
            </h2>
            <div className="flex flex-col gap-4 md:grid md:grid-cols-2 mb-[20px]">
              <div style={{ gridColumn: 'span 2' }}>
                <label style={label}>Mieter *</label>
                <select value={selectedTenant} onChange={e => setSelectedTenant(e.target.value)} style={input}>
                  <option value="">Mieter auswählen...</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={label}>Einheit *</label>
                <select value={selectedUnit} onChange={e => handleUnitChange(e.target.value)} style={input}>
                  <option value="">Einheit auswählen...</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.properties?.name} – {u.name} ({formatEur(u.total_rent)})</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Kaltmiete (€) *</label>
                <input value={rentCold} onChange={e => setRentCold(e.target.value)} placeholder="z.B. 800" type="number" step="0.01" style={input} />
              </div>
              <div>
                <label style={label}>NK-Vorauszahlung (€)</label>
                <input value={utilityAdvance} onChange={e => setUtilityAdvance(e.target.value)} placeholder="z.B. 150" type="number" step="0.01" style={input} />
                {(rentCold || utilityAdvance) && (
                  <p style={{ fontSize: '12px', color: '#16a34a', marginTop: '6px', marginBottom: 0 }}>
                    Gesamt: {(parseFloat(rentCold || '0') + parseFloat(utilityAdvance || '0')).toFixed(2)} € / Monat
                  </p>
                )}
              </div>
              <div>
                <label style={label}>Kaution (€)</label>
                <input value={deposit} onChange={e => setDeposit(e.target.value)} placeholder="z.B. 2850" type="number" style={input} />
              </div>
              <div>
                <label style={label}>Startdatum *</label>
                <input value={startDate} onChange={e => setStartDate(e.target.value)} type="date" style={input} />
              </div>
              <div>
                <label style={label}>Enddatum (leer = unbefristet)</label>
                <input value={endDate} onChange={e => setEndDate(e.target.value)} type="date" style={input} />
              </div>
            </div>
            {!editingId && (
              <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#0369a1' }}>
                ℹ️ Beim Speichern werden automatisch <strong>12 monatliche Zahlungen</strong> generiert. Fälligkeit: {startDate && new Date(startDate + 'T00:00:00').getDate() === 1 ? '3. Werktag jeden Monats (BGB-Standard)' : 'Vertragstag + 3 Tage'}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSave} disabled={loading || !selectedTenant || !selectedUnit || !rentCold || !startDate}
                style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.4 : 1 }}>
                {loading ? 'Speichern...' : editingId ? 'Änderungen speichern' : 'Speichern & Zahlungen erstellen'}
              </button>
              <button onClick={handleCancel} style={{ backgroundColor: '#fff', color: '#666', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {contracts.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '64px' }}>
            <p style={{ fontSize: '14px', color: '#bbb', margin: '0 0 12px' }}>Noch keine Mietverträge angelegt.</p>
            <button onClick={() => { setShowForm(true); setTimeout(() => document.getElementById('formcard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }} style={{ background: 'none', border: 'none', color: '#1a1a1a', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}>
              Ersten Vertrag anlegen →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {contracts.map(c => (
              <div key={c.id} style={card}>
                {deleteConfirm === c.id ? (
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                    <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>
                      Vertrag inkl. {paymentCounts[c.id] || 0} Zahlungen wirklich löschen?
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleDelete(c.id)} style={{ backgroundColor: '#dc2626', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>Ja, löschen</button>
                      <button onClick={() => setDeleteConfirm(null)} style={{ backgroundColor: '#fff', color: '#666', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>Abbrechen</button>
                    </div>
                  </div>
                ) : endConfirm === c.id ? (
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                    <p style={{ fontSize: '14px', color: '#d97706', margin: 0 }}>
                      Vertrag heute beenden? Zukünftige unbezahlte Zahlungen werden entfernt.
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEndContract(c.id)} style={{ backgroundColor: '#d97706', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>Ja, beenden</button>
                      <button onClick={() => setEndConfirm(null)} style={{ backgroundColor: '#fff', color: '#666', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 4px' }}>{c.tenants?.full_name}</p>
                      <p style={{ fontSize: '13px', color: '#bbb', margin: '0 0 4px' }}>
                        {c.units?.properties?.name} – {c.units?.name} · ab {new Date(c.start_date).toLocaleDateString('de-DE')}
                        {c.end_date && ` bis ${new Date(c.end_date).toLocaleDateString('de-DE')}`}
                      </p>
                      <p style={{ fontSize: '12px', color: '#16a34a', margin: 0 }}>
                        <Banknote size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />{paymentCounts[c.id] || 0} Zahlungen · {paidCounts[c.id] || 0} bezahlt
                      </p>
                      {(rentIncreasesByContract[c.id] || []).length > 0 && (
                        <p style={{ fontSize: '11px', color: '#92400e', margin: '4px 0 0' }}>
                          <TrendingUp size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />{(rentIncreasesByContract[c.id] || []).length} Mieteränderung{(rentIncreasesByContract[c.id] || []).length !== 1 ? 'en' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
                      <div className="text-left md:text-right">
                        <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 2px' }}>{formatEur(c.rent_amount)}/Mo.</p>
                        {c.deposit ? <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>Kaution: {formatEur(c.deposit)}</p> : null}
                      </div>
                      <span style={{ fontSize: '12px', color: c.is_active ? '#16a34a' : '#999', backgroundColor: c.is_active ? '#f0fdf4' : '#f5f4f0', padding: '4px 12px', borderRadius: '20px' }}>
                        {c.is_active ? 'Aktiv' : 'Beendet'}
                      </span>
                      {c.is_active && (
                        <button onClick={() => handleGeneratePayments(c)} disabled={generatingId === c.id}
                          style={{ backgroundColor: '#f0fdf4', color: '#166534', padding: '8px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '13px', cursor: 'pointer', opacity: generatingId === c.id ? 0.5 : 1 }}>
                          {generatingId === c.id ? '...' : '+ 12 Zahlungen'}
                        </button>
                      )}
                      <button onClick={() => handleEdit(c)} style={{ backgroundColor: '#fff', color: '#666', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}>Bearbeiten</button>
                      {(!c.units?.type || c.units?.type === 'wohnung') && (
                        <button onClick={() => setWgbContract(c)} style={{ backgroundColor: '#fff', color: '#666', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer' }}><FileText size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />Meldebescheinigung</button>
                      )}
                      {c.is_active && (
                        <button onClick={() => openIncreaseModal(c.id, parseFloat(c.rent_cold || '0'), parseFloat(c.utility_advance || '0'))} style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '8px 14px', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '13px', cursor: 'pointer' }}><TrendingUp size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />Miete ändern</button>
                      )}
                      {c.is_active && (
                        <button onClick={() => setEndConfirm(c.id)} style={{ backgroundColor: '#fff', color: '#d97706', padding: '8px 14px', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '13px', cursor: 'pointer' }}>Beenden</button>
                      )}
                      <button onClick={() => setDeleteConfirm(c.id)} style={{ backgroundColor: '#fff', color: '#dc2626', padding: '8px 14px', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '13px', cursor: 'pointer' }}>Löschen</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {wgbContract && (
        <WohnungsgeberModal
          data={{
            tenantName: wgbContract.tenants?.full_name || '',
            propertyName: wgbContract.units?.properties?.name || '',
            propertyAddress: wgbContract.units?.properties?.address || '',
            propertyZip: wgbContract.units?.properties?.zip || '',
            propertyCity: wgbContract.units?.properties?.city || '',
            unitName: wgbContract.units?.name || '',
            startDate: wgbContract.start_date || ''
          }}
          profile={profile}
          onClose={() => setWgbContract(null)}
        />
      )}

      {/* Mieterhöhung Modal */}
      {increaseModalId && (() => {
        const contract: any = contracts.find((cc: any) => cc.id === increaseModalId)
        if (!contract) return null
        const oldCold = parseFloat(contract.rent_cold || '0')
        const oldUtil = parseFloat(contract.utility_advance || '0')
        const newCold = parseFloat(newRentCold || '0')
        const newUtil = parseFloat(newUtilityAdvance || '0')
        const oldTotal = oldCold + oldUtil
        const newTotal = newCold + newUtil
        const coldPct = oldCold > 0 ? ((newCold - oldCold) / oldCold) * 100 : 0
        const isVergleichsmiete = increaseReason === 'vergleichsmiete'
        const isOverKappung = isVergleichsmiete && coldPct > 20

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '500', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>Mieterhöhung</h2>
              <p style={{ fontSize: '13px', color: '#666', margin: '0 0 20px' }}>
                {contract.tenants?.full_name} – {contract.units?.properties?.name}, {contract.units?.name}
              </p>

              <div style={{ backgroundColor: '#f5f3ed', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: '#666', margin: '0 0 6px' }}>Aktuelle Miete:</p>
                <p style={{ fontSize: '14px', margin: 0 }}>
                  Kalt: <strong>{formatEur(oldCold)}</strong> · NK: <strong>{formatEur(oldUtil)}</strong> · Gesamt: <strong>{formatEur(oldTotal)}</strong>
                </p>
              </div>

              {(rentIncreasesByContract[increaseModalId] || []).length > 0 && (
                <div style={{ backgroundColor: '#fafafa', border: '1px solid #e8e6e0', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px', fontWeight: '500' }}>
                    Bisherige Änderungen ({(rentIncreasesByContract[increaseModalId] || []).length})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                    {(rentIncreasesByContract[increaseModalId] || []).map((inc: any) => (
                      <div key={inc.id} style={{ fontSize: '12px', color: '#444', display: 'flex', justifyContent: 'space-between', gap: '8px', borderBottom: '1px solid #f0ece4', paddingBottom: '6px' }}>
                        <span>{new Date(inc.effective_date).toLocaleDateString('de-DE')}</span>
                        <span>{formatEur(inc.old_rent_cold)} → <strong>{formatEur(inc.new_rent_cold)}</strong></span>
                        <span style={{ color: '#888', fontSize: '11px' }}>{
                          inc.reason === 'vergleichsmiete' ? '§558' :
                          inc.reason === 'index' ? '§557b' :
                          inc.reason === 'modernisierung' ? '§559' :
                          inc.reason === 'staffel' ? '§557a' :
                          inc.reason === 'nk_anpassung' ? '§560' : 'Sonst.'
                        }</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4 mb-4">
                <div>
                  <label style={label}>Neue Kaltmiete (EUR) *</label>
                  <input value={newRentCold} onChange={e => setNewRentCold(e.target.value)} type="number" step="0.01" style={input} />
                  {newCold > 0 && oldCold > 0 && (
                    <p style={{ fontSize: '11px', marginTop: '4px', marginBottom: 0, color: coldPct > 0 ? '#16a34a' : '#dc2626' }}>
                      {coldPct >= 0 ? '+' : ''}{coldPct.toFixed(1)}% gegenüber alt ({formatEur(oldCold)})
                    </p>
                  )}
                </div>

                <div>
                  <label style={label}>Neue NK-Vorauszahlung (EUR)</label>
                  <input value={newUtilityAdvance} onChange={e => setNewUtilityAdvance(e.target.value)} type="number" step="0.01" style={input} />
                </div>

                <div>
                  <label style={label}>Grund der Erhöhung *</label>
                  <select value={increaseReason} onChange={e => setIncreaseReason(e.target.value)} style={input}>
                    <option value="vergleichsmiete">Vergleichsmietenerhöhung (§558 BGB)</option>
                    <option value="index">Indexmiete (§557b BGB)</option>
                    <option value="modernisierung">Modernisierung (§559 BGB)</option>
                    <option value="staffel">Staffelmiete (§557a BGB)</option>
                    <option value="nk_anpassung">NK-Anpassung (§560 BGB)</option>
                    <option value="other">Sonstiges</option>
                  </select>
                </div>

                <div>
                  <label style={label}>Wirkungsdatum *</label>
                  <input value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} type="date" style={input} />
                </div>

                <div>
                  <label style={label}>Notizen (optional)</label>
                  <input value={increaseNotes} onChange={e => setIncreaseNotes(e.target.value)} type="text" placeholder="z.B. Vergleichsmietenspiegel der Stadt" style={input} />
                </div>
              </div>

              {isOverKappung && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: '#991b1b', margin: '0 0 4px', fontWeight: '500' }}>
                    Warnung: Kappungsgrenze §558 BGB überschritten
                  </p>
                  <p style={{ fontSize: '12px', color: '#991b1b', margin: 0 }}>
                    Bei Vergleichsmietenerhöhungen darf die Kaltmiete nicht um mehr als 20% in 3 Jahren steigen. Du gehst um {coldPct.toFixed(1)}% nach oben. Bitte juristisch prüfen.
                  </p>
                </div>
              )}

              {pendingPaymentsCount > 0 && (
                <div style={{ backgroundColor: '#fafaf8', border: '1px solid #e8e6e0', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={updatePaymentsToo} onChange={e => setUpdatePaymentsToo(e.target.checked)} style={{ marginTop: '2px' }} />
                    <div>
                      <p style={{ fontSize: '13px', color: '#1e3a8a', margin: '0 0 4px', fontWeight: '500' }}>
                        {pendingPaymentsCount} ausstehende Zahlung{pendingPaymentsCount !== 1 ? 'en' : ''} ab {new Date(effectiveDate).toLocaleDateString('de-DE')} mit aktualisieren
                      </p>
                      <p style={{ fontSize: '12px', color: '#1e3a8a', margin: 0 }}>
                        Neuer Betrag: <strong>{formatEur(newTotal)}</strong> / Monat
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setIncreaseModalId(null)} disabled={increaseLoading} style={{ backgroundColor: '#fff', color: '#666', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '14px', cursor: 'pointer' }}>
                  Abbrechen
                </button>
                <button onClick={handleSaveIncrease} disabled={increaseLoading || !newRentCold || !effectiveDate} style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer', opacity: increaseLoading || !newRentCold || !effectiveDate ? 0.5 : 1 }}>
                  {increaseLoading ? 'Speichert...' : 'Mieterhöhung speichern'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </main>
  )
}