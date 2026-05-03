'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('E-Mail oder Passwort falsch')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-100 rounded-xl p-8 w-full max-w-sm">
        <div className="text-lg font-medium text-gray-900 text-center mb-1">MietNext</div>
        <div className="text-sm text-gray-400 text-center mb-6">Professionelle Immobilienverwaltung</div>
        
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1 mb-3">
          <label className="text-sm text-gray-500">E-Mail-Adresse</label>
          <input type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jagdip@mietnext.de"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
        </div>

        <div className="flex flex-col gap-1 mb-4">
          <label className="text-sm text-gray-500">Passwort</label>
          <input type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
        </div>

        <button onClick={handleLogin} disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50">
          {loading ? 'Laden...' : 'Einloggen →'}
        </button>

        <div className="text-center text-sm text-gray-400 mt-4">
          <button onClick={() => router.push('/forgot-password')}
            className="text-blue-500 hover:underline">
            Passwort vergessen?
          </button>
        </div>
        <div className="text-center text-sm text-gray-400 mt-2">
          Noch kein Konto?{' '}
          <button onClick={() => router.push('/register')}
            className="text-blue-500 hover:underline">
            Jetzt registrieren
          </button>
        </div>
      </div>
    </main>
  )
}