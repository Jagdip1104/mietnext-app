'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const BETA_PASSWORD = process.env.NEXT_PUBLIC_BETA_PASSWORD || ''
const STORAGE_KEY = 'mietnext_assistent_beta'

type Msg = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Wie erstelle ich eine Nebenkostenabrechnung?',
  'Was bedeutet der Umlageschlüssel nach Personen?',
  'Wie funktioniert der Excel-Import?',
  'Wann ist die Miete fällig?',
]

export default function AssistentPage() {
  const [authed, setAuthed] = useState(false)
  const [checked, setChecked] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && stored === BETA_PASSWORD && BETA_PASSWORD) setAuthed(true)
    setChecked(true)
  }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const unlock = () => {
    if (!BETA_PASSWORD) { setPwError('Beta-Passwort ist nicht konfiguriert.'); return }
    if (pwInput === BETA_PASSWORD) { localStorage.setItem(STORAGE_KEY, pwInput); setAuthed(true); setPwError('') }
    else setPwError('Falsches Passwort.')
  }

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    const next: Msg[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setMessages([...next, { role: 'assistant', content: '⚠️ Bitte neu einloggen.' }]); setLoading(false); return }
      const res = await fetch('/api/assistent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      if (!res.ok) setMessages([...next, { role: 'assistant', content: '⚠️ Fehler: ' + (data.error || res.status) }])
      else setMessages([...next, { role: 'assistant', content: data.reply }])
    } catch (e: any) {
      setMessages([...next, { role: 'assistant', content: '⚠️ Fehler: ' + (e.message || 'Unbekannt') }])
    } finally {
      setLoading(false)
    }
  }

  if (!checked) return null

  if (!authed) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '380px', background: '#fff', border: '1px solid #e8e6e0', borderRadius: '14px', padding: '28px' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#1a1a1a', margin: '0 0 6px' }}>
            Assistent <span style={{ fontSize: '11px', background: '#1a1a1a', color: '#fff', padding: '2px 8px', borderRadius: '20px', verticalAlign: 'middle' }}>Beta</span>
          </h1>
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 18px' }}>Geschlossene Beta — bitte Passwort eingeben.</p>
          <input type="password" value={pwInput} onChange={e => setPwInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && unlock()} placeholder="Beta-Passwort"
            style={{ width: '100%', padding: '11px 14px', fontSize: '14px', border: '1px solid #e8e6e0', borderRadius: '10px', marginBottom: '10px', boxSizing: 'border-box' }} />
          {pwError && <p style={{ fontSize: '12px', color: '#dc2626', margin: '0 0 10px' }}>{pwError}</p>}
          <button onClick={unlock} style={{ width: '100%', padding: '11px', fontSize: '14px', fontWeight: 500, background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>Freischalten</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '20px 16px 150px', minHeight: '70vh' }}>
      <style>{`.mn-inputbar{bottom:72px}@media(min-width:768px){.mn-inputbar{bottom:0}}`}</style>

      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#1a1a1a', margin: 0 }}>
          MietNext Assistent <span style={{ fontSize: '11px', background: '#1a1a1a', color: '#fff', padding: '2px 8px', borderRadius: '20px', verticalAlign: 'middle' }}>Beta</span>
        </h1>
        <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0' }}>Fragen zu Funktionen &amp; Mietrecht. (Sieht noch nicht deine konkreten Daten.)</p>
      </div>

      {messages.length === 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => send(s)} style={{ fontSize: '13px', color: '#1a1a1a', background: '#fafaf8', border: '1px solid #e8e6e0', borderRadius: '20px', padding: '8px 14px', cursor: 'pointer' }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: '11px 15px', borderRadius: '14px', fontSize: '14px', lineHeight: 1.5, whiteSpace: 'pre-wrap',
              background: m.role === 'user' ? '#1a1a1a' : '#fafaf8',
              color: m.role === 'user' ? '#fff' : '#1a1a1a',
              border: m.role === 'user' ? 'none' : '1px solid #e8e6e0',
            }}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '11px 15px', borderRadius: '14px', fontSize: '14px', color: '#999', background: '#fafaf8', border: '1px solid #e8e6e0' }}>denkt nach…</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mn-inputbar" style={{ position: 'fixed', left: 0, right: 0, background: '#fff', borderTop: '1px solid #e8e6e0', padding: '12px 16px', zIndex: 30 }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Frage zu MietNext stellen…" rows={1}
            style={{ flex: 1, padding: '11px 14px', fontSize: '14px', border: '1px solid #e8e6e0', borderRadius: '12px', resize: 'none', maxHeight: '120px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            style={{ padding: '11px 18px', fontSize: '14px', fontWeight: 500, background: (loading || !input.trim()) ? '#ccc' : '#16a34a', color: '#fff', border: 'none', borderRadius: '12px', cursor: (loading || !input.trim()) ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>Senden</button>
        </div>
      </div>
    </div>
  )
}
