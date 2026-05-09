import { supabase } from '@/lib/supabase'

// 3. Werktag eines Monats berechnen (Mo-Fr, ohne Feiertage)
function thirdWorkdayOfMonth(year: number, month: number): Date {
  let workdays = 0
  let day = 1
  while (workdays < 3) {
    const d = new Date(year, month, day)
    const dow = d.getDay() // 0=So, 6=Sa
    if (dow !== 0 && dow !== 6) {
      workdays++
      if (workdays === 3) return d
    }
    day++
  }
  return new Date(year, month, day)
}

// Fälligkeitsdatum berechnen für Monat X nach Vertragsbeginn
export function calculateDueDate(startDate: Date, monthOffset: number): Date {
  const targetYear = startDate.getFullYear()
  const targetMonth = startDate.getMonth() + monthOffset

  if (startDate.getDate() === 1) {
    // 3. Werktag des Monats (BGB-Standard)
    const adjusted = new Date(targetYear, targetMonth, 1)
    return thirdWorkdayOfMonth(adjusted.getFullYear(), adjusted.getMonth())
  } else {
    // Startag + 3 Tage Schonfrist
    return new Date(targetYear, targetMonth, startDate.getDate() + 3)
  }
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 12 monatliche Zahlungen für einen Vertrag generieren
export async function generatePaymentsForContract(
  contractId: string,
  startDate: string, // YYYY-MM-DD
  amount: number,
  monthCount: number = 12,
  startMonthOffset: number = 0
): Promise<{ count: number; error: any }> {
  const start = new Date(startDate + 'T00:00:00')
  const payments = []
  for (let i = startMonthOffset; i < startMonthOffset + monthCount; i++) {
    const dueDate = calculateDueDate(start, i)
    payments.push({
      contract_id: contractId,
      amount: amount,
      due_date: formatDateISO(dueDate),
      status: 'pending',
    })
  }
  const { error } = await supabase.from('payments').insert(payments)
  return { count: payments.length, error }
}

// Zählen wie viele Zahlungen schon existieren
export async function countPaymentsForContract(contractId: string): Promise<number> {
  const { count } = await supabase
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('contract_id', contractId)
  return count || 0
}