'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleReset = async () => {
    if (!email) {
      setError('Bitte E-Mail-Adresse eingeben.')
      return
    }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://mietnext.de/reset-password',
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-100 rounded-xl p-8 w-full max-w-sm text-center">
          <div className="text-4xl mb-4">📧</div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">E-Mail gesendet!</h2>
          <p className="text-sm text-gray-400 mb-6">
            Wir haben dir einen Link zum Zurücksetzen deines Passworts an <strong>{email}</strong> geschickt.
          </p>
          <button onClick={() => router.push('/login')}
            className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm hover:bg-blue-600">
            Zurück zum Login
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-100 rounded-xl p-8 w-full max-w-sm">
        <div className="text-lg font-medium text-gray-900 text-center mb-1">MietNext</div>
        <div className="text-sm text-gray-400 text-center mb-6">Passwort zurücksetzen</div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1 block">E-Mail-Adresse</label>
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="name@email.de" type="email"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
        </div>

        <button onClick={handleReset} disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 mb-4">
          {loading ? 'Senden...' : 'Reset-Link senden →'}
        </button>

        <div className="text-center text-sm text-gray-400">
          <button onClick={() => router.push('/login')}
            className="text-blue-500 hover:underline">
            Zurück zum Login
          </button>
        </div>
      </div>
    </main>
  )
}