import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

let _stripe: Stripe | undefined
const stripe: Stripe = new Proxy({} as Stripe, {
  get: (_t, prop) => {
    if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    return (_stripe as any)[prop]
  },
})

const PRICE_TO_PLAN: Record<string, string> = {
  'price_1TWjBLC2lxIY4GthiRV6tYo3': 'starter',
  'price_1TWjDVC2lxIY4GthvtN0Jdxu': 'business',
  'price_1TWjDqC2lxIY4GthwMqCklKB': 'enterprise',
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? ''
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ✅ IDEMPOTENZ-CHECK: Event schon mal verarbeitet?
  const { data: existing } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('id', event.id)
    .single()

  if (existing) {
    console.log(`Event ${event.id} bereits verarbeitet, skip.`)
    return NextResponse.json({ received: true, duplicate: true })
  }

  const obj = event.data.object as any

  try {
    // ===== checkout.session.completed =====
    if (event.type === 'checkout.session.completed') {
      const uid = obj.metadata?.supabase_uid
      const subscriptionId = obj.subscription as string
      if (uid && subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = sub.items.data[0].price.id
        await supabase.from('profiles').update({
          plan: PRICE_TO_PLAN[priceId] || 'starter',
          subscription_status: 'active',
          subscription_id: subscriptionId,
          stripe_customer_id: obj.customer as string,
        }).eq('id', uid)
        console.log(`✅ Abo aktiviert für User ${uid}: ${PRICE_TO_PLAN[priceId]}`)
      }
    }

    // ===== customer.subscription.updated =====
    else if (event.type === 'customer.subscription.updated') {
      const priceId = obj.items.data[0].price.id
      const status = obj.status // active, past_due, canceled, unpaid, incomplete, etc.

      // Nur "active" und "trialing" geben Premium-Zugang
      const isActive = status === 'active' || status === 'trialing'

      await supabase.from('profiles').update({
        plan: isActive ? (PRICE_TO_PLAN[priceId] || 'starter') : 'free',
        subscription_status: isActive ? 'active' : status,
        subscription_id: obj.id,
      }).eq('stripe_customer_id', obj.customer as string)
      console.log(`🔄 Abo-Update: customer=${obj.customer} status=${status}`)
    }

    // ===== customer.subscription.deleted =====
    else if (event.type === 'customer.subscription.deleted') {
      await supabase.from('profiles').update({
        plan: 'free',
        subscription_status: 'canceled',
        subscription_id: null,
      }).eq('stripe_customer_id', obj.customer as string)
      console.log(`❌ Abo gekündigt: customer=${obj.customer}`)
    }

    // ===== invoice.payment_failed =====
    else if (event.type === 'invoice.payment_failed') {
      // Stripe gibt User 1-3 Retries je nach Setting. Nach finalem Fehlschlag
      // wird subscription.status auf "past_due" oder "unpaid" gesetzt.
      // Hier: Status spiegeln, damit User sieht dass was nicht stimmt.
      const customerId = obj.customer as string
      await supabase.from('profiles').update({
        subscription_status: 'past_due',
      }).eq('stripe_customer_id', customerId)
      console.log(`⚠️ Zahlung fehlgeschlagen: customer=${customerId}`)
    }

    // ===== invoice.payment_succeeded (Re-Aktivierung nach Fehler) =====
    else if (event.type === 'invoice.payment_succeeded') {
      const customerId = obj.customer as string
      await supabase.from('profiles').update({
        subscription_status: 'active',
      }).eq('stripe_customer_id', customerId)
      console.log(`✅ Zahlung erfolgreich: customer=${customerId}`)
    }

    // ===== Event als verarbeitet markieren =====
    await supabase.from('stripe_events').insert({
      id: event.id,
      type: event.type,
    })

    return NextResponse.json({ received: true })

  } catch (err: any) {
    console.error('Webhook processing error:', err)
    // Event NICHT als verarbeitet markieren → Stripe retried automatisch
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}