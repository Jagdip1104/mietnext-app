'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import PlanUsageBanner from '@/components/PlanUsageBanner'

interface ActionItem {
  priority: 'urgent' | 'warning' | 'info'
  title: string
  description: string
  href?: string
}

interface MonthlyData {
  month: string
  label: string
  income: number
  expected: number
}

interface Activity {
  icon: string
  text: string
  meta: string
}

interface Stats {
  properties: number
  units: number
  occupiedUnits: number
  vacantUnits: number
  tenants: number
  monthlyIncome: number
  monthlyExpected: number
  paymentQuote: number
  paidCountMonth: number
  expectedCountMonth: number
  lateCount: number
  prevMonthlyIncome: number
  forecast30Days: number
  pendingPayments: number
  latePayments: number
  paymentPunctualityRate: number
  vacancyCostMonth: number
  openTickets: number
  actionItems: ActionItem[]
  recentActivity: Activity[]
  woUnits: number
  gewerbeUnits: number
  lagerUnits: number
  stellplatzUnits: number
  woUnitsOccupied: number
  gewerbeUnitsOccupied: number
  lagerUnitsOccupied: number
  stellplatzUnitsOccupied: number
  monthlyChart: MonthlyData[]
}

const NULL_UUID = '00000000-0000-0000-0000-000000000000'
const BENCHMARK_OCCUPANCY = 88

function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T12:00:00')
  const now = new Date()
  const diffHours = (now.getTime() - date.getTime()) / 3600000
  if (diffHours < 24) return 'heute'
  if (diffHours < 48) return 'gestern'
  if (diffHours < 168) return `vor ${Math.floor(diffHours / 24)} Tagen`
  return date.toLocaleDateString('de-DE')
}

function fmtCurrency(value: number): string {
  return Math.round(value).toLocaleString('de-DE') + ' €'
}

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [landlordName, setLandlordName] = useState('')
  const router = useRouter()

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadDashboard() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const userId = session.user.id
    const userEmail = (session.user.email ?? '').toLowerCase().trim()

    // Vermieter-Guard
    const { data: profile } = await supabase
      .from('profiles').select('id, landlord_name').eq('id', userId).maybeSingle()
    const { count: propCount } = await supabase
      .from('properties').select('id', { count: 'exact', head: true }).eq('owner_id', userId)
    const hasProperties = (propCount ?? 0) > 0
    const { data: tenantRows } = await supabase
      .from('tenants').select('id')
      .or(`user_id.eq.${userId},email.eq.${userEmail}`).limit(1)
    const isTenant = (tenantRows?.length ?? 0) > 0
    const isLandlord = !!profile && (hasProperties || !isTenant)
    if (!isLandlord) { router.push('/role-select?error=no-landlord'); return }

    setUser(session.user)
    setLandlordName((profile as any)?.landlord_name || '')

    // === Load Data ===
    const { data: properties } = await supabase
      .from('properties').select('id, name').eq('owner_id', userId)
    const propertyIds = (properties || []).map((p: any) => p.id)
    const propIdsSafe = propertyIds.length ? propertyIds : [NULL_UUID]

    const { data: units } = await supabase
      .from('units').select('id, property_id, name, is_occupied, rent_amount, type')
      .in('property_id', propIdsSafe)
    const unitIds = (units || []).map((u: any) => u.id)
    const unitIdsSafe = unitIds.length ? unitIds : [NULL_UUID]

    const { data: contracts } = await supabase
      .from('contracts').select('id, tenant_id, unit_id, rent_amount, start_date, end_date, is_active, deposit, deposit_returned_at')
      .in('unit_id', unitIdsSafe)
    const contractIds = (contracts || []).map((c: any) => c.id)
    const contractIdsSafe = contractIds.length ? contractIds : [NULL_UUID]

    const tenantIds = [...new Set((contracts || []).map((c: any) => c.tenant_id).filter(Boolean))]
    const { data: tenants } = await supabase
      .from('tenants').select('id, full_name')
      .in('id', tenantIds.length ? tenantIds : [NULL_UUID])

    const { data: rentIncreases } = await supabase
      .from('rent_increases').select('contract_id, effective_date')
      .in('contract_id', contractIdsSafe)

    // === Dates ===
    const today = new Date()
    const todayStr = dateStr(today)
    const firstDayMonth = dateStr(new Date(today.getFullYear(), today.getMonth(), 1))
    const lastDayMonth = dateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0))
    const firstDayPrev = dateStr(new Date(today.getFullYear(), today.getMonth() - 1, 1))
    const lastDayPrev = dateStr(new Date(today.getFullYear(), today.getMonth(), 0))
    const in30Days = dateStr(new Date(today.getTime() + 30 * 86400000))
    const in90Days = dateStr(new Date(today.getTime() + 90 * 86400000))
    const oneYearAgo = dateStr(new Date(today.getTime() - 365 * 86400000))

    // === Income (THIS MONTH only - BUG FIX) ===
    const { data: paidThisMonth } = await supabase
      .from('payments').select('amount')
      .in('contract_id', contractIdsSafe)
      .eq('status', 'paid')
      .gte('due_date', firstDayMonth)
      .lte('due_date', lastDayMonth)
    const monthlyIncome = (paidThisMonth || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)

    // Soll diesen Monat (egal welcher Status)
    const { data: expectedThisMonth } = await supabase
      .from('payments').select('amount')
      .in('contract_id', contractIdsSafe)
      .gte('due_date', firstDayMonth)
      .lte('due_date', lastDayMonth)
    const monthlyExpected = (expectedThisMonth || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
    const paymentQuote = monthlyExpected > 0 ? Math.round((monthlyIncome / monthlyExpected) * 100) : 0
    const paidCountMonth = (paidThisMonth || []).length
    const expectedCountMonth = (expectedThisMonth || []).length

    // Previous month for trend
    const { data: paidPrev } = await supabase
      .from('payments').select('amount')
      .in('contract_id', contractIdsSafe)
      .eq('status', 'paid')
      .gte('due_date', firstDayPrev)
      .lte('due_date', lastDayPrev)
    const prevMonthlyIncome = (paidPrev || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)

    // Pending + Late
    const { data: pending } = await supabase
      .from('payments').select('amount')
      .in('contract_id', contractIdsSafe).eq('status', 'pending')
    const pendingPayments = (pending || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)

    const { data: late } = await supabase
      .from('payments').select('amount, due_date')
      .in('contract_id', contractIdsSafe).eq('status', 'late')
    const latePayments = (late || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
    const lateCount = (late || []).length

    // Forecast 30 Days
    const { data: forecast } = await supabase
      .from('payments').select('amount')
      .in('contract_id', contractIdsSafe).eq('status', 'pending')
      .gte('due_date', todayStr).lte('due_date', in30Days)
    const forecast30Days = (forecast || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)

    // Punctuality (last 12 months)
    const { data: yearPayments } = await supabase
      .from('payments').select('paid_date, due_date, status')
      .in('contract_id', contractIdsSafe)
      .gte('due_date', oneYearAgo).lte('due_date', todayStr)

    let onTime = 0, totalCheckable = 0
    ;(yearPayments || []).forEach((p: any) => {
      totalCheckable++
      if (p.status === 'paid' && p.paid_date && p.paid_date <= p.due_date) onTime++
    })
    const paymentPunctualityRate = totalCheckable > 0 ? Math.round((onTime / totalCheckable) * 100) : 100

    // Vacant units
    const vacantUnits = (units || []).filter((u: any) => !u.is_occupied)
    const vacancyCostMonth = vacantUnits.reduce((s: number, u: any) => s + Number(u.rent_amount || 0), 0)

    // === Action Items ===
    const actionItems: ActionItem[] = []

    // Auslaufende Verträge
    const expiring = (contracts || []).filter((c: any) =>
      c.is_active && c.end_date && c.end_date >= todayStr && c.end_date <= in90Days
    )
    expiring.forEach((c: any) => {
      const daysLeft = Math.ceil((new Date(c.end_date!).getTime() - today.getTime()) / 86400000)
      const tenant = (tenants || []).find((t: any) => t.id === c.tenant_id)
      const unit = (units || []).find((u: any) => u.id === c.unit_id)
      const prop = (properties || []).find((p: any) => p.id === unit?.property_id)
      const priority: 'urgent' | 'warning' | 'info' =
        daysLeft <= 14 ? 'urgent' : daysLeft <= 30 ? 'warning' : 'info'
      actionItems.push({
        priority,
        title: `Vertrag mit ${tenant?.full_name || '—'} läuft in ${daysLeft} ${daysLeft === 1 ? 'Tag' : 'Tagen'} aus`,
        description: `${prop?.name || ''}${unit?.name ? ' · ' + unit.name : ''}`,
        href: '/contracts'
      })
    })

    // Überfällige Zahlungen
    if (late && late.length > 0) {
      actionItems.push({
        priority: 'urgent',
        title: `${late.length} überfällige ${late.length === 1 ? 'Zahlung' : 'Zahlungen'} — ${fmtCurrency(latePayments)}`,
        description: 'Mahnung versenden oder klären',
        href: '/payments'
      })
    }

    // Leere Einheiten
    if (vacantUnits.length > 0) {
      actionItems.push({
        priority: 'info',
        title: `${vacantUnits.length} ${vacantUnits.length === 1 ? 'Einheit' : 'Einheiten'} leer · ${fmtCurrency(vacancyCostMonth)}/Monat entgangen`,
        description: vacantUnits.slice(0, 2).map((u: any) => u.name).join(', ') + (vacantUnits.length > 2 ? '…' : ''),
        href: '/units'
      })
    }

    // NK-Abrechnung fehlt für letztes Jahr
    const lastYear = today.getFullYear() - 1
    const { data: utilityStmt } = await supabase
      .from('utility_statements').select('property_id, year')
      .in('property_id', propIdsSafe).eq('year', lastYear)
    const propsWithStmts = new Set((utilityStmt || []).map((s: any) => s.property_id))
    const propsWithoutStmts = (properties || []).filter((p: any) => !propsWithStmts.has(p.id))

    if (propsWithoutStmts.length > 0) {
      const nkDeadline = new Date(lastYear + 1, 11, 31)
      const nkDaysLeft = Math.ceil((nkDeadline.getTime() - today.getTime()) / 86400000)
      const nkPrio: 'urgent' | 'warning' | 'info' = nkDaysLeft <= 90 ? 'urgent' : nkDaysLeft <= 180 ? 'warning' : 'info'
      const nkNames = propsWithoutStmts.slice(0, 2).map((p: any) => p.name).join(', ') + (propsWithoutStmts.length > 2 ? '…' : '')
      if (nkDaysLeft > 0) {
        actionItems.push({
          priority: nkPrio,
          title: `NK-Abrechnung ${lastYear}: noch ${nkDaysLeft} Tage Frist (§ 556 BGB)`,
          description: `Fehlt für ${propsWithoutStmts.length} ${propsWithoutStmts.length === 1 ? 'Objekt' : 'Objekte'}: ${nkNames} — nach dem 31.12.${lastYear + 1} verfällt die Nachforderung`,
          href: '/nebenkostenabrechnung'
        })
      } else {
        actionItems.push({
          priority: 'urgent',
          title: `NK-Abrechnung ${lastYear}: Frist am 31.12.${lastYear + 1} abgelaufen`,
          description: `${nkNames} — Nachforderungen sind verfallen (§ 556 Abs. 3 BGB), Guthaben des Mieters bleibt fällig`,
          href: '/nebenkostenabrechnung'
        })
      }
    }

    // Fristen-Radar: Kautionsrueckzahlung nach Auszug
    const sixMonthsAgo = dateStr(new Date(today.getTime() - 180 * 86400000))
    const endedWithDeposit = (contracts || []).filter((c: any) =>
      Number(c.deposit || 0) > 0 && c.end_date && c.end_date < todayStr && c.end_date >= sixMonthsAgo
    )
    endedWithDeposit.forEach((c: any) => {
      const t = (tenants || []).find((tt: any) => tt.id === c.tenant_id)
      const u = (units || []).find((uu: any) => uu.id === c.unit_id)
      actionItems.push({
        priority: 'warning',
        title: `Kaution ${fmtCurrency(Number(c.deposit))} von ${t?.full_name || '—'} abrechnen`,
        description: `Vertrag endete am ${new Date(c.end_date).toLocaleDateString('de-DE')}${u?.name ? ' · ' + u.name : ''} — angemessene Prüffrist (ca. 6 Monate) läuft`,
        href: '/contracts'
      })
    })

    // Fristen-Radar: §558-Sperrfrist abgelaufen -> Mieterhoehungs-Chance
    const twelveMonthsAgo = dateStr(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()))
    const lastIncrease: { [key: string]: string } = {}
    ;(rentIncreases || []).forEach((inc: any) => {
      if (!lastIncrease[inc.contract_id] || inc.effective_date > lastIncrease[inc.contract_id]) {
        lastIncrease[inc.contract_id] = inc.effective_date
      }
    })
    const erhoehbar = (contracts || []).filter((c: any) => {
      if (!c.is_active || Number(c.rent_amount || 0) <= 0) return false
      const last = lastIncrease[c.id] || c.start_date
      return last && last <= twelveMonthsAgo
    })
    if (erhoehbar.length > 0) {
      const ehNames = erhoehbar.slice(0, 2).map((c: any) => (tenants || []).find((tt: any) => tt.id === c.tenant_id)?.full_name || '—').join(', ')
      actionItems.push({
        priority: 'info',
        title: `Mieterhöhung möglich bei ${erhoehbar.length} ${erhoehbar.length === 1 ? 'Vertrag' : 'Verträgen'} (§ 558 Sperrfrist um)`,
        description: ehNames + (erhoehbar.length > 2 ? '…' : '') + ' — Miete seit 12+ Monaten unverändert',
        href: '/contracts'
      })
    }

    // Sort by priority
    const priorityOrder: Record<string, number> = { urgent: 0, warning: 1, info: 2 }
    actionItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    // === Tickets ===
    const { data: tickets } = await supabase
      .from('tickets').select('id').in('unit_id', unitIdsSafe).eq('status', 'open')
    const openTickets = (tickets || []).length

    if (openTickets > 0) {
      actionItems.push({
        priority: 'warning',
        title: `${openTickets} offene${openTickets === 1 ? 's' : ''} Ticket${openTickets === 1 ? '' : 's'}`,
        description: 'Anfragen von Mietern bearbeiten',
        href: '/tickets'
      })
    }

    // === Activity Feed ===
    const recentActivity: Activity[] = []
    const { data: recentPaid } = await supabase
      .from('payments').select('amount, paid_date, due_date, contract_id')
      .in('contract_id', contractIdsSafe).eq('status', 'paid')
      .not('paid_date', 'is', null)
      .order('paid_date', { ascending: false }).limit(5)
    ;(recentPaid || []).forEach((p: any) => {
      const c = (contracts || []).find((cc: any) => cc.id === p.contract_id)
      const t = (tenants || []).find((tt: any) => tt.id === c?.tenant_id)
      const u = (units || []).find((uu: any) => uu.id === c?.unit_id)
      const multiUnit = (contracts || []).filter((cc: any) => cc.tenant_id === c?.tenant_id).length > 1
      const monat = p.due_date ? new Date(p.due_date + 'T12:00:00').toLocaleDateString('de-DE', { month: 'long' }) : ''
      recentActivity.push({
        icon: '💰',
        text: `${t?.full_name || 'Unbekannt'} zahlte ${fmtCurrency(Number(p.amount))}${monat ? ' für ' + monat : ''}${multiUnit && u?.name ? ' · ' + u.name : ''}`,
        meta: formatRelativeDate(p.paid_date)
      })
    })

    // Unit type breakdown
    const woUnits = (units || []).filter((u: any) => u.type === 'wohnung').length
    const woUnitsOccupied = (units || []).filter((u: any) => u.type === 'wohnung' && u.is_occupied).length
    const gewerbeUnits = (units || []).filter((u: any) => u.type === 'gewerbe').length
    const gewerbeUnitsOccupied = (units || []).filter((u: any) => u.type === 'gewerbe' && u.is_occupied).length
    const lagerUnits = (units || []).filter((u: any) => u.type === 'lager').length
    const lagerUnitsOccupied = (units || []).filter((u: any) => u.type === 'lager' && u.is_occupied).length
    const stellplatzUnits = (units || []).filter((u: any) => u.type === 'stellplatz').length
    const stellplatzUnitsOccupied = (units || []).filter((u: any) => u.type === 'stellplatz' && u.is_occupied).length

    // === Monthly Chart (12 Monate) ===
    const monthsAgo12 = dateStr(new Date(today.getFullYear() - 1, today.getMonth(), 1))
    const { data: yearlyPayments } = await supabase
      .from('payments').select('amount, due_date, status')
      .in('contract_id', contractIdsSafe)
      .eq('status', 'paid')
      .gte('due_date', monthsAgo12)
      .lte('due_date', lastDayMonth)

    const { data: yearlyExpected } = await supabase
      .from('payments').select('amount, due_date')
      .in('contract_id', contractIdsSafe)
      .gte('due_date', monthsAgo12)
      .lte('due_date', lastDayMonth)

    const monthLabels = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
    const monthlyChart: MonthlyData[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      const monthIncome = (yearlyPayments || [])
        .filter((p: any) => p.due_date && p.due_date.startsWith(monthKey))
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
      const monthExpected = (yearlyExpected || [])
        .filter((p: any) => p.due_date && p.due_date.startsWith(monthKey))
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
      monthlyChart.push({ month: monthKey, label: monthLabels[d.getMonth()], income: monthIncome, expected: monthExpected })
    }
    const firstDataIdx = monthlyChart.findIndex(m => m.income > 0 || m.expected > 0)
    const trimmedChart = firstDataIdx > 0 ? monthlyChart.slice(Math.min(firstDataIdx, monthlyChart.length - 6)) : monthlyChart

    setStats({
      properties: properties?.length || 0,
      units: units?.length || 0,
      occupiedUnits: (units || []).filter((u: any) => u.is_occupied).length,
      vacantUnits: vacantUnits.length,
      tenants: tenants?.length || 0,
      monthlyIncome,
      monthlyExpected,
      paymentQuote,
      paidCountMonth,
      expectedCountMonth,
      lateCount,
      prevMonthlyIncome,
      forecast30Days,
      pendingPayments,
      latePayments,
      paymentPunctualityRate,
      vacancyCostMonth,
      openTickets,
      actionItems,
      recentActivity,
      woUnits,
      gewerbeUnits,
      lagerUnits,
      stellplatzUnits,
      woUnitsOccupied,
      gewerbeUnitsOccupied,
      lagerUnitsOccupied,
      stellplatzUnitsOccupied,
      monthlyChart: trimmedChart
    })
    setLoading(false)
  }

  if (loading || !stats) {
    return (
      <>
        <Nav />
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1.25rem 6rem' }}>
          <div className="mn-skeleton" style={{ height: '34px', width: '280px', marginBottom: '8px' }} />
          <div className="mn-skeleton" style={{ height: '14px', width: '200px', marginBottom: '24px' }} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ marginBottom: '1.5rem' }}>
            {[0, 1, 2, 3].map(i => <div key={i} className="mn-skeleton" style={{ height: '110px' }} />)}
          </div>
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
            <div className="mn-skeleton" style={{ height: '220px' }} />
            <div className="mn-skeleton" style={{ height: '220px' }} />
          </div>
        </main>
      </>
    )
  }

  // === Render Helpers ===
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend'
  const greetingEmoji = hour < 12 ? '☀️' : hour < 18 ? '👋' : '🌙'
  const userName = landlordName || user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Vermieter'

  const occupancyRate = stats.units > 0 ? Math.round((stats.occupiedUnits / stats.units) * 100) : 0
  const occupancyDelta = occupancyRate - BENCHMARK_OCCUPANCY

  const trendPct = stats.prevMonthlyIncome > 0
    ? Math.round(((stats.monthlyIncome - stats.prevMonthlyIncome) / stats.prevMonthlyIncome) * 1000) / 10
    : 0
  const trendUp = trendPct > 0
  const trendDown = trendPct < 0

  const urgentCount = stats.actionItems.filter((a: any) => a.priority === 'urgent').length

  // Status pills
  const statusPills: Array<{ label: string, color: 'ok' | 'warn' | 'urgent' }> = []
  if (urgentCount > 0) {
    statusPills.push({ label: `${urgentCount} dringend`, color: 'urgent' })
  } else if (stats.latePayments === 0 && stats.actionItems.length === 0) {
    statusPills.push({ label: 'Alles unter Kontrolle', color: 'ok' })
  } else if (stats.latePayments === 0) {
    statusPills.push({ label: 'Cashflow gesund', color: 'ok' })
  }

  // Donut math
  const donutCircum = 2 * Math.PI * 40
  const donutFill = (occupancyRate / 100) * donutCircum
  const donutColor = occupancyRate >= BENCHMARK_OCCUPANCY ? '#16a34a'
    : occupancyRate >= 70 ? '#1a1a1a' : '#d97706'

  // Pick best Smart-Insight
  let smartInsight = ''
  if (occupancyDelta < -5 && stats.vacancyCostMonth > 0) {
    smartInsight = `Deine Auslastung liegt ${Math.abs(occupancyDelta)}% unter dem Branchen-Durchschnitt (${BENCHMARK_OCCUPANCY}%). ${stats.vacantUnits} leere ${stats.vacantUnits === 1 ? 'Einheit bedeutet' : 'Einheiten bedeuten'} ~${fmtCurrency(stats.vacancyCostMonth)}/Monat entgangene Einnahmen — also ~${fmtCurrency(stats.vacancyCostMonth * 12)}/Jahr.`
  } else if (stats.paymentPunctualityRate >= 95 && totalRecentPayments(stats) > 5) {
    smartInsight = `Du hast ${stats.paymentPunctualityRate}% Zahlungs-Pünktlichkeit über die letzten 12 Monate — exzellent! Branchen-Durchschnitt liegt bei ~85%. Deine Mieterauswahl funktioniert.`
  } else if (stats.paymentPunctualityRate < 80 && totalRecentPayments(stats) > 5) {
    smartInsight = `Deine Zahlungs-Pünktlichkeit liegt bei ${stats.paymentPunctualityRate}% (Branche ~85%). Verbesserung im Mahnwesen oder strenge Mieterprüfung könnten helfen.`
  } else if (stats.vacantUnits === 0 && stats.actionItems.length === 0) {
    smartInsight = `Volle Auslastung und keine offenen Aufgaben — exzellent! Jetzt wäre ein guter Zeitpunkt für strategische Themen: Mieterhöhungs-Check (§ 558 BGB), Energie-Sanierungs-Planung, oder Mietspiegel-Anpassung.`
  } else {
    smartInsight = `Du verwaltest ${stats.units} Einheiten in ${stats.properties} ${stats.properties === 1 ? 'Objekt' : 'Objekten'} mit ${fmtCurrency(stats.monthlyIncome * 12)} Jahres-Brutto. Auslastung ${occupancyRate}% (Branche ${BENCHMARK_OCCUPANCY}%).`
  }

  return (
    <>
      <Nav />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1.25rem 6rem' }}>
        <PlanUsageBanner />

        {/* === Header === */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px'
        }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 400, margin: 0, fontFamily: 'Georgia, serif' }}>
              {greeting}, {userName}
            </h1>
            <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
              {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {stats.actionItems.length > 0 && (
                <> · Du hast <strong>{stats.actionItems.length}</strong> {stats.actionItems.length === 1 ? 'Aufgabe' : 'Aufgaben'}</>
              )}
            </div>
          </div>
          {statusPills.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {statusPills.map((p, i) => (
                <span key={i} style={{
                  padding: '5px 12px', borderRadius: '12px',
                  fontSize: '11.5px', fontWeight: 500,
                  background: p.color === 'ok' ? '#EAF3DE' : p.color === 'warn' ? '#FAEEDA' : '#FCEBEB',
                  color: p.color === 'ok' ? '#3B6D11' : p.color === 'warn' ? '#854F0B' : '#A32D2D'
                }}>
                  {p.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* === Monats-Hero === */}
        <a href="/payments" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <div style={{ ...cardStyle, marginBottom: '12px', padding: '20px' }}>
            <div style={kpiLabelStyle}>Mieteingang {new Date().toLocaleDateString('de-DE', { month: 'long' })}</div>
            <div style={{ fontSize: '34px', fontWeight: 400, fontFamily: 'Georgia, serif', color: '#1a1a1a', lineHeight: 1.15 }}>
              {fmtCurrency(stats.monthlyIncome)}
              <span style={{ fontSize: '15px', color: '#888' }}> von {fmtCurrency(stats.monthlyExpected)}</span>
            </div>
            <div style={{ height: '8px', background: '#f0eeea', borderRadius: '4px', margin: '14px 0 10px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: Math.min(stats.paymentQuote, 100) + '%', background: '#16a34a', borderRadius: '4px', transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', flexWrap: 'wrap', gap: '6px' }}>
              <span><strong style={{ color: '#1a1a1a' }}>{stats.paidCountMonth} von {stats.expectedCountMonth}</strong> Mieten eingegangen</span>
              {trendPct !== 0 && (
                <span style={{ color: trendUp ? '#16a34a' : '#d97706' }}>
                  {trendUp ? '↑' : '↓'} {Math.abs(trendPct)}% vs. Vormonat
                </span>
              )}
            </div>
          </div>
        </a>

        {/* === Quick-Actions (N26-Pills) === */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '1.25rem', WebkitOverflowScrolling: 'touch' }}>
          <a href="/properties" style={{ ...qaPrimaryStyle, whiteSpace: 'nowrap', flexShrink: 0 }}>+ Objekt</a>
          <a href="/payments" style={{ ...qaStyle, whiteSpace: 'nowrap', flexShrink: 0 }}>Zahlung erfassen</a>
          <a href="/kosten" style={{ ...qaStyle, whiteSpace: 'nowrap', flexShrink: 0 }}>Kosten erfassen</a>
          <a href="/kosten/stapel" style={{ ...qaStyle, whiteSpace: 'nowrap', flexShrink: 0 }}>Beleg scannen</a>
          <a href="/nebenkostenabrechnung" style={{ ...qaStyle, whiteSpace: 'nowrap', flexShrink: 0 }}>NK-Abrechnung</a>
          <a href="/import" style={{ ...qaStyle, whiteSpace: 'nowrap', flexShrink: 0 }}>Excel-Import</a>
          <a href="/tenants" style={{ ...qaStyle, whiteSpace: 'nowrap', flexShrink: 0 }}>+ Mieter</a>
          <a href="/units" style={{ ...qaStyle, whiteSpace: 'nowrap', flexShrink: 0 }}>+ Einheit</a>
          <a href="/guv" style={{ ...qaStyle, whiteSpace: 'nowrap', flexShrink: 0 }}>GuV</a>
          <a href="/mietvertrag" style={{ ...qaStyle, whiteSpace: 'nowrap', flexShrink: 0 }}>Mietvertrag</a>
        </div>

        {/* === KPI Cards === */}
        <div className="grid grid-cols-3 gap-2 md:gap-3" style={{ marginBottom: '1.5rem' }}>
          <a href="/payments" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ ...kpiCardStyle, height: '100%', borderColor: stats.lateCount > 0 ? '#fecaca' : '#e8e6e0' }}>
              <div style={kpiLabelStyle}>Überfällig</div>
              <div style={{ ...kpiValueStyle, color: stats.lateCount > 0 ? '#dc2626' : '#16a34a' }}>
                {fmtCurrency(stats.latePayments)}
              </div>
              <div style={{ fontSize: '11.5px', color: stats.lateCount > 0 ? '#dc2626' : '#888' }}>
                {stats.lateCount > 0 ? stats.lateCount + (stats.lateCount === 1 ? ' Zahlung → Mahnung' : ' Zahlungen → Mahnung') : 'Nichts überfällig ✓'}
              </div>
            </div>
          </a>

          <a href="/units" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ ...kpiCardStyle, height: '100%' }}>
              <div style={kpiLabelStyle}>Auslastung</div>
              <div style={{ ...kpiValueStyle, color: occupancyRate >= BENCHMARK_OCCUPANCY ? '#16a34a' : '#1a1a1a' }}>
                {occupancyRate}%
              </div>
              <div style={{
                fontSize: '11.5px',
                color: occupancyDelta >= 0 ? '#16a34a' : '#d97706'
              }}>
                {occupancyDelta >= 0 ? '↑' : '↓'} {Math.abs(occupancyDelta)}% vs. Branchen-Ø ({BENCHMARK_OCCUPANCY}%)
              </div>
            </div>
          </a>

          <div style={kpiCardStyle}>
            <div style={kpiLabelStyle}>Offene Aufgaben</div>
            <div style={{
              ...kpiValueStyle,
              color: urgentCount > 0 ? '#d97706' : '#1a1a1a'
            }}>
              {stats.actionItems.length}
            </div>
            <div style={{ fontSize: '11.5px', color: urgentCount > 0 ? '#d97706' : '#888' }}>
              {urgentCount > 0 ? `${urgentCount} dringend` : stats.actionItems.length === 0 ? 'Alles erledigt ✓' : 'Zu erledigen'}
            </div>
          </div>
        </div>

        {/* === Action Items + Auslastung === */}
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2" style={{ marginBottom: '1.5rem' }}>
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h3 style={cardTitleStyle}>Was steht an?</h3>
            </div>
            {stats.actionItems.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                Keine offenen Aufgaben — top!
              </div>
            ) : (
              stats.actionItems.slice(0, 6).map((item, i) => (
                <a key={i} href={item.href || '#'} style={{
                  textDecoration: 'none', color: 'inherit', display: 'block'
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    padding: '12px 0',
                    borderBottom: i < Math.min(stats.actionItems.length, 6) - 1 ? '1px solid #e8e6e0' : 'none',
                    cursor: 'pointer'
                  }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      marginTop: '6px', flexShrink: 0,
                      background: item.priority === 'urgent' ? '#dc2626'
                        : item.priority === 'warning' ? '#d97706' : '#bbb'
                    }} />
                    <div style={{ flex: 1, fontSize: '13px', lineHeight: 1.5 }}>
                      <div>{item.title}</div>
                      <div style={{ fontSize: '11.5px', color: '#bbb', marginTop: '2px' }}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>

          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h3 style={cardTitleStyle}>Auslastung & Mix</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {(() => {
                const c2pi = 2 * Math.PI * 40
                const totalU = stats.units || 1
                const segs: Array<{color: string, count: number}> = []
                if (stats.woUnitsOccupied > 0) segs.push({ color: '#1a1a1a', count: stats.woUnitsOccupied })
                if (stats.gewerbeUnitsOccupied > 0) segs.push({ color: '#d97706', count: stats.gewerbeUnitsOccupied })
                if (stats.lagerUnitsOccupied > 0) segs.push({ color: '#a16207', count: stats.lagerUnitsOccupied })
                if (stats.stellplatzUnitsOccupied > 0) segs.push({ color: '#888', count: stats.stellplatzUnitsOccupied })
                let offset = 0
                const arcs = segs.map(s => {
                  const arcLen = (s.count / totalU) * c2pi
                  const arc = { color: s.color, dasharray: arcLen + ' ' + c2pi, dashoffset: -offset }
                  offset += arcLen
                  return arc
                })
                return (
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f0eeea" strokeWidth="14" />
                    {arcs.map((a, i) => (
                      <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={a.color} strokeWidth="14"
                        strokeDasharray={a.dasharray} strokeDashoffset={a.dashoffset}
                        transform="rotate(-90 50 50)" />
                    ))}
                    <text x="50" y="48" textAnchor="middle" fontSize="16" fontWeight="500" fill="#1a1a1a">
                      {occupancyRate}%
                    </text>
                    <text x="50" y="62" textAnchor="middle" fontSize="8" fill="#888">
                      vermietet
                    </text>
                  </svg>
                )
              })()}
              <div style={{ flex: 1, fontSize: '12px', color: '#888', lineHeight: 1.7 }}>
                <strong style={{ color: '#1a1a1a' }}>{stats.occupiedUnits} von {stats.units}</strong> vermietet
                <div style={{ marginTop: '8px' }}>
                  {stats.woUnits > 0 && <div><span style={{ color: '#1a1a1a' }}>●</span> {stats.woUnitsOccupied}/{stats.woUnits} Wohnung{stats.woUnits === 1 ? '' : 'en'}</div>}
                  {stats.gewerbeUnits > 0 && <div><span style={{ color: '#d97706' }}>●</span> {stats.gewerbeUnitsOccupied}/{stats.gewerbeUnits} Gewerbe</div>}
                  {stats.lagerUnits > 0 && <div><span style={{ color: '#a16207' }}>●</span> {stats.lagerUnitsOccupied}/{stats.lagerUnits} Lager</div>}
                  {stats.stellplatzUnits > 0 && <div><span style={{ color: '#888' }}>●</span> {stats.stellplatzUnitsOccupied}/{stats.stellplatzUnits} Stellplatz</div>}
                  {stats.vacantUnits > 0 && (
                    <div style={{ color: '#dc2626', marginTop: '4px' }}>
                      <span>●</span> {stats.vacantUnits} leer
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === Einnahmen-Chart (Balken) === */}
        <div style={{...cardStyle, marginBottom: '1.5rem'}}>
          <div style={cardHeaderStyle}>
            <h3 style={cardTitleStyle}>Mieteingang pro Monat</h3>
            <div style={{display: 'flex', gap: '12px', fontSize: '11px', color: '#888', alignItems: 'center'}}>
              <span><span style={{display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: '#16a34a', marginRight: '4px', verticalAlign: '-1px'}}></span>Eingegangen</span>
              <span><span style={{display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: '#fde68a', marginRight: '4px', verticalAlign: '-1px'}}></span>Offen</span>
              <span><span style={{display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: '#fecaca', marginRight: '4px', verticalAlign: '-1px'}}></span>Überfällig</span>
            </div>
          </div>
          {(() => {
            const data = stats.monthlyChart
            const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expected)), 1)
            const yr = String(new Date().getFullYear())
            const nowKey = yr + '-' + String(new Date().getMonth() + 1).padStart(2, '0')
            const ytd = data.filter(d => d.month.startsWith(yr))
            const ytdIncome = ytd.reduce((s, d) => s + d.income, 0)
            const ytdOpen = Math.max(0, ytd.reduce((s, d) => s + d.expected, 0) - ytdIncome)
            return (
              <>
                <div style={{ fontSize: '12.5px', color: '#888', marginBottom: '14px' }}>
                  {yr} bisher: <strong style={{ color: '#16a34a' }}>{fmtCurrency(ytdIncome)}</strong> eingenommen
                  {ytdOpen > 0 && <> · <span style={{ color: '#d97706' }}>{fmtCurrency(ytdOpen)} ausstehend</span></>}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '10px', height: '150px' }}>
                  {data.map((d) => {
                    const sollH = Math.max((Math.max(d.expected, d.income) / maxVal) * 100, (d.expected > 0 || d.income > 0) ? 3 : 0)
                    const istPct = d.expected > 0 ? Math.min(100, (d.income / d.expected) * 100) : (d.income > 0 ? 100 : 0)
                    const isCurrent = d.month === nowKey
                    const hatGap = d.income < d.expected
                    return (
                      <div key={d.month} title={d.label + ': ' + fmtCurrency(d.income) + ' von ' + fmtCurrency(d.expected)}
                        style={{ flex: '0 1 64px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', minWidth: 0 }}>
                        <div style={{
                          width: '100%', maxWidth: '36px', height: sollH + '%',
                          borderRadius: '6px', overflow: 'hidden',
                          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                          background: !hatGap ? '#f0eeea' : isCurrent ? '#fde68a' : '#fecaca',
                          boxShadow: isCurrent ? '0 0 0 1.5px #1a1a1a' : 'none'
                        }}>
                          <div style={{ height: istPct + '%', background: '#16a34a' }} />
                        </div>
                        <div style={{ fontSize: '10px', color: isCurrent ? '#1a1a1a' : '#888', fontWeight: isCurrent ? 600 : 400 }}>{d.label}</div>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>

        {/* === Activity + Smart Insight === */}
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2" style={{ marginBottom: '1.5rem' }}>
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h3 style={cardTitleStyle}>Letzte Aktivität</h3>
              <a href="/payments" style={cardLinkStyle}>Alle →</a>
            </div>
            {stats.recentActivity.length === 0 ? (
              <div style={{ padding: '1rem 0', color: '#bbb', fontSize: '13px' }}>
                Noch keine Aktivität
              </div>
            ) : (
              stats.recentActivity.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 0', fontSize: '12.5px',
                  borderBottom: i < stats.recentActivity.length - 1 ? '1px solid #e8e6e0' : 'none'
                }}>
                  <span style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#f0eeea', color: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>
                    {a.text.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                  </span>
                  <span style={{ flex: 1 }}>{a.text}</span>
                  <span style={{ fontSize: '11px', color: '#bbb', flexShrink: 0 }}>{a.meta}</span>
                </div>
              ))
            )}
          </div>

          <div style={{ ...cardStyle, background: '#fafaf8' }}>
            <div style={cardHeaderStyle}>
              <h3 style={cardTitleStyle}>Smart-Insight</h3>
            </div>
            <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#444' }}>
              {smartInsight}
            </div>
            <div style={{
              marginTop: '14px', paddingTop: '12px',
              borderTop: '1px solid #e8e6e0',
              fontSize: '11px', color: '#bbb'
            }}>
              Immobilien-News-Feed kommt in einem späteren Update
            </div>
          </div>
        </div>

      </main>
    </>
  )
}

function totalRecentPayments(s: Stats): number {
  // Hilfsfunktion um zu bewerten ob genug Zahlungs-Daten für Punctuality-Aussage da sind
  return s.recentActivity.length
}

// === Styles ===
const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e8e6e0',
  borderRadius: '12px',
  padding: '16px'
}
const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px'
}
const cardTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  margin: 0
}
const cardLinkStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#1a1a1a',
  textDecoration: 'underline'
}
const kpiCardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e8e6e0',
  borderRadius: '12px',
  padding: '14px 16px'
}
const kpiLabelStyle: React.CSSProperties = {
  fontSize: '10.5px',
  fontWeight: 500,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '8px'
}
const kpiValueStyle: React.CSSProperties = {
  fontSize: 'clamp(16px, 5vw, 24px)',
  fontWeight: 500,
  lineHeight: 1.1,
  marginBottom: '6px',
  whiteSpace: 'nowrap'
}
const qaStyle: React.CSSProperties = {
  padding: '8px 14px',
  background: '#fff',
  border: '1px solid #e8e6e0',
  borderRadius: '18px',
  fontSize: '12px',
  textDecoration: 'none',
  color: '#1a1a1a',
  cursor: 'pointer',
  display: 'inline-block'
}
const qaPrimaryStyle: React.CSSProperties = {
  ...qaStyle,
  background: '#1a1a1a',
  color: '#fff',
  border: '1px solid #1a1a1a'
}
