'use client'

import { useEffect, useState } from 'react'

const BETA_PASSWORD = process.env.NEXT_PUBLIC_BETA_PASSWORD || ''
const STORAGE_KEY = 'mietvertrag_beta_access'

export default function MietvertragPage() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null)
  const [pwInput, setPwInput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // Check localStorage
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && stored === BETA_PASSWORD && BETA_PASSWORD) {
      setUnlocked(true)
    } else {
      setUnlocked(false)
    }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!BETA_PASSWORD) {
      setError('Beta-Password ist nicht konfiguriert (NEXT_PUBLIC_BETA_PASSWORD fehlt).')
      return
    }
    if (pwInput === BETA_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, pwInput)
      setUnlocked(true)
      setError('')
    } else {
      setError('Falsches Passwort. Bitte erneut versuchen.')
      setPwInput('')
    }
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY)
    setUnlocked(false)
    setPwInput('')
  }

  if (unlocked === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>Lade…</div>
      </div>
    )
  }

  if (!unlocked) {
    return (
      <div style={{ maxWidth: '440px', margin: '4rem auto', padding: '0 1rem' }}>
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
            <div style={{
              width: '40px', height: '40px',
              background: '#1B4FD8', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 600, fontSize: '14px'
            }}>MN</div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 600 }}>Mietvertrag-Generator</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Beta-Zugang erforderlich</div>
            </div>
          </div>

          <div style={{
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '8px',
            padding: '12px 14px',
            fontSize: '12.5px',
            color: '#92400e',
            lineHeight: 1.6,
            marginBottom: '1.5rem'
          }}>
            ⚠️ <strong>Geschlossene Beta.</strong> Dieser Bereich ist für interne Tests und ausgewählte Beta-Tester reserviert. Bitte gib das Test-Passwort ein.
          </div>

          <form onSubmit={handleSubmit}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 500,
              color: '#6b7280',
              marginBottom: '6px'
            }}>
              Beta-Passwort
            </label>
            <input
              type="password"
              value={pwInput}
              onChange={(e) => { setPwInput(e.target.value); setError('') }}
              placeholder="Passwort eingeben…"
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: error ? '1px solid #ef4444' : '1px solid #d1d5db',
                borderRadius: '8px',
                fontFamily: 'inherit',
                marginBottom: error ? '6px' : '14px'
              }}
            />
            {error && (
              <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '14px' }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '10px 16px',
                background: '#1a1a1a',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Zugang freischalten
            </button>
          </form>

          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #f3f4f6',
            fontSize: '11.5px',
            color: '#9ca3af',
            textAlign: 'center'
          }}>
            Du hast keinen Zugang? Schreibe an{' '}
            <a href="mailto:kontakt@mietnext.de" style={{ color: '#1B4FD8' }}>kontakt@mietnext.de</a>
          </div>
        </div>
      </div>
    )
  }

  // Unlocked — show generator via iframe
  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 64px)', marginTop: '-1rem' }}>
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '12px',
        zIndex: 10
      }}>
        <button
          onClick={handleLogout}
          style={{
            padding: '5px 10px',
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '11px',
            cursor: 'pointer',
            color: '#6b7280'
          }}
          title="Beta-Sitzung beenden"
        >
          🔒 Sperren
        </button>
      </div>
      <iframe
        src="/mietvertrag-app.html"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
        title="MietNext Mietvertrag-Generator"
      />
    </div>
  )
}
