'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUserPlanInfo } from '@/lib/plans'

export default function PlanUsageBanner() {
  const router = useRouter()
  const [info, setInfo] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setInfo(await getUserPlanInfo(session.user.id))
    }
    load()
  }, [])

  if (!info) return null

  const isAtLimit   = info.currentUnits >= info.limit && info.limit !== Infinity
  const isNearLimit = info.percentUsed >= 80 && !isAtLimit && info.limit !== Infinity

  const bg     = isAtLimit ? '#fee2e2' : isNearLimit ? '#fef3c7' : '#f0fdf4'
  const text   = isAtLimit ? '#991b1b' : isNearLimit ? '#92400e' : '#166534'
  const border = isAtLimit ? '#fecaca' : isNearLimit ? '#fde68a' : '#bbf7d0'
  const bar    = isAtLimit ? '#dc2626' : isNearLimit ? '#f59e0b' : '#22c55e'

  return (
    <div style={{
      backgroundColor: bg, padding: '16px 20px', borderRadius: '12px',
      marginBottom: '24px', border: `1px solid ${border}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: info.limit !== Infinity ? '10px' : 0 }}>
        <div>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: text }}>
            {info.limit === Infinity
              ? `✨ ${info.planName}: Unbegrenzte Einheiten · Aktuell: ${info.currentUnits}`
              : isAtLimit
                ? `⚠️ Limit erreicht: ${info.currentUnits} von ${info.limit} Einheiten (${info.planName})`
                : `${info.planName}: ${info.currentUnits} von ${info.limit} Einheiten`}
          </p>
          {isAtLimit && (
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: text }}>
              Upgrade für mehr Einheiten nötig.
            </p>
          )}
        </div>
        {info.limit !== Infinity && (
          <button onClick={() => router.push('/pricing')}
            style={{
              padding: '6px 14px', fontSize: '12px', fontWeight: '500',
              backgroundColor: bar, color: '#fff', border: 'none',
              borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' as const,
            }}>
            {isAtLimit ? 'Jetzt upgraden →' : 'Plan ansehen →'}
          </button>
        )}
      </div>
      {info.limit !== Infinity && (
        <div style={{ height: '6px', backgroundColor: '#fff', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${info.percentUsed}%`, height: '100%', backgroundColor: bar, transition: 'width 0.3s' }} />
        </div>
      )}
    </div>
  )
}