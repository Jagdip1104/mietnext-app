import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PROMPT = `Das ist eine Hausgeldabrechnung / Einzelabrechnung einer WEG-Hausverwaltung für einen einzelnen Wohnungseigentümer.

Lies JEDE Abrechnungsposition (Kostenart) und den auf DIESEN Eigentümer entfallenden Betrag in Euro.
WICHTIG: Nimm den persönlichen Anteil ("Ihr Anteil", "Anteil", "Ihr Betrag") — NICHT die Gebäude-Gesamtsumme ("Gesamt").
Falls keine Anteilsspalte existiert und nur ein Gesamtbetrag dasteht, nimm diesen.

Gib AUSSCHLIESSLICH ein gültiges JSON-Array zurück, ohne Markdown, ohne Erklärung, ohne Code-Fences:
[{"bezeichnung": "Gebaeudeversicherung", "betrag": 108.91}, {"bezeichnung": "Verwaltergebuehren", "betrag": 258.00}]

Regeln:
- "bezeichnung": die Kostenart woertlich aus dem Dokument (z.B. "Hauswartkosten", "Muellabfuhrgeb.")
- "betrag": Zahl mit Punkt als Dezimaltrenner, ohne Waehrungszeichen, ohne Tausenderpunkt
- Erfasse ALLE Positionen, auch nicht umlagefaehige (Verwaltung, Ruecklage, Reparatur) — die Filterung passiert spaeter
- Zufuehrung zur Ruecklage / Erhaltungsruecklage NUR aufnehmen, wenn sie als eigene Kostenposition gelistet ist
- Wenn das Bild keine Abrechnung ist, gib [] zurueck`

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const accessToken = authHeader?.replace('Bearer ', '')
  if (!accessToken) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: { user }, error: userErr } = await supabase.auth.getUser(accessToken)
  if (userErr || !user) return NextResponse.json({ error: 'Ungueltiges Token' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'KI nicht konfiguriert (ANTHROPIC_API_KEY fehlt).' }, { status: 501 })
  }

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Ungueltige Anfrage' }, { status: 400 }) }

  const { fileBase64, mediaType } = body || {}
  if (!fileBase64 || !mediaType) return NextResponse.json({ error: 'Keine Datei uebergeben' }, { status: 400 })

  const isPdf = mediaType === 'application/pdf'
  const sourceBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data: fileBase64 } }

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: [sourceBlock, { type: 'text', text: PROMPT }] }],
      }),
    })
    if (!apiRes.ok) {
      const t = await apiRes.text()
      return NextResponse.json({ error: 'Anthropic API Fehler: ' + t }, { status: 500 })
    }
    const data = await apiRes.json()
    let raw = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim()
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
    let positions: any[] = []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        positions = parsed
          .filter((p: any) => p && typeof p.bezeichnung === 'string')
          .map((p: any) => ({ bezeichnung: String(p.bezeichnung).trim(), betrag: Number(p.betrag) || 0 }))
      }
    } catch {
      return NextResponse.json({ error: 'KI-Antwort nicht lesbar. Bitte manuell erfassen.' }, { status: 422 })
    }
    return NextResponse.json({ positions })
  } catch (err: any) {
    return NextResponse.json({ error: 'Fehler: ' + (err.message || String(err)) }, { status: 500 })
  }
}
