'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  ChevronDown, ChevronRight, ArrowLeft, Building2,
  User, UserX, FileText, CreditCard, Mail, Phone,
  Plus, Loader2, CheckCircle2, Clock, AlertCircle,
  Circle, Layers,
} from 'lucide-react'

type Property = { id: string; name: string; address: string; city: string; zip: string | null }
type Tenant = { id: string; full_name: string; email: string | null; phone: string | null; user_id: string | null; unit_id: string }
type Contract = { id: string; unit_id: string; tenant_id: string; start_date: string; end_date: string | null; rent_amount: number; is_active: boolean }
type Payment = { id: string; contract_id: string; amount: number; due_date: string; paid_date: string | null; status: string }
type RawUnit = { id: string; name: string; unit_code: string | null; floor: string | null; size_sqm: number | null; is_occupied: boolean | null }
type UnitRow = RawUnit & { tenant: Tenant | null; contract: Contract | null; lastPayment: Payment | null }

function inviteStatus(tenant: Tenant | null) {
  if (!tenant) return null
  if (tenant.user_id) return 'active'
  return 'not_invited'
}
function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function formatCurrency(n: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
}

function PaymentBadge({ payment }: { payment: Payment | null }) {
  if (!payment) return null
  const map = {
    paid:    { cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Bezahlt' },
    pending: { cls: 'bg-amber-50 text-amber-700 border-amber-100',       icon: <Clock className="h-3 w-3" />,         label: 'Ausstehend' },
    overdue: { cls: 'bg-red-50 text-red-700 border-red-100',             icon: <AlertCircle className="h-3 w-3" />,   label: 'Überfällig' },
  } as const
  const cfg = map[payment.status as keyof typeof map]
  if (!cfg) return null
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

function ExpandableUnit({ unit, forceOpen }: { unit: UnitRow; forceOpen: boolean }) {
  const [open, setOpen] = useState(false)
  const status = inviteStatus(unit.tenant)
  const isVacant = !unit.tenant
  useEffect(() => { setOpen(forceOpen) }, [forceOpen])
  return (
    <div className="border border-[#e8e6e0] rounded-lg overflow-hidden shadow-sm">
      <button onClick={() => setOpen(o => !o)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isVacant ? 'bg-[#fafaf8] hover:bg-[#f0eeea]' : 'bg-white hover:bg-[#fafaf8]'}`}>
        <span className="text-[#bbb] flex-shrink-0">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="font-medium text-[#1a1a1a] text-sm">{unit.name}</span>
          {unit.unit_code && <span className="text-xs font-mono text-[#bbb] bg-[#f0eeea] px-1.5 py-0.5 rounded">{unit.unit_code}</span>}
          {unit.floor != null && <span className="text-xs text-[#bbb] flex items-center gap-0.5"><Layers className="h-3 w-3" />{unit.floor === '0' || unit.floor === 'EG' ? 'EG' : `${unit.floor}. OG`}</span>}
          {unit.size_sqm && <span className="text-xs text-[#bbb]">{unit.size_sqm} m²</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isVacant ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f0eeea] px-2.5 py-1 text-xs font-medium text-[#888]"><UserX className="h-3 w-3" />Leerstand</span>
          ) : (
            <>
              <span className="text-sm text-[#444] hidden sm:block">{unit.tenant!.full_name}</span>
              {status === 'active'      && <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />}
              {status === 'not_invited' && <Circle className="h-2.5 w-2.5 fill-red-400 text-red-400" />}
              <PaymentBadge payment={unit.lastPayment} />
            </>
          )}
        </div>
      </button>
      {open && (
        <div className="border-t border-[#f0eeea] bg-[#fafaf8] px-4 py-4">
          {isVacant ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#888]">Diese Einheit hat keinen Mieter.</p>
              <Link href={`/tenants?unit=${unit.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#333] transition-colors"><Plus className="h-3.5 w-3.5" />Mieter anlegen</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[#bbb] uppercase tracking-wide flex items-center gap-1"><User className="h-3.5 w-3.5" />Mieter</p>
                <p className="text-sm font-medium text-[#1a1a1a]">{unit.tenant!.full_name}</p>
                {unit.tenant!.email && <a href={`mailto:${unit.tenant!.email}`} className="flex items-center gap-1.5 text-xs text-[#1a1a1a] underline hover:underline"><Mail className="h-3 w-3" />{unit.tenant!.email}</a>}
                {unit.tenant!.phone && <a href={`tel:${unit.tenant!.phone}`} className="flex items-center gap-1.5 text-xs text-[#666]"><Phone className="h-3 w-3" />{unit.tenant!.phone}</a>}
                <div>
                  {status === 'active' && <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-3 w-3" />Portal-Zugang aktiv</span>}
                  
                  {status === 'not_invited' && <Link href="/invite-tenant" className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"><AlertCircle className="h-3 w-3" />Nicht eingeladen →</Link>}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[#bbb] uppercase tracking-wide flex items-center gap-1"><FileText className="h-3.5 w-3.5" />Vertrag</p>
                {unit.contract ? (
                  <>
                    <p className="text-sm font-semibold text-[#1a1a1a]">{formatCurrency(unit.contract.rent_amount)}<span className="text-xs font-normal text-[#888] ml-1">/ Monat</span></p>
                    <p className="text-xs text-[#888]">{formatDate(unit.contract.start_date)} – {unit.contract.end_date ? formatDate(unit.contract.end_date) : 'unbefristet'}</p>
                    <span className={`inline-block text-xs rounded-full px-2 py-0.5 font-medium ${unit.contract.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-[#f0eeea] text-[#666]'}`}>{unit.contract.is_active ? 'Aktiv' : 'Beendet'}</span>
                  </>
                ) : <p className="text-xs text-[#bbb]">Kein Vertrag gefunden</p>}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[#bbb] uppercase tracking-wide flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" />Letzte Zahlung</p>
                {unit.lastPayment ? (
                  <>
                    <p className="text-sm font-semibold text-[#1a1a1a]">{formatCurrency(unit.lastPayment.amount)}</p>
                    <p className="text-xs text-[#888]">Fällig: {formatDate(unit.lastPayment.due_date)}</p>
                    {unit.lastPayment.paid_date && <p className="text-xs text-[#888]">Bezahlt: {formatDate(unit.lastPayment.paid_date)}</p>}
                    <PaymentBadge payment={unit.lastPayment} />
                  </>
                ) : <p className="text-xs text-[#bbb]">Keine Zahlungen</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const propertyId = params.id as string
  const [property, setProperty] = useState<Property | null>(null)
  const [units, setUnits] = useState<UnitRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandAll, setExpandAll] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (propertyId) loadData() }, [propertyId])

  async function loadData() {
    setLoading(true); setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: prop, error: propErr } = await supabase.from('properties').select('id, name, address, city, zip').eq('id', propertyId).eq('owner_id', user.id).single()
    if (propErr || !prop) { setError('Objekt nicht gefunden oder kein Zugriff.'); setLoading(false); return }
    setProperty(prop as Property)
    const { data: rawUnitsData } = await supabase.from('units').select('id, name, unit_code, floor, size_sqm, is_occupied').eq('property_id', propertyId).order('name')
    const rawUnits = (rawUnitsData ?? []) as RawUnit[]
    if (!rawUnits.length) { setUnits([]); setLoading(false); return }
    const unitIds = rawUnits.map(u => u.id)
    const { data: contractsData } = await supabase.from('contracts').select('id, unit_id, tenant_id, start_date, end_date, rent_amount, is_active').in('unit_id', unitIds).eq('is_active', true).order('start_date', { ascending: false })
    const contracts = (contractsData ?? []) as Contract[]
    const tenantIds = Array.from(new Set(contracts.map(c => c.tenant_id).filter(Boolean)))
    const { data: tenantsData } = tenantIds.length
      ? await supabase.from('tenants').select('id, full_name, email, phone, user_id, unit_id').in('id', tenantIds)
      : { data: [] }
    const tenants = (tenantsData ?? []) as Tenant[]
    const contractIds = contracts.map(c => c.id)
    const { data: paymentsData } = contractIds.length
      ? await supabase.from('payments').select('id, contract_id, amount, due_date, paid_date, status').in('contract_id', contractIds).order('due_date', { ascending: false })
      : { data: [] }
    const payments = (paymentsData ?? []) as Payment[]
    const tenantById = new Map<string, Tenant>()
    for (const t of tenants) tenantById.set(t.id, t)
    const contractByUnit = new Map<string, Contract>()
    for (const c of contracts) { if (!contractByUnit.has(c.unit_id)) contractByUnit.set(c.unit_id, c) }
    const lastPaymentByContract = new Map<string, Payment>()
    for (const p of payments) { if (!lastPaymentByContract.has(p.contract_id)) lastPaymentByContract.set(p.contract_id, p) }
    const assembled: UnitRow[] = rawUnits.map(u => {
      const contract = contractByUnit.get(u.id) ?? null
      const tenant = contract ? (tenantById.get(contract.tenant_id) ?? null) : null
      const lastPayment = contract ? (lastPaymentByContract.get(contract.id) ?? null) : null
      return { ...u, tenant, contract, lastPayment }
    })
    setUnits(assembled); setLoading(false)
  }

  const totalUnits = units.length
  const occupied = units.filter(u => u.is_occupied).length
  const vacant = totalUnits - occupied
  const overdueCount = units.filter(u => u.lastPayment?.status === 'overdue').length

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-6 w-6 animate-spin text-[#bbb]" /></div>
  if (error) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
      <p className="text-[#666]">{error}</p>
      <Link href="/properties" className="mt-4 inline-block text-sm text-[#1a1a1a] underline hover:underline">← Zurück zur Übersicht</Link>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href="/properties" className="inline-flex items-center gap-1.5 text-sm text-[#888] hover:text-[#1a1a1a] mb-4"><ArrowLeft className="h-4 w-4" />Alle Objekte</Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="flex items-center gap-2" style={{ fontSize: '28px', fontWeight: 400, fontFamily: 'Georgia, serif', color: '#1a1a1a' }}><Building2 className="h-6 w-6 flex-shrink-0" strokeWidth={1.5} style={{ color: '#888' }} />{property!.name}</h1>
            <p className="text-[#888] mt-0.5 text-sm">
              {property!.address}
              {(property!.zip || property!.city) && `, ${[property!.zip, property!.city].filter(Boolean).join(' ')}`}
            </p>
          </div>
          <Link href={`/units?property=${propertyId}`} className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8e6e0] px-3 py-2 text-sm font-medium text-[#444] hover:bg-[#fafaf8] transition-colors flex-shrink-0"><Plus className="h-4 w-4" />Einheit hinzufügen</Link>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Einheiten gesamt', value: totalUnits, color: 'text-[#1a1a1a]' },
          { label: 'Vermietet', value: occupied, color: 'text-emerald-700' },
          { label: 'Leerstand', value: vacant, color: vacant > 0 ? 'text-amber-600' : 'text-[#bbb]' },
          { label: 'Überfällig', value: overdueCount, color: overdueCount > 0 ? 'text-red-600' : 'text-[#bbb]' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-[#e8e6e0] bg-white px-4 py-3">
            <p className="text-xs text-[#888] mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      {units.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wide">Einheiten ({totalUnits})</h2>
            <button onClick={() => setExpandAll(v => !v)} className="text-xs text-[#1a1a1a] underline hover:underline">{expandAll ? 'Alle einklappen' : 'Alle aufklappen'}</button>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#bbb] flex-wrap -mt-3">
            <span className="flex items-center gap-1.5"><Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />Portal aktiv</span>
            <span className="flex items-center gap-1.5"><Circle className="h-2 w-2 fill-amber-400 text-amber-400" />Eingeladen</span>
            <span className="flex items-center gap-1.5"><Circle className="h-2 w-2 fill-red-400 text-red-400" />Nicht eingeladen</span>
          </div>
        </>
      )}
      {units.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#d4d2cc] bg-[#fafaf8] px-6 py-12 text-center">
          <Building2 className="h-10 w-10 text-[#d4d2cc] mx-auto mb-3" />
          <p className="text-[#888] text-sm">Noch keine Einheiten angelegt.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {units.map(unit => <ExpandableUnit key={unit.id} unit={unit} forceOpen={expandAll} />)}
        </div>
      )}
    </div>
  )
}
