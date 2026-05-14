import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
export const runtime = 'nodejs'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICE_TO_PLAN: Record<string, string> = {
  'price_1TWjBLC2lxIY4GthiRV6tYo3': 'starter',
  'price_1TWjDVC2lxIY4GthvtN0Jdxu': 'business',
  'price_1TWjDqC2lxIY4GthwMqCklKB': 'enterprise',
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET ?? '')
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const obj = event.data.object as any

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
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const priceId = obj.items.data[0].price.id
    await supabase.from('profiles').update({
      plan: PRICE_TO_PLAN[priceId] || 'starter',
      subscription_status: obj.status === 'active' ? 'active' : 'inactive',
      subscription_id: obj.id,
    }).eq('stripe_customer_id', obj.customer as string)
  }

  if (event.type === 'customer.subscription.deleted') {
    await supabase.from('profiles').update({
      plan: 'free',
      subscription_status: 'inactive',
      subscription_id: null,
    }).eq('stripe_customer_id', obj.customer as string)
  }

  return NextResponse.json({ received: true })
}