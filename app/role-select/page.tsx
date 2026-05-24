'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RoleSelect() {
  const [loading, setLoading] = useState(true)
  const [isLandlord, setIsLandlord] = useState(false)
  const [isTenant, setIsTenant] = useState(false)
  const router = useRouter()

  useEffect(() => {
      const check = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }

        const userId = session.user.id
        const userEmail = (session.user.email ?? '').toLowerCase().trim()

        // Check 1: Mieter? (per user_id ODER email - fallback wenn noch nicht verknüpft)
        let tenantUser = false
        if (userEmail) {
          const { data: tenantRows } = await supabase
            .from('tenants')
            .select('id, user_id')
            .or(`user_id.eq.${userId},email.eq.${userEmail}`)
          
          if (tenantRows && tenantRows.length > 0) {
            tenantUser = true
            // Auto-Link: tenants.user_id setzen wenn noch null
            const unlinked = tenantRows.find((t: any) => !t.user_id)
            if (unlinked) {
              await supabase.from('tenants').update({ user_id: userId }).eq('id', unlinked.id)
            }
          }
        }

        // Check 2: Vermieter? (Profil-Eintrag existiert)
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle()
        const landlord = !!profile

        // Nur eine Rolle → direkt weiterleiten
        if (landlord && !tenantUser) { router.push('/dashboard'); return }
        if (!landlord && tenantUser) { router.push('/tenant-portal'); return }

        // Beide oder keine → Auswahl zeigen
        setIsLandlord(landlord)
        setIsTenant(tenantUser)
        setLoading(false)
      }
      check()
    }, [])

  const goToVermieter = () => router.push('/dashboard')
  const goToMieter = () => router.push('/tenant-portal')
  const signOut = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#999', fontSize: '14px' }}>Lade...</p>
      </main>
    )
  }

  // Edge-Case: User hat weder Vermieter- noch Mieter-Zugang
  if (!isLandlord && !isTenant) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤔</div>
          <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 12px', fontFamily: 'Georgia, serif' }}>
            Kein Zugang gefunden
          </h1>
          <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px', lineHeight: 1.6 }}>
            Dein Konto hat weder Vermieter-Zugang noch ist es einem Mieter-Profil zugeordnet.
          </p>
          <p style={{ fontSize: '13px', color: '#999', margin: '0 0 32px', lineHeight: 1.6 }}>
            Falls du als Mieter eingeladen wurdest, bitte deinen Vermieter die Einladung neu zu senden.
            Falls du als Vermieter starten möchtest, registriere dich bitte neu.
          </p>
          <button onClick={signOut} style={{
            backgroundColor: '#1a1a1a', color: '#fff', padding: '12px 24px',
            borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer',
          }}>
            Abmelden
          </button>
        </div>
      </main>
    )
  }

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
          {isLandlord && (
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
          )}

          {isTenant && (
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
          )}
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
