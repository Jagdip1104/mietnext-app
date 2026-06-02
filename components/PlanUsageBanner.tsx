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

  const text = isAtLimit ? '#dc2626' : '#1a1a1a'
  const bar  = isAtLimit ? '#dc2626' : isNearLimit ? '#d97706' : '#16a34a'

  return (
    <div style={{
      backgroundColor: '#fafaf8', padding: '14px 18px', borderRadius: '12px',
      marginBottom: '24px', border: '1px solid #e8e6e0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: info.limit !== Infinity ? '10px' : 0 }}>
        <div>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: text }}>
            {info.limit === Infinity
              ? `${info.planName} · Unbegrenzte Einheiten · Aktuell: ${info.currentUnits}`
              : isAtLimit
                ? `Limit erreicht · ${info.currentUnits} von ${info.limit} Einheiten (${info.planName})`
                : `${info.planName} · ${info.currentUnits} von ${info.limit} Einheiten`}
          </p>
          {isAtLimit && (
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: text }}>
              Upgrade für mehr Einheiten nötig.
            </p>
          )}
        </div>
        {info.limit !== Infinity && (
          <button onClick={() => router.push('/pricing')}
            style={isAtLimit ? {
              padding: '7px 14px', fontSize: '12px', fontWeight: '500',
              backgroundColor: '#1a1a1a', color: '#fff', border: 'none',
              borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' as const,
            } : {
              padding: '4px 4px', fontSize: '12px', fontWeight: '500',
              backgroundColor: 'transparent', color: '#666', border: 'none',
              cursor: 'pointer', whiteSpace: 'nowrap' as const,
            }}>
            {isAtLimit ? 'Jetzt upgraden →' : 'Plan ansehen →'}
          </button>
        )}
      </div>
      {info.limit !== Infinity && (
        <div style={{ height: '6px', backgroundColor: '#f1efe8', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${info.percentUsed}%`, height: '100%', backgroundColor: bar, transition: 'width 0.3s' }} />
        </div>
      )}
    </div>
  )
}