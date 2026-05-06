'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RoleSelect() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
    }
    check()
  }, [])

  const goToVermieter = () => router.push('/dashboard')
  const goToMieter = () => router.push('/tenant-portal')

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', fontFamily: 'Georgia, serif', marginBottom: '8px' }}>
            MietNext
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>
            Wie möchtest du fortfahren?
          </h1>
          <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
            Du hast mehrere Rollen – wähle wie du einloggen möchtest
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Vermieter */}
          <button onClick={goToVermieter} style={{
            backgroundColor: '#1a1a1a', color: '#fff',
            border: 'none', borderRadius: '12px',
            padding: '28px 32px', cursor: 'pointer',
            textAlign: 'left', transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🏢</div>
            <p style={{ fontSize: '17px', fontWeight: '500', margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>
              Als Vermieter einloggen
            </p>
            <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>
              Verwalte deine Objekte, Mieter und Finanzen
            </p>
          </button>

          {/* Mieter */}
          <button onClick={goToMieter} style={{
            backgroundColor: '#fff', color: '#1a1a1a',
            border: '1px solid #e8e6e0', borderRadius: '12px',
            padding: '28px 32px', cursor: 'pointer',
            textAlign: 'left', transition: 'all 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#1a1a1a')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#e8e6e0')}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🏠</div>
            <p style={{ fontSize: '17px', fontWeight: '500', margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>
              Als Mieter einloggen
            </p>
            <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>
              Sieh deine Wohnung und melde Schäden
            </p>
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{ background: 'none', border: 'none', color: '#bbb', fontSize: '13px', cursor: 'pointer' }}>
            Abmelden
          </button>
        </div>
      </div>
    </main>
  )
}