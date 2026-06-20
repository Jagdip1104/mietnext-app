'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function OnboardingChecklist() {
  const [loading, setLoading] = useState(true)
  const [profileOk, setProfileOk] = useState(false)
  const [hasProps, setHasProps] = useState(false)
  const [hasTenants, setHasTenants] = useState(false)
  const [hasContracts, setHasContracts] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const uid = session.user.id

      const { data: prof } = await supabase.from('profiles')
        .select('landlord_name, landlord_street, landlord_iban').eq('id', uid).single()
      setProfileOk(!!(prof && prof.landlord_name && prof.landlord_street && prof.landlord_iban))

      const { count: pc } = await supabase.from('properties')
        .select('id', { count: 'exact', head: true }).eq('owner_id', uid)
      setHasProps((pc || 0) > 0)

      const { data: tns } = await supabase.from('tenants').select('id').eq('owner_id', uid)
      const tIds = (tns || []).map((t: any) => t.id)
      setHasTenants(tIds.length > 0)

      if (tIds.length > 0) {
        const { count: cc } = await supabase.from('contracts')
          .select('id', { count: 'exact', head: true }).in('tenant_id', tIds)
        setHasContracts((cc || 0) > 0)
      }
      setLoading(false)
    }
    run()
  }, [])

  if (loading || dismissed) return null

  const steps = [
    { done: profileOk, label: 'Vermieter-Daten ausfuellen', hint: 'Name, Adresse, IBAN - kommen in Mahnung & Nebenkostenabrechnung', href: '/profile' },
    { done: hasProps, label: 'Erstes Objekt anlegen', hint: 'Haus oder Wohnung mit Einheiten', href: '/properties' },
    { done: hasTenants, label: 'Mieter hinzufuegen', hint: 'Am besten mit E-Mail (fuer Portal & Versand)', href: '/tenants' },
    { done: hasContracts, label: 'Vertrag erfassen', hint: 'Danach entstehen die Zahlungen automatisch', href: '/contracts' },
  ]
  const doneCount = steps.filter(s => s.done).length
  if (doneCount === steps.length) return null

  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '20px 22px', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
        <div>
          <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#1a1a1a', margin: 0, fontFamily: 'Georgia, serif' }}>Erste Schritte</h2>
          <p style={{ fontSize: '13px', color: '#999', margin: '2px 0 0' }}>{doneCount} von {steps.length} erledigt</p>
        </div>
        <button onClick={() => setDismissed(true)} title="Ausblenden" style={{ background: 'none', border: 'none', color: '#bbb', fontSize: '18px', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }}>{'\u00d7'}</button>
      </div>

      <div style={{ height: '6px', backgroundColor: '#f0eee8', borderRadius: '99px', overflow: 'hidden', margin: '4px 0 16px' }}>
        <div style={{ height: '100%', width: `${(doneCount / steps.length) * 100}%`, backgroundColor: '#16a34a', transition: 'width 0.3s' }} />
      </div>

      <div style={{ backgroundColor: '#faf9f6', border: '1px solid #f0eee8', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: '#666' }}>Schon einen Bestand? Importiere alles auf einmal.</span>
        <Link href="/import" style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a', textDecoration: 'none', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '7px 14px', whiteSpace: 'nowrap' }}>Per Excel importieren</Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {steps.map((s, i) => (
          <Link key={i} href={s.href} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 8px', borderRadius: '8px', textDecoration: 'none', borderBottom: i < steps.length - 1 ? '1px solid #f5f4ef' : 'none' }}>
            <div style={{ flexShrink: 0, width: '20px', height: '20px', borderRadius: '99px', marginTop: '1px', backgroundColor: s.done ? '#16a34a' : '#fff', border: s.done ? 'none' : '1.5px solid #d8d4cc', color: '#fff', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.done ? '\u2713' : ''}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: s.done ? '#999' : '#1a1a1a', margin: 0, textDecoration: s.done ? 'line-through' : 'none' }}>{s.label}</p>
              <p style={{ fontSize: '12px', color: '#bbb', margin: '2px 0 0' }}>{s.hint}</p>
            </div>
            {!s.done && <span style={{ color: '#999', fontSize: '15px', alignSelf: 'center' }}>{'\u2192'}</span>}
          </Link>
        ))}
      </div>
    </div>
  )
}
