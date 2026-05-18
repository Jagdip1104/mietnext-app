import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getAuthedUser } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Whitelist erlaubter Stripe Price IDs – verhindert Manipulation
const ALLOWED_PRICE_IDS = new Set([
  'price_1TWjBLC2lxIY4GthiRV6tYo3', // Starter
  'price_1TWjDVC2lxIY4GthvtN0Jdxu', // Business
  'price_1TWjDqC2lxIY4GthwMqCklKB', // Enterprise
])

export async function POST(req: NextRequest) {
  // ✅ Auth via Cookie, NICHT aus Body
  const user = await getAuthedUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { priceId } = await req.json()

    if (!priceId || !ALLOWED_PRICE_IDS.has(priceId)) {
      return NextResponse.json({ error: 'Ungültiger Plan' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('stripe_customer_id').eq('id', user.id).single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_uid: user.id }
      })
      customerId = customer.id
      await supabaseAdmin.from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      locale: 'de',
      metadata: { supabase_uid: user.id }
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}