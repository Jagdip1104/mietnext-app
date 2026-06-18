import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Address autocomplete proxy -> Photon (komoot, OSM, EU-hosted, DSGVO-freundlich)
export async function GET(req: NextRequest) {
  // nur eingeloggte Nutzer duerfen den Proxy verwenden
  try {
    const user = await getAuthedUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const q = (req.nextUrl.searchParams.get('q') || '').trim()
  if (q.length < 3) return NextResponse.json({ results: [] })

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=de&limit=8`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MietNext/1.0 (kontakt@mietnext.de)' },
      // 5s Timeout-Schutz
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return NextResponse.json({ results: [] })
    const data = await res.json()
    const results = (data.features || [])
      .filter((f: any) => f?.properties?.countrycode === 'DE')
      .map((f: any) => {
        const p = f.properties || {}
        const coords = f.geometry?.coordinates || []
        const street = [p.street || p.name, p.housenumber].filter(Boolean).join(' ')
        const cityVal = p.city || p.town || p.village || p.district || ''
        return {
          label: [street || p.name, [p.postcode, cityVal].filter(Boolean).join(' ')]
            .filter(Boolean).join(', '),
          street: street || p.name || '',
          zip: p.postcode || '',
          city: cityVal,
          lat: coords[1] ?? null,
          lng: coords[0] ?? null,
        }
      })
      .filter((r: any) => r.street || r.city)
      .filter((r: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.label === r.label) === i)
      .slice(0, 6)
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
