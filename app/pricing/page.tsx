'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    einheiten: '3 Einheiten',
    color: '#888',
    bg: '#fafaf8',
    border: '#e8e6e0',
    features: [
      '✅ 3 Einheiten',
      '✅ Objekte, Mieter, Verträge',
      '✅ Zahlungsübersicht',
      '✅ Tickets',
      '❌ PDF Export',
      '❌ NK-Abrechnung',
      '❌ GuV + Kosten',
      '❌ Excel-Import',
      '❌ Bankkonto',
    ],
    cta: 'Kostenlos starten',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    priceId: 'price_1TWjBLC2lxlY4GthiRV6tYo3',
    einheiten: '15 Einheiten',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    popular: true,
    features: [
      '✅ 15 Einheiten',
      '✅ Alles aus Free',
      '✅ PDF Export',
      '✅ NK-Abrechnung',
      '✅ GuV + Kostenerfassung',
      '✅ Excel-Import',
      '🔜 Bankkonto (coming soon)',
      '✅ E-Mail Support',
      '❌ KI-Ausweis-Scan',
    ],
    cta: 'Starter wählen',
  },
  {
    id: 'business',
    name: 'Business',
    price: 49,
    priceId: 'price_1TWjDVC2lxlY4GthvtN0Jdxu',
    einheiten: '50 Einheiten',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    features: [
      '✅ 50 Einheiten',
      '✅ Alles aus Starter',
      '✅ KI-Ausweis-Scan',
      '🔜 Bankkonto (coming soon)',
      '✅ Priorität Support',
      '✅ Früher Zugang zu neuen Features',
      '',
      '',
      '',
    ],
    cta: 'Business wählen',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    priceId: 'price_1TWjDqC2lxlY4GthwMqCklKB',
    einheiten: 'Unbegrenzte Einheiten',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    features: [
      '✅ Unbegrenzte Einheiten',
      '✅ Alles aus Business',
      '🔜 Bankkonto-Anbindung',
      '✅ Dedicated Support',
      '✅ Onboarding-Call',
      '✅ SLA Garantie',
      '',
      '',
      '',
    ],
    cta: 'Enterprise wählen',
  },
]

export default function PricingPage() {
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
    if (planId === 'free') { router.push('/dashboard'); return }
    if (!userId) { router.push('/login'); return }
    if (currentPlan === planId) return

    setLoading(planId)
    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, userId, userEmail }),
    })
    const { url, error } = await res.json()
    if (error) { alert('Fehler: ' + error); setLoading(null); return }
    window.location.href = url
  }

  const handlePortal = async () => {
    if (!userId) return
    setLoading('portal')
    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const { url, error } = await res.json()
    if (error) { alert(error); setLoading(null); return }
    window.location.href = url
  }

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '64px 48px' }}>

        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 12px', fontFamily: 'Georgia, serif' }}>
            Einfache, transparente Preise
          </h1>
          <p style={{ fontSize: '16px', color: '#999', margin: '0 0 24px' }}>
            Starte kostenlos · Upgrade jederzeit · Kündige jederzeit
          </p>
          {currentPlan !== 'free' && (
            <button onClick={handlePortal} disabled={loading === 'portal'}
              style={{ backgroundColor: '#fff', color: '#666', padding: '10px 24px', borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '14px', cursor: 'pointer' }}>
              {loading === 'portal' ? 'Lädt...' : 'Abo verwalten / kündigen →'}
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', alignItems: 'start' }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              backgroundColor: '#fff',
              border: plan.popular ? `2px solid ${plan.color}` : '1px solid #e8e6e0',
              borderRadius: '16px',
              padding: '28px 24px',
              position: 'relative' as const,
            }}>
              {plan.popular && (
                <div style={{
                  position: 'absolute' as const, top: '-12px', left: '50%', transform: 'translateX(-50%)',
                  backgroundColor: plan.color, color: '#fff',
                  fontSize: '11px', fontWeight: '500', padding: '4px 14px', borderRadius: '20px',
                  whiteSpace: 'nowrap' as const,
                }}>
                  Beliebteste Wahl
                </div>
              )}

              <p style={{ fontSize: '13px', fontWeight: '500', color: plan.color, margin: '0 0 8px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                {plan.name}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '0 0 4px' }}>
                <p style={{ fontSize: '36px', fontWeight: '300', color: '#1a1a1a', margin: 0, fontFamily: 'Georgia, serif' }}>
                  {plan.price === 0 ? '0' : plan.price}
                </p>
                <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>€ / Monat</p>
              </div>
              <p style={{ fontSize: '12px', color: '#bbb', margin: '0 0 20px' }}>{plan.einheiten}</p>

              <button
                onClick={() => handleSubscribe(plan.priceId, plan.id)}
                disabled={loading === plan.id || currentPlan === plan.id}
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px',
                  fontSize: '14px', fontWeight: '500', cursor: currentPlan === plan.id ? 'default' : 'pointer',
                  border: 'none',
                  backgroundColor: currentPlan === plan.id ? '#f0ede6' : plan.id === 'free' ? '#f0ede6' : plan.color,
                  color: currentPlan === plan.id ? '#999' : plan.id === 'free' ? '#1a1a1a' : '#fff',
                  opacity: loading === plan.id ? 0.7 : 1,
                  marginBottom: '20px',
                  transition: 'opacity 0.15s',
                }}>
                {loading === plan.id ? 'Lädt...' : currentPlan === plan.id ? '✓ Aktueller Plan' : plan.cta}
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {plan.features.filter(f => f).map((f, i) => (
                  <p key={i} style={{ fontSize: '13px', color: '#555', margin: 0, lineHeight: '1.4' }}>{f}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <p style={{ fontSize: '13px', color: '#bbb' }}>
            Alle Preise inkl. 19% MwSt. · Monatlich kündbar · Zahlung per Kreditkarte oder SEPA
          </p>
          <p style={{ fontSize: '13px', color: '#bbb', margin: '8px 0 0' }}>
            Im Test-Modus: Testkarte <strong style={{ color: '#555' }}>4242 4242 4242 4242</strong> · Datum: beliebig · CVC: beliebig
          </p>
        </div>
      </div>
    </main>
  )
}