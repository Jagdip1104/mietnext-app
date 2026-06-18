'use client'
import { useEffect, useRef, useState } from 'react'

export interface AddressSuggestion {
  label: string
  street: string
  zip: string
  city: string
  lat: number | null
  lng: number | null
}

export default function AddressAutocomplete({
  value, onChange, onSelect, placeholder, style,
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (s: AddressSuggestion) => void
  placeholder?: string
  style?: React.CSSProperties
}) {
  const [results, setResults] = useState<AddressSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hi, setHi] = useState(-1)
  const boxRef = useRef<HTMLDivElement>(null)
  const tRef = useRef<any>(null)
  const skipRef = useRef(false)

  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return }
    const q = value.trim()
    if (tRef.current) clearTimeout(tRef.current)
    if (q.length < 3) { setResults([]); setOpen(false); return }
    tRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
        const d = await r.json()
        setResults(d.results || [])
        setOpen((d.results || []).length > 0)
        setHi(-1)
      } catch { setResults([]); setOpen(false) }
      setLoading(false)
    }, 350)
    return () => { if (tRef.current) clearTimeout(tRef.current) }
  }, [value])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = (s: AddressSuggestion) => {
    skipRef.current = true
    onSelect(s)
    setOpen(false)
    setResults([])
  }

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => { if (results.length) setOpen(true) }}
        onKeyDown={e => {
          if (!open) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, results.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)) }
          else if (e.key === 'Enter' && hi >= 0) { e.preventDefault(); pick(results[hi]) }
          else if (e.key === 'Escape') setOpen(false)
        }}
        placeholder={placeholder}
        style={style}
        autoComplete="off"
      />
      {loading && (
        <div style={{ position: 'absolute', right: '12px', top: '11px', fontSize: '12px', color: '#bbb' }}>...</div>
      )}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px',
          marginTop: '4px', boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
          maxHeight: '260px', overflowY: 'auto',
        }}>
          {results.map((r, i) => (
            <div key={i}
              onMouseDown={e => { e.preventDefault(); pick(r) }}
              onMouseEnter={() => setHi(i)}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: '13px', color: '#1a1a1a',
                background: i === hi ? '#f5f4f0' : '#fff',
                borderBottom: i < results.length - 1 ? '1px solid #f0eee8' : 'none',
              }}>
              {r.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
