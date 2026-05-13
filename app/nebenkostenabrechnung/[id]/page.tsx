'use client'

import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

export default function NebenkostenabrechnungDetail() {
  const router = useRouter()

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px' }}>
        <button onClick={() => router.push('/nebenkostenabrechnung')}
          style={{ background: 'none', border: 'none', color: '#888', fontSize: '13px', cursor: 'pointer', marginBottom: '24px', padding: 0 }}>
          ← Zurück zur Übersicht
        </button>
        <div style={{ backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '64px', textAlign: 'center' }}>
          <p style={{ fontSize: '32px', margin: '0 0 16px' }}>🔧</p>
          <p style={{ fontSize: '15px', color: '#999', margin: '0 0 4px' }}>Kosteneingabe kommt in Etappe 2</p>
          <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>
            Hier werden Kostenpositionen, Umlageschlüssel und Ergebnisse pro Einheit erscheinen.
          </p>
        </div>
      </div>
    </main>
  )
}