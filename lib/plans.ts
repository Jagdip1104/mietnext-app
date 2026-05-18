import { supabase } from '@/lib/supabase'

export const PLAN_LIMITS: Record<string, number> = {
  free:       3,
  starter:    15,
  business:   50,
  enterprise: Infinity,
}

export const PLAN_NAMES: Record<string, string> = {
  free:       'Free',
  starter:    'Starter',
  business:   'Business',
  enterprise: 'Enterprise',
}

export async function getUserPlanInfo(userId: string) {
  const { data: profile } = await supabase
    .from('profiles').select('plan').eq('id', userId).single()

  const plan = profile?.plan || 'free'
  const limit = PLAN_LIMITS[plan] ?? 3

  // Einheiten zählen: nur die des aktuellen Users via property → owner
  const { data: props } = await supabase
    .from('properties').select('id').eq('owner_id', userId)

  const propertyIds = (props || []).map((p: { id: string }) => p.id)

  let currentUnits = 0
  if (propertyIds.length > 0) {
    const { count } = await supabase
      .from('units')
      .select('id', { count: 'exact', head: true })
      .in('property_id', propertyIds)
    currentUnits = count ?? 0
  }

  const canCreateMore = currentUnits < limit
  const percentUsed = limit === Infinity ? 0 : Math.min(100, (currentUnits / limit) * 100)

  return {
    plan,
    planName: PLAN_NAMES[plan] || 'Free',
    limit,
    currentUnits,
    canCreateMore,
    percentUsed,
  }
}