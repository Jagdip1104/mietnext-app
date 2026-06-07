import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  // Vercel-Cron sendet diesen Header automatisch, wenn CRON_SECRET gesetzt ist
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: due, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .not('deletion_purge_at', 'is', null)
    .lte('deletion_purge_at', new Date().toISOString())

  if (error) {
    console.error('[purge] Query fehlgeschlagen:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: any[] = []

  for (const row of due || []) {
    const ownerId = row.id
    try {
      // 1) Beleg-Dateien im Storage loeschen (Prefix = ownerId/)
      const { data: files } = await supabaseAdmin.storage.from('receipts').list(ownerId, { limit: 1000 })
      if (files && files.length > 0) {
        await supabaseAdmin.storage.from('receipts').remove(files.map((f: any) => `${ownerId}/${f.name}`))
      }

      // 2) Daten-Baum loeschen -> verwaiste Mieter-Auth-IDs zurueck
      const { data: orphans, error: rpcErr } =
        await supabaseAdmin.rpc('purge_owner_data', { p_owner: ownerId })
      if (rpcErr) throw new Error('purge_owner_data: ' + rpcErr.message)

      // 3) Vermieter-Auth-User loeschen
      await supabaseAdmin.auth.admin.deleteUser(ownerId)

      // 4) Verwaiste Mieter-Auth-User loeschen
      for (const uid of (orphans as string[] | null) || []) {
        try { await supabaseAdmin.auth.admin.deleteUser(uid) }
        catch (e: any) { console.error('[purge] Mieter-Auth loeschen fehlgeschlagen', uid, e?.message) }
      }

      results.push({ ownerId, ok: true, orphanTenants: (orphans as string[] | null)?.length || 0 })
    } catch (e: any) {
      console.error('[purge] Fehler bei', ownerId, e?.message)
      results.push({ ownerId, ok: false, error: e?.message })
    }
  }

  return NextResponse.json({ purged: results.length, results })
}
