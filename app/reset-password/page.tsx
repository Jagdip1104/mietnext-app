'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Supabase liest den Token automatisch aus der URL
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
  }, [])

  const handleReset = async () => {
    setError('')

    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    if (password !== passwordConfirm) {
      setError('Passwörter stimmen nicht überein.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/login'), 3000)
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-100 rounded-xl p-8 w-full max-w-sm text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Passwort geändert!</h2>
          <p className="text-sm text-gray-400">Du wirst automatisch zum Login weitergeleitet...</p>
        </div>
      </main>
    )
  }

  if (!ready) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-100 rounded-xl p-8 w-full max-w-sm text-center">
          <p className="text-sm text-gray-400">Link wird überprüft...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-100 rounded-xl p-8 w-full max-w-sm">
        <div className="text-lg font-medium text-gray-900 text-center mb-1">MietNext</div>
        <div className="text-sm text-gray-400 text-center mb-6">Neues Passwort setzen</div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 mb-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Neues Passwort</label>
            <input value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" type="password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Passwort bestätigen</label>
            <input value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
              placeholder="••••••••" type="password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
        </div>

        <button onClick={handleReset} disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50">
          {loading ? 'Speichern...' : 'Passwort speichern →'}
        </button>
      </div>
    </main>
  )
}