import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Levenshtein-Distanz für Adress-Match
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1]
      else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
    }
  }
  return matrix[b.length][a.length]
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0
  const longer = a.length >= b.length ? a : b
  const shorter = a.length >= b.length ? b : a
  if (longer.length === 0) return 1.0
  return (longer.length - levenshtein(longer.toLowerCase(), shorter.toLowerCase())) / longer.length
}

// 5 realistische Mock-Szenarien (verschiedene Confidence-Level + Kategorien)
const MOCK_RESPONSES = [
  {
    betrag_brutto: 1247.50, mwst_satz: 19, datum: '2026-05-15',
    lieferant: 'Stadtwerke Osnabrück',
    kategorie_vorschlag: 'heizung',
    rechnungs_nr: 'RE-2026-4421',
    adresse_aus_beleg: 'Wielandstraße 11, Wallenhorst',
    confidence: 0.91,
  },
  {
    betrag_brutto: 89.99, mwst_satz: 19, datum: '2026-04-20',
    lieferant: 'Bauhaus GmbH',
    kategorie_vorschlag: 'instandhaltung',
    rechnungs_nr: 'BH-2026-885',
    adresse_aus_beleg: null,  // → User muss Objekt manuell wählen
    confidence: 0.78,
  },
  {
    betrag_brutto: 312.40, mwst_satz: 19, datum: '2026-06-01',
    lieferant: 'Energieversorgung Mitte AG',
    kategorie_vorschlag: 'allgemeinstrom',
    rechnungs_nr: 'EVM-2026-1102',
    adresse_aus_beleg: 'Quellwiese 47',
    confidence: 0.87,
  },
  {
    betrag_brutto: 215.00, mwst_satz: 7, datum: '2026-03-30',
    lieferant: 'Abfallwirtschaft Osnabrück',
    kategorie_vorschlag: 'muell',
    rechnungs_nr: 'AWO-2026-203',
    adresse_aus_beleg: 'Quellwiese 47, Wallenhorst',
    confidence: 0.95,
  },
  {
    betrag_brutto: 65.00, mwst_satz: 0, datum: '2026-05-08',
    lieferant: 'Gemeinde Wallenhorst',
    kategorie_vorschlag: 'grundsteuer',
    rechnungs_nr: '2026/Q2',
    adresse_aus_beleg: null,
    confidence: 0.82,
  },
]

export async function POST(req: NextRequest) {
  // 1. Auth
  const authHeader = req.headers.get('Authorization')
  const accessToken = authHeader?.replace('Bearer ', '')
  if (!accessToken) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: { user }, error: userErr } = await supabase.auth.getUser(accessToken)
  if (userErr || !user) {
    return NextResponse.json({ error: 'Ungültiges Token' }, { status: 401 })
  }

  // 2. File aus FormData
  let file: File | null = null
  try {
    const formData = await req.formData()
    file = formData.get('file') as File
  } catch (e) {
    return NextResponse.json({ error: 'Datei fehlt' }, { status: 400 })
  }
  if (!file) {
    return NextResponse.json({ error: 'Datei fehlt' }, { status: 400 })
  }

  // 3. Extract: Mock oder Real
  const isMock = !process.env.ANTHROPIC_API_KEY
  let extracted: any

  if (isMock) {
    // Deterministisches Mock-Picking via File-Hash (gleiche Datei = gleiches Mock)
    await new Promise(r => setTimeout(r, 1500))
    const hash = file.name.length + file.size + file.name.charCodeAt(0)
    extracted = { ...MOCK_RESPONSES[hash % MOCK_RESPONSES.length], is_mock: true }
  } else {
    // TODO: Real Claude Vision API Call (kommt wenn API Key da)
    return NextResponse.json({
      error: 'Real API noch nicht implementiert. ANTHROPIC_API_KEY entfernen für Mock-Mode.'
    }, { status: 501 })
  }

  // 4. Adress-Matching gegen user's properties
  let propertyMatch: any = null
  if (extracted.adresse_aus_beleg) {
    const { data: props } = await supabase
      .from('properties')
      .select('id, name, address, city')
      .eq('owner_id', user.id)

    if (props && props.length > 0) {
      let bestMatch: any = null
      let bestScore = 0
      const search = (extracted.adresse_aus_beleg || '').toLowerCase()
      for (const p of props) {
        const propStr = `${p.address || ''} ${p.city || ''} ${p.name || ''}`.toLowerCase()
        const score = similarity(search, propStr)
        if (score > bestScore) {
          bestScore = score
          bestMatch = p
        }
      }
      if (bestMatch && bestScore > 0.5) {
        propertyMatch = { ...bestMatch, address_confidence: bestScore }
      }
    }
  }

  return NextResponse.json({ ...extracted, property_match: propertyMatch })
}
