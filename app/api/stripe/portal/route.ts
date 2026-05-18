import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getAuthedUser } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const user = await getAuthedUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('stripe_customer_id').eq('id', user.id).single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'Kein Abo gefunden' }, { status: 404 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    })
    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe portal error:', error)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}