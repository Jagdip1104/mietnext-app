import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthedUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Generischer Dokument-Versand an einen Mieter (PDF als Anhang via Resend).
export async function POST(req: NextRequest) {
  const user = await getAuthedUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { tenantId, subject, heading, message, senderName, filename, pdfBase64 } = await req.json()
  if (!tenantId || !pdfBase64) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from('tenants')
    .select('id, full_name, email, owner_id')
    .eq('id', tenantId)
    .single()

  if (tenantErr || !tenant) return NextResponse.json({ error: 'tenant_not_found' }, { status: 404 })
  if (tenant.owner_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (!tenant.email) return NextResponse.json({ error: 'no_email' }, { status: 400 })

  const he3 = (heading || subject || 'Dokument').toString()
  const body = (message || 'anbei erhalten Sie das Dokument im Anhang.').toString()
  const sender = (senderName || '').toString()
  const fileNm = (filename || 'dokument.pdf').toString().replace(/[^a-zA-Z0-9._-]/g, '_')

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 22px; font-weight: 400; color: #1a1a1a; margin-bottom: 4px;">MietNext</h1>
      <p style="font-size: 14px; color: #999; margin-bottom: 28px;">${he3}</p>
      <p style="font-size: 16px; color: #1a1a1a; margin-bottom: 14px;">Hallo ${tenant.full_name || ''},</p>
      <p style="font-size: 15px; color: #444; line-height: 1.6; margin-bottom: 24px;">${body.replace(/\n/g, '<br/>')}</p>
      ${sender ? `<p style="font-size: 14px; color: #444; margin-bottom: 24px;">${sender}</p>` : ''}
      <hr style="border: none; border-top: 1px solid #e8e6e0; margin: 28px 0;" />
      <p style="font-size: 12px; color: #bbb;">MietNext &middot; DSGVO-konform &middot; Hosted in Frankfurt</p>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'MietNext <noreply@mietnext.de>',
      to: tenant.email,
      reply_to: user.email || undefined,
      subject: (subject || 'Dokument').toString().slice(0, 200),
      html,
      attachments: [{ filename: fileNm, content: pdfBase64 }],
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    console.error('[send-document] Resend error:', res.status, errBody)
    return NextResponse.json({ error: 'send_failed', details: `Resend ${res.status}` }, { status: 502 })
  }

  return NextResponse.json({ ok: true, to: tenant.email })
}
