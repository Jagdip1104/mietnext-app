import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getAuthedUser } from '@/lib/supabase-server'

// ── Karenzzeit: zum TESTEN 2 Tage, fuer Launch auf 30 stellen ──
const GRACE_DAYS = 2

let _stripe: Stripe | undefined
const stripe: Stripe = new Proxy({} as Stripe, {
  get: (_t, prop) => {
    if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    return (_stripe as any)[prop]
  },
})

export async function POST() {
  const user = await getAuthedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_id, deletion_scheduled_at')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profil nicht gefunden' }, { status: 404 })
    }
    if (profile.deletion_scheduled_at) {
      return NextResponse.json({ error: 'Loeschung bereits vorgemerkt' }, { status: 409 })
    }

    // Stripe-Abo sofort kuendigen — Fehler darf die Loeschung NICHT blockieren
    if (profile.subscription_id) {
      try {
        await stripe.subscriptions.cancel(profile.subscription_id)
      } catch (e: any) {
        console.error('[delete-account] Stripe cancel fehlgeschlagen:', e?.message)
      }
    }

    const now     = new Date()
    const purgeAt = new Date(now.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000)

    const { error: uErr } = await supabaseAdmin
      .from('profiles')
      .update({
        deletion_scheduled_at: now.toISOString(),
        deletion_purge_at:     purgeAt.toISOString(),
        subscription_status:   'canceled',
      })
      .eq('id', user.id)

    if (uErr) {
      return NextResponse.json({ error: 'Konnte Loeschung nicht vormerken: ' + uErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, purge_at: purgeAt.toISOString() })
  } catch (error: any) {
    console.error('[delete-account] error:', error)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
