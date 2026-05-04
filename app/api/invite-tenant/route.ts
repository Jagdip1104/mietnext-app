import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, tenantName, registerLink } = await req.json()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'MietNext <noreply@mietnext.de>',
      to: email,
      subject: 'Dein Zugang zum Mieter-Portal',
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 400; color: #1a1a1a; margin-bottom: 8px;">MietNext</h1>
          <p style="font-size: 14px; color: #999; margin-bottom: 32px;">Mieter-Portal Einladung</p>
          
          <p style="font-size: 16px; color: #1a1a1a; margin-bottom: 16px;">Hallo ${tenantName},</p>
          
          <p style="font-size: 15px; color: #444; line-height: 1.6; margin-bottom: 24px;">
            Dein Vermieter hat dir Zugang zum MietNext Mieter-Portal eingerichtet. 
            Dort kannst du deine Wohnungsdaten einsehen und Schadensmeldungen einreichen.
          </p>
          
          <a href="${registerLink}" style="display: inline-block; background-color: #1a1a1a; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-family: system-ui, sans-serif; margin-bottom: 24px;">
            Zugang einrichten →
          </a>
          
          <p style="font-size: 13px; color: #999; margin-bottom: 8px;">
            Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:
          </p>
          <p style="font-size: 12px; color: #bbb; word-break: break-all;">
            ${registerLink}
          </p>
          
          <hr style="border: none; border-top: 1px solid #e8e6e0; margin: 32px 0;" />
          <p style="font-size: 12px; color: #bbb;">
            MietNext · DSGVO-konform · Hosted in Frankfurt 🇩🇪
          </p>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'E-Mail konnte nicht gesendet werden' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}