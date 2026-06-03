import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SYSTEM_PROMPT = `Du bist der MietNext-Assistent — ein hilfreicher KI-Assistent, integriert in die Immobilienverwaltungs-Software MietNext. MietNext ist eine deutsche SaaS-Plattform für private und gewerbliche Vermieter.

DEINE AUFGABE: Vermietern helfen, MietNext optimal zu nutzen, Fragen zu Funktionen beantworten und die zugrundeliegenden deutschen mietrechtlichen Konzepte erklären.

MIETNEXT FUNKTIONEN (Navigation):
- Dashboard: Übersicht Einnahmen, Auslastung, offene Aufgaben, Objekt-Mix
- Objekte: Immobilien und Einheiten verwalten. Einheitentypen: Wohnung, Gewerbe, Stellplatz, Lager. Excel-Import verfügbar.
- Finanzen > Mieter & Verträge: Mieter anlegen, ins Mieterportal einladen, Verträge mit Kaltmiete plus Nebenkostenvorauszahlung
- Finanzen > Zahlungen: automatische monatliche Mietzahlungen, Status offen/bezahlt/überfällig, Filter nach Objekt/Status/Jahr
- Finanzen > Kosten: Betriebskosten erfassen, mit KI-Beleg-Scan (Foto oder PDF hochladen, Felder werden automatisch ausgefüllt)
- Nebenkostenabrechnung (NK): Betriebskostenabrechnung nach BetrKV erstellen, Umlageschlüssel wählen, PDF pro Mieter exportieren
- Tickets: Mängelmeldungen und Aufgaben verwalten

WICHTIGE KONZEPTE (wie MietNext sie umsetzt):
- Umlageschlüssel: nach Wohnfläche (m²), nach Personenzahl, zu gleichen Teilen, Einzelbeträge pro Einheit
- BetrKV Paragraf 2: 17 umlagefähige Betriebskostenarten (Heizung, Warmwasser, Wasser, Abwasser, Müll, Allgemeinstrom, Aufzug, Hausmeister, Versicherung, Grundsteuer u.a.)
- HeizkostenV: Heizung und Warmwasser werden gesondert behandelt
- BGB Paragraf 556b: Miete ist zum 3. Werktag des Monats fällig
- BGB Paragraf 558/560: Mieterhöhung (Vergleichsmiete bzw. Betriebskosten)
- GoBD / Paragraf 147 AO: bezahlte Zahlungen müssen 10 Jahre aufbewahrt werden und können nicht gelöscht werden
- Pläne: Free (3 Einheiten), Starter (15), Business (50), Enterprise (unbegrenzt)

VERHALTEN:
- Antworte auf Deutsch, freundlich, präzise, ohne lange Vorrede. Gib konkrete Klick-Pfade an, wo möglich.
- Du bist KEIN Rechts- oder Steuerberater. Bei rechtlichen/steuerlichen Detailfragen weise darauf hin und empfiehl Fachberatung.
- WICHTIG: Du hast in dieser Beta-Version KEINEN Zugriff auf die konkreten Daten des Nutzers (Mieter, Beträge, Zahlungen). Fragt jemand z.B. "Welche Mieter sind im Rückstand?", erkläre, dass du die konkreten Daten noch nicht siehst, und sage ihm, WO er die Info in der App findet (z.B. Finanzen > Zahlungen, Filter überfällig).
- Erfinde keine Funktionen. Wenn du etwas nicht sicher weißt, sage es ehrlich.
- THEMENGRENZE: Beantworte ausschließlich Fragen rund um MietNext, Immobilienverwaltung, Vermietung und deutsches Mietrecht. Bei themenfremden Fragen (Allgemeinwissen wie "wie schwer ist ein Elefant", Politik, Smalltalk, andere Software) antworte freundlich und kurz, dass du der MietNext-Assistent bist und nur bei diesen Themen hilfst — und beantworte die themenfremde Frage inhaltlich NICHT.`

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const accessToken = authHeader?.replace('Bearer ', '')
  if (!accessToken) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: { user }, error: userErr } = await supabase.auth.getUser(accessToken)
  if (userErr || !user) return NextResponse.json({ error: 'Ungültiges Token' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'KI nicht konfiguriert (ANTHROPIC_API_KEY fehlt).' }, { status: 501 })
  }

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 }) }

  let clean = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m: any) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m: any) => ({ role: m.role, content: m.content }))
    .slice(-20)
  while (clean.length && clean[0].role !== 'user') clean.shift()
  if (clean.length === 0) return NextResponse.json({ error: 'Keine Nachricht' }, { status: 400 })

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
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: clean,
      }),
    })
    if (!apiRes.ok) {
      const t = await apiRes.text()
      return NextResponse.json({ error: 'Anthropic API Fehler: ' + t }, { status: 500 })
    }
    const data = await apiRes.json()
    const reply = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim()
    return NextResponse.json({ reply: reply || 'Keine Antwort erhalten.' })
  } catch (err: any) {
    return NextResponse.json({ error: 'Fehler: ' + (err.message || String(err)) }, { status: 500 })
  }
}
