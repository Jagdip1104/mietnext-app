'use client'

import { useToast } from '@/components/ui/Toast'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { colors } from '@/lib/theme'
import { PLANS } from '@/lib/plan-features'

export default function PricingPage() {
  const toast = useToast()
  const [userId, setUserId]     = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string>('free')
  const [loading, setLoading]   = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUserId(session.user.id)
      setUserEmail(session.user.email || null)
      const { data: profile } = await supabase
        .from('profiles').select('plan').eq('id', session.user.id).single()
      setCurrentPlan(profile?.plan || 'free')
    }
    load()
  }, [])

  const handleSubscribe = async (priceId: string | null, planId: string) => {
    if (!priceId) { router.push('/register'); return }
    if (!userId) return
    setLoading(planId)
    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    })
    const { url, error } = await res.json()
    if (error) { toast.error(error); setLoading(null); return }
    window.location.href = url
  }

  const handlePortal = async () => {
    if (!userId) return
    setLoading('portal')
    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const { url, error } = await res.json()
    if (error) { toast.error(error); setLoading(null); return }
    window.location.href = url
  }

  return (
    <main style={{ backgroundColor: colors.surface, minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '64px 48px' }}>

        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '400', color: colors.text, margin: '0 0 12px', fontFamily: 'Georgia, serif' }}>
            Einfache, transparente Preise
          </h1>
          <p style={{ fontSize: '16px', color: colors.textMuted, margin: '0 0 24px' }}>
            Starte kostenlos · Upgrade jederzeit · Kündige jederzeit
          </p>
          {currentPlan !== 'free' && (
            <button onClick={handlePortal} disabled={loading === 'portal'}
              style={{ backgroundColor: colors.white, color: colors.textSecondary, padding: '10px 24px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '14px', cursor: 'pointer' }}>
              {loading === 'portal' ? 'Lädt...' : 'Abo verwalten / kündigen →'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: '16px', alignItems: 'start' }}>
          {PLANS.map((plan: any) => {
            const isPopular = plan.highlight === true
            const isCurrent = currentPlan === plan.id
            const isFree = plan.id === 'free'
            return (
              <div key={plan.id} style={{
                backgroundColor: isPopular ? colors.text : colors.white,
                border: `1px solid ${isPopular ? colors.text : colors.border}`,
                borderRadius: '16px', padding: '28px 24px', position: 'relative' as const,
              }}>
                {isPopular && (
                  <div style={{
                    position: 'absolute' as const, top: '-12px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: colors.accent, color: colors.white,
                    fontSize: '11px', fontWeight: '500', padding: '4px 14px', borderRadius: '20px', whiteSpace: 'nowrap' as const,
                  }}>Beliebteste Wahl</div>
                )}

                <p style={{ fontSize: '13px', fontWeight: '500', color: isPopular ? '#bbb' : colors.textMuted, margin: '0 0 8px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                  {plan.name}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '0 0 4px' }}>
                  <p style={{ fontSize: '36px', fontWeight: '300', color: isPopular ? colors.white : colors.text, margin: 0, fontFamily: 'Georgia, serif' }}>
                    {plan.price === 0 ? '0' : plan.price}
                  </p>
                  <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>€ / Monat</p>
                </div>
                <p style={{ fontSize: '12px', color: isPopular ? '#888' : colors.textHint, margin: '0 0 20px' }}>{plan.einheiten}</p>

                <button
                  onClick={() => handleSubscribe(plan.priceId, plan.id)}
                  disabled={loading === plan.id || isCurrent}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '500',
                    cursor: isCurrent ? 'default' : 'pointer', marginBottom: '20px', transition: 'opacity 0.15s',
                    border: isCurrent ? `1px solid ${colors.border}` : isPopular ? 'none' : `1px solid ${isFree ? colors.border : colors.text}`,
                    backgroundColor: isCurrent ? 'transparent' : isPopular ? colors.white : isFree ? colors.white : colors.text,
                    color: isCurrent ? colors.textMuted : isPopular ? colors.text : isFree ? colors.text : colors.white,
                    opacity: loading === plan.id ? 0.7 : 1,
                  }}>
                  {loading === plan.id ? 'Lädt...' : isCurrent ? '✓ Aktueller Plan' : plan.cta}
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {plan.features.map((f: any, i: number) => {
                    const included = f.v === true || f.v === 'soon'
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ fontSize: '14px', lineHeight: '1.35', flexShrink: 0, color: included ? colors.accent : (isPopular ? '#555' : '#d8d6d0') }}>
                          {included ? '✓' : '–'}
                        </span>
                        <span style={{ fontSize: '13px', lineHeight: '1.4', color: f.v === false ? (isPopular ? '#777' : colors.textHint) : (isPopular ? '#e8e6e0' : colors.textSecondary) }}>
                          {f.t}{f.v === 'soon' ? <span style={{ color: isPopular ? '#888' : colors.textHint }}> (bald)</span> : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <p style={{ fontSize: '13px', color: colors.textHint }}>
            Alle Preise inkl. 19% MwSt. · Monatlich kündbar · Zahlung per Kreditkarte oder SEPA
          </p>
          <p style={{ fontSize: '13px', color: colors.textHint, margin: '8px 0 0' }}>
            Im Test-Modus: Testkarte <strong style={{ color: colors.textSecondary }}>4242 4242 4242 4242</strong> · Datum: beliebig · CVC: beliebig
          </p>
        </div>
      </div>
    </main>
  )
}
