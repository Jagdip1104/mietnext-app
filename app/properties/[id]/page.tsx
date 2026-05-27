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
type Tenant = { id: string; name: string; email: string | null; phone: string | null; user_id: string | null; invited_at: string | null; unit_id: string }
type Contract = { id: string; unit_id: string; start_date: string; end_date: string | null; rent_amount: number; status: string }
type Payment = { id: string; contract_id: string; amount: number; due_date: string; paid_date: string | null; status: string }
type RawUnit = { id: string; name: string; unit_code: string | null; floor: string | null; size_sqm: number | null }
type UnitRow = RawUnit & { tenant: Tenant | null; contract: Contract | null; lastPayment: Payment | null }

function inviteStatus(tenant: Tenant | null) {
  if (!tenant) return null
  if (tenant.user_id) return 'active'
  if (tenant.invited_at) return 'invited'
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
    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <button onClick={() => setOpen(o => !o)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isVacant ? 'bg-gray-50 hover:bg-gray-100' : 'bg-white hover:bg-gray-50'}`}>
        <span className="text-gray-400 flex-shrink-0">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 text-sm">{unit.name}</span>
          {unit.unit_code && <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{unit.unit_code}</span>}
          {unit.floor != null && <span className="text-xs text-gray-400 flex items-center gap-0.5"><Layers className="h-3 w-3" />{unit.floor === '0' || unit.floor === 'EG' ? 'EG' : `${unit.floor}. OG`}</span>}
          {unit.size_sqm && <span className="text-xs text-gray-400">{unit.size_sqm} m²</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isVacant ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500"><UserX className="h-3 w-3" />Leerstand</span>
          ) : (
            <>
              <span className="text-sm text-gray-700 hidden sm:block">{unit.tenant!.name}</span>
              {status === 'active'      && <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />}
              {status === 'invited'     && <Circle className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />}
              {status === 'not_invited' && <Circle className="h-2.5 w-2.5 fill-red-400 text-red-400" />}
              <PaymentBadge payment={unit.lastPayment} />
            </>
          )}
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
          {isVacant ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Diese Einheit hat keinen Mieter.</p>
              <Link href={`/tenants?unit=${unit.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"><Plus className="h-3.5 w-3.5" />Mieter anlegen</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1"><User className="h-3.5 w-3.5" />Mieter</p>
                <p className="text-sm font-medium text-gray-900">{unit.tenant!.name}</p>
                {unit.tenant!.email && <a href={`mailto:${unit.tenant!.email}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"><Mail className="h-3 w-3" />{unit.tenant!.email}</a>}
                {unit.tenant!.phone && <a href={`tel:${unit.tenant!.phone}`} className="flex items-center gap-1.5 text-xs text-gray-600"><Phone className="h-3 w-3" />{unit.tenant!.phone}</a>}
                <div>
                  {status === 'active' && <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-3 w-3" />Portal-Zugang aktiv</span>}
                  {status === 'invited' && <span className="inline-flex items-center gap-1 text-xs text-amber-700"><Clock className="h-3 w-3" />Eingeladen {formatDate(unit.tenant!.invited_at)}</span>}
                  {status === 'not_invited' && <Link href="/invite-tenant" className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"><AlertCircle className="h-3 w-3" />Nicht eingeladen →</Link>}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1"><FileText className="h-3.5 w-3.5" />Vertrag</p>
                {unit.contract ? (
                  <>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(unit.contract.rent_amount)}<span className="text-xs font-normal text-gray-500 ml-1">/ Monat</span></p>
                    <p className="text-xs text-gray-500">{formatDate(unit.contract.start_date)} – {unit.contract.end_date ? formatDate(unit.contract.end_date) : 'unbefristet'}</p>
                    <span className={`inline-block text-xs rounded-full px-2 py-0.5 font-medium ${unit.contract.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-600'}`}>{unit.contract.status === 'active' ? 'Aktiv' : unit.contract.status}</span>
                  </>
                ) : <p className="text-xs text-gray-400">Kein Vertrag gefunden</p>}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" />Letzte Zahlung</p>
                {unit.lastPayment ? (
                  <>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(unit.lastPayment.amount)}</p>
                    <p className="text-xs text-gray-500">Fällig: {formatDate(unit.lastPayment.due_date)}</p>
                    {unit.lastPayment.paid_date && <p className="text-xs text-gray-500">Bezahlt: {formatDate(unit.lastPayment.paid_date)}</p>}
                    <PaymentBadge payment={unit.lastPayment} />
                  </>
                ) : <p className="text-xs text-gray-400">Keine Zahlungen</p>}
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
    const { data: rawUnitsData } = await supabase.from('units').select('id, name, unit_code, floor, size_sqm').eq('property_id', propertyId).order('name')
    const rawUnits = (rawUnitsData ?? []) as RawUnit[]
    if (!rawUnits.length) { setUnits([]); setLoading(false); return }
    const unitIds = rawUnits.map(u => u.id)
    const { data: tenantsData } = await supabase.from('tenants').select('id, name, email, phone, user_id, invited_at, unit_id').in('unit_id', unitIds)
    const tenants = (tenantsData ?? []) as Tenant[]
    const { data: contractsData } = await supabase.from('contracts').select('id, unit_id, start_date, end_date, rent_amount, status').in('unit_id', unitIds).eq('status', 'active').order('start_date', { ascending: false })
    const contracts = (contractsData ?? []) as Contract[]
    const contractIds = contracts.map(c => c.id)
    const { data: paymentsData } = contractIds.length
      ? await supabase.from('payments').select('id, contract_id, amount, due_date, paid_date, status').in('contract_id', contractIds).order('due_date', { ascending: false })
      : { data: [] }
    const payments = (paymentsData ?? []) as Payment[]
    const tenantByUnit = new Map<string, Tenant>()
    for (const t of tenants) tenantByUnit.set(t.unit_id, t)
    const contractByUnit = new Map<string, Contract>()
    for (const c of contracts) { if (!contractByUnit.has(c.unit_id)) contractByUnit.set(c.unit_id, c) }
    const lastPaymentByContract = new Map<string, Payment>()
    for (const p of payments) { if (!lastPaymentByContract.has(p.contract_id)) lastPaymentByContract.set(p.contract_id, p) }
    const assembled: UnitRow[] = rawUnits.map(u => {
      const tenant = tenantByUnit.get(u.id) ?? null
      const contract = contractByUnit.get(u.id) ?? null
      const lastPayment = contract ? (lastPaymentByContract.get(contract.id) ?? null) : null
      return { ...u, tenant, contract, lastPayment }
    })
    setUnits(assembled); setLoading(false)
  }

  const totalUnits = units.length
  const occupied = units.filter((u: any) => u.is_occupied).length
  const vacant = totalUnits - occupied
  const overdueCount = units.filter(u => u.lastPayment?.status === 'overdue').length

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
  if (error) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
      <p className="text-gray-600">{error}</p>
      <Link href="/properties" className="mt-4 inline-block text-sm text-blue-600 hover:underline">← Zurück zur Übersicht</Link>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href="/properties" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4"><ArrowLeft className="h-4 w-4" />Alle Objekte</Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Building2 className="h-6 w-6 text-blue-600 flex-shrink-0" />{property!.name}</h1>
            <p className="text-gray-500 mt-0.5 text-sm">
              {property!.address}
              {(property!.zip || property!.city) && `, ${[property!.zip, property!.city].filter(Boolean).join(' ')}`}
            </p>
          </div>
          <Link href={`/units?property=${propertyId}`} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex-shrink-0"><Plus className="h-4 w-4" />Einheit hinzufügen</Link>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Einheiten gesamt', value: totalUnits, color: 'text-gray-900' },
          { label: 'Vermietet', value: occupied, color: 'text-emerald-700' },
          { label: 'Leerstand', value: vacant, color: vacant > 0 ? 'text-amber-600' : 'text-gray-400' },
          { label: 'Überfällig', value: overdueCount, color: overdueCount > 0 ? 'text-red-600' : 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      {units.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Einheiten ({totalUnits})</h2>
            <button onClick={() => setExpandAll(v => !v)} className="text-xs text-blue-600 hover:underline">{expandAll ? 'Alle einklappen' : 'Alle aufklappen'}</button>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap -mt-3">
            <span className="flex items-center gap-1.5"><Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />Portal aktiv</span>
            <span className="flex items-center gap-1.5"><Circle className="h-2 w-2 fill-amber-400 text-amber-400" />Eingeladen</span>
            <span className="flex items-center gap-1.5"><Circle className="h-2 w-2 fill-red-400 text-red-400" />Nicht eingeladen</span>
          </div>
        </>
      )}
      {units.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
          <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Noch keine Einheiten angelegt.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {units.map(unit => <ExpandableUnit key={unit.id} unit={unit} forceOpen={expandAll} />)}
        </div>
      )}
    </div>
  )
}
