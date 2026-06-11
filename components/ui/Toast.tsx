'use client'

import { createContext, useCallback, useContext, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; type: ToastType; message: string }

const ToastContext = createContext<{
  success: (msg: string) => void
  error: (msg: string) => void
  info: (msg: string) => void
}>({ success: () => {}, error: () => {}, info: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 1

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback((type: ToastType, message: string) => {
    const id = nextId++
    setToasts(prev => [...prev.slice(-3), { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, type === 'error' ? 5000 : 3500)
  }, [])

  const api = {
    success: (m: string) => push('success', m),
    error:   (m: string) => push('error', m),
    info:    (m: string) => push('info', m),
  }

  const colors: Record<ToastType, { dot: string; border: string }> = {
    success: { dot: '#16a34a', border: '#bbf7d0' },
    error:   { dot: '#dc2626', border: '#fecaca' },
    info:    { dot: '#1a1a1a', border: '#e8e6e0' },
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <style>{`
        @keyframes mn-toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .mn-toast-stack { position: fixed; right: 16px; bottom: 88px; z-index: 9999;
          display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
        @media (min-width: 768px) { .mn-toast-stack { bottom: 24px; right: 24px; } }
      `}</style>
      <div className="mn-toast-stack">
        {toasts.map(t => (
          <div key={t.id}
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            style={{
              pointerEvents: 'auto', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '10px',
              backgroundColor: '#fff', border: '1px solid ' + colors[t.type].border,
              borderRadius: '10px', padding: '12px 16px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              maxWidth: '340px', fontSize: '13.5px', color: '#1a1a1a',
              animation: 'mn-toast-in 0.18s ease-out',
            }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors[t.type].dot, flexShrink: 0 }} />
            <span style={{ lineHeight: 1.4 }}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
