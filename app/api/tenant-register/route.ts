import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { email, userId } = await req.json()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Mieter per E-Mail finden
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('email', email)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Kein Mieter gefunden' }, { status: 404 })
  }

  // tenant_users Eintrag erstellen
  const { data: existing } = await supabaseAdmin
    .from('tenant_users')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!existing) {
    await supabaseAdmin.from('tenant_users').insert({
      user_id: userId,
      tenant_id: tenant.id,
    })
  }

  return NextResponse.json({ success: true })
}