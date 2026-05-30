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
      .from('profiles').select('id').eq('id', userId).maybeSingle()
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
      .from('contracts').select('id, tenant_id, unit_id, rent_amount, start_date, end_date, is_active')
      .in('unit_id', unitIdsSafe)
    const contractIds = (contracts || []).map((c: any) => c.id)
    const contractIdsSafe = contractIds.length ? contractIds : [NULL_UUID]

    const tenantIds = [...new Set((contracts || []).map((c: any) => c.tenant_id).filter(Boolean))]
    const { data: tenants } = await supabase
      .from('tenants').select('id, full_name')
      .in('id', tenantIds.length ? tenantIds : [NULL_UUID])

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
      actionItems.push({
        priority: 'warning',
        title: `NK-Abrechnung ${lastYear} fehlt für ${propsWithoutStmts.length} ${propsWithoutStmts.length === 1 ? 'Objekt' : 'Objekte'}`,
        description: propsWithoutStmts.slice(0, 2).map((p: any) => p.name).join(', ') + (propsWithoutStmts.length > 2 ? '…' : ''),
        href: '/nebenkostenabrechnung'
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
      .from('payments').select('amount, paid_date, contract_id')
      .in('contract_id', contractIdsSafe).eq('status', 'paid')
      .not('paid_date', 'is', null)
      .order('paid_date', { ascending: false }).limit(5)
    ;(recentPaid || []).forEach((p: any) => {
      const c = (contracts || []).find((cc: any) => cc.id === p.contract_id)
      const t = (tenants || []).find((tt: any) => tt.id === c?.tenant_id)
      recentActivity.push({
        icon: '💰',
        text: `${t?.full_name || 'Unbekannt'} zahlte ${fmtCurrency(Number(p.amount))}`,
        meta: formatRelativeDate(p.paid_date)
      })
    })

    // Unit type breakdown
    const woUnits = (units || []).filter((u: any) => u.type === 'wohnung').length
    const gewerbeUnits = (units || []).filter((u: any) => u.type === 'gewerbe').length
    const lagerUnits = (units || []).filter((u: any) => u.type === 'lager').length
    const stellplatzUnits = (units || []).filter((u: any) => u.type === 'stellplatz').length

    setStats({
      properties: properties?.length || 0,
      units: units?.length || 0,
      occupiedUnits: (units || []).filter((u: any) => u.is_occupied).length,
      vacantUnits: vacantUnits.length,
      tenants: tenants?.length || 0,
      monthlyIncome,
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
      stellplatzUnits
    })
    setLoading(false)
  }

  if (loading || !stats) {
    return (
      <>
        <Nav />
        <main style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6b7280' }}>
          Lade Dashboard…
        </main>
      </>
    )
  }

  // === Render Helpers ===
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend'
  const greetingEmoji = hour < 12 ? '☀️' : hour < 18 ? '👋' : '🌙'
  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Vermieter'

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
    : occupancyRate >= 70 ? '#1B4FD8' : '#dc2626'

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
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }}>
        <PlanUsageBanner />

        {/* === Header === */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px'
        }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 500, margin: 0 }}>
              {greeting}, {userName} {greetingEmoji}
            </h1>
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
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
                  {p.color === 'ok' ? '🟢' : p.color === 'warn' ? '🟡' : '🔴'} {p.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* === KPI Cards === */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px', marginBottom: '1.5rem'
        }}>
          <div style={kpiCardStyle}>
            <div style={kpiLabelStyle}>Einnahmen diesen Monat</div>
            <div style={{ ...kpiValueStyle, color: '#16a34a' }}>{fmtCurrency(stats.monthlyIncome)}</div>
            <div style={{
              fontSize: '11.5px',
              color: trendUp ? '#16a34a' : trendDown ? '#dc2626' : '#9ca3af'
            }}>
              {trendUp ? '↑' : trendDown ? '↓' : '→'} {Math.abs(trendPct)}% vs. Vormonat ({fmtCurrency(stats.prevMonthlyIncome)})
            </div>
          </div>

          <div style={kpiCardStyle}>
            <div style={kpiLabelStyle}>Forecast 30 Tage</div>
            <div style={{ ...kpiValueStyle, color: '#1B4FD8' }}>{fmtCurrency(stats.forecast30Days)}</div>
            <div style={{ fontSize: '11.5px', color: '#6b7280' }}>
              Erwartete Zahlungen
            </div>
          </div>

          <div style={kpiCardStyle}>
            <div style={kpiLabelStyle}>Auslastung</div>
            <div style={{ ...kpiValueStyle, color: occupancyRate >= BENCHMARK_OCCUPANCY ? '#16a34a' : '#1a1a1a' }}>
              {occupancyRate}%
            </div>
            <div style={{
              fontSize: '11.5px',
              color: occupancyDelta >= 0 ? '#16a34a' : '#dc2626'
            }}>
              {occupancyDelta >= 0 ? '↑' : '↓'} {Math.abs(occupancyDelta)}% vs. Branchen-Ø ({BENCHMARK_OCCUPANCY}%)
            </div>
          </div>

          <div style={kpiCardStyle}>
            <div style={kpiLabelStyle}>Offene Aufgaben</div>
            <div style={{
              ...kpiValueStyle,
              color: urgentCount > 0 ? '#dc2626' : stats.actionItems.length > 0 ? '#d97706' : '#16a34a'
            }}>
              {stats.actionItems.length}
            </div>
            <div style={{ fontSize: '11.5px', color: urgentCount > 0 ? '#dc2626' : '#6b7280' }}>
              {urgentCount > 0 ? `${urgentCount} dringend` : stats.actionItems.length === 0 ? 'Alles erledigt ✓' : 'Zu erledigen'}
            </div>
          </div>
        </div>

        {/* === Action Items + Auslastung === */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h3 style={cardTitleStyle}>📋 Was steht an?</h3>
            </div>
            {stats.actionItems.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                ✨ Keine offenen Aufgaben — top!
              </div>
            ) : (
              stats.actionItems.slice(0, 5).map((item, i) => (
                <a key={i} href={item.href || '#'} style={{
                  textDecoration: 'none', color: 'inherit', display: 'block'
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    padding: '12px 0',
                    borderBottom: i < Math.min(stats.actionItems.length, 5) - 1 ? '0.5px solid #e5e7eb' : 'none',
                    cursor: 'pointer'
                  }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      marginTop: '6px', flexShrink: 0,
                      background: item.priority === 'urgent' ? '#E24B4A'
                        : item.priority === 'warning' ? '#EF9F27' : '#378ADD'
                    }} />
                    <div style={{ flex: 1, fontSize: '13px', lineHeight: 1.5 }}>
                      <div>{item.title}</div>
                      <div style={{ fontSize: '11.5px', color: '#9ca3af', marginTop: '2px' }}>
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
              <h3 style={cardTitleStyle}>📊 Auslastung & Mix</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="14" />
                <circle cx="50" cy="50" r="40" fill="none" stroke={donutColor} strokeWidth="14"
                  strokeDasharray={`${donutFill} ${donutCircum}`}
                  transform="rotate(-90 50 50)" strokeLinecap="round" />
                <text x="50" y="56" textAnchor="middle" fontSize="18" fontWeight="500" fill="#1a1a1a">
                  {occupancyRate}%
                </text>
              </svg>
              <div style={{ flex: 1, fontSize: '12px', color: '#6b7280', lineHeight: 1.7 }}>
                <strong style={{ color: '#1a1a1a' }}>{stats.occupiedUnits} von {stats.units}</strong> vermietet
                <div style={{ marginTop: '8px' }}>
                  {stats.woUnits > 0 && <div><span style={{ color: '#1d9e75' }}>●</span> {stats.woUnits} Wohnung{stats.woUnits === 1 ? '' : 'en'}</div>}
                  {stats.gewerbeUnits > 0 && <div><span style={{ color: '#7F77DD' }}>●</span> {stats.gewerbeUnits} Gewerbe</div>}
                  {stats.lagerUnits > 0 && <div><span style={{ color: '#a16207' }}>●</span> {stats.lagerUnits} Lager</div>}
                  {stats.stellplatzUnits > 0 && <div><span style={{ color: '#6b7280' }}>●</span> {stats.stellplatzUnits} Stellplatz</div>}
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

        {/* === Activity + Smart Insight === */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h3 style={cardTitleStyle}>📈 Letzte Aktivität</h3>
              <a href="/payments" style={cardLinkStyle}>Alle →</a>
            </div>
            {stats.recentActivity.length === 0 ? (
              <div style={{ padding: '1rem 0', color: '#9ca3af', fontSize: '13px' }}>
                Noch keine Aktivität
              </div>
            ) : (
              stats.recentActivity.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', fontSize: '12.5px',
                  borderBottom: i < stats.recentActivity.length - 1 ? '0.5px solid #e5e7eb' : 'none'
                }}>
                  <span>{a.icon} {a.text}</span>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>{a.meta}</span>
                </div>
              ))
            )}
          </div>

          <div style={{ ...cardStyle, background: '#f9fafb' }}>
            <div style={cardHeaderStyle}>
              <h3 style={cardTitleStyle}>💡 Smart-Insight</h3>
            </div>
            <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#374151' }}>
              {smartInsight}
            </div>
            <div style={{
              marginTop: '14px', paddingTop: '12px',
              borderTop: '0.5px solid #e5e7eb',
              fontSize: '11px', color: '#9ca3af'
            }}>
              📰 Immobilien-News-Feed kommt in einem späteren Update
            </div>
          </div>
        </div>

        {/* === Quick Actions === */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <h3 style={cardTitleStyle}>⚡ Schnellzugriff</h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <a href="/properties" style={qaPrimaryStyle}>+ Objekt anlegen</a>
            <a href="/import" style={qaStyle}>📥 Excel-Import</a>
            <a href="/units" style={qaStyle}>+ Einheit</a>
            <a href="/tenants" style={qaStyle}>+ Mieter</a>
            <a href="/payments" style={qaStyle}>💰 Zahlung erfassen</a>
            <a href="/guv" style={qaStyle}>📊 GuV-Bericht</a>
            <a href="/mietvertrag" style={qaStyle}>📄 Mietvertrag</a>
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
  border: '0.5px solid #e5e7eb',
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
  color: '#1B4FD8',
  textDecoration: 'none'
}
const kpiCardStyle: React.CSSProperties = {
  background: '#fff',
  border: '0.5px solid #e5e7eb',
  borderRadius: '12px',
  padding: '14px 16px'
}
const kpiLabelStyle: React.CSSProperties = {
  fontSize: '10.5px',
  fontWeight: 500,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '8px'
}
const kpiValueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 500,
  lineHeight: 1.1,
  marginBottom: '6px'
}
const qaStyle: React.CSSProperties = {
  padding: '8px 14px',
  background: '#fff',
  border: '0.5px solid #e5e7eb',
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
