'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RoleSelect() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Auto-Linking: tenants per E-Mail mit user_id verknüpfen
      const userEmail = (session.user.email ?? '').toLowerCase().trim()
      if (userEmail) {
        const { data: unlinked } = await supabase
          .from('tenants').select('id').eq('email', userEmail).is('user_id', null)
        if (unlinked && unlinked.length > 0) {
          await supabase.from('tenants').update({ user_id: session.user.id }).eq('email', userEmail).is('user_id', null)
        }
      }
    }
    check()

    // Error-Param aus URL lesen
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const err = params.get('error')
      if (err === 'no-landlord') setErrorMsg('Du hast keinen Vermieter-Zugang. Bitte als Mieter einloggen oder als Vermieter neu registrieren.')
      if (err === 'no-tenant') setErrorMsg('Du hast keinen Mieter-Zugang. Bitte als Vermieter einloggen oder einladen lassen.')
    }
  }, [])

  const goToVermieter = () => router.push('/dashboard')
  const goToMieter = () => router.push('/tenant-portal')
  const signOut = async () => { await supabase.auth.signOut(); router.push('/login') }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', fontFamily: 'Georgia, serif', marginBottom: '8px' }}>
            MietNext
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>
            Wie möchtest du fortfahren?
          </h1>
          <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
            Wähle aus, mit welcher Rolle du dich anmelden möchtest
          </p>
        </div>

        {errorMsg && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <p style={{ fontSize: '13px', color: '#dc2626', margin: 0, lineHeight: 1.5 }}>{errorMsg}</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
          <button onClick={signOut}
            style={{ background: 'none', border: 'none', color: '#bbb', fontSize: '13px', cursor: 'pointer' }}>
            Abmelden
          </button>
        </div>
      </div>
    </main>
  )
}
