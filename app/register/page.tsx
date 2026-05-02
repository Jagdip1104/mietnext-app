'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleRegister = async () => {
    setError('')

    if (!fullName || !email || !password) {
      setError('Bitte alle Pflichtfelder ausfüllen.')
      return
    }

    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }

    if (password !== passwordConfirm) {
      setError('Passwörter stimmen nicht überein.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
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
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Registrierung erfolgreich!</h2>
          <p className="text-sm text-gray-400 mb-6">
            Bitte bestätige deine E-Mail-Adresse – wir haben dir eine E-Mail an <strong>{email}</strong> geschickt.
          </p>
          <button onClick={() => router.push('/login')}
            className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm hover:bg-blue-600">
            Zum Login →
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-100 rounded-xl p-8 w-full max-w-sm">
        <div className="text-lg font-medium text-gray-900 text-center mb-1">MietNext</div>
        <div className="text-sm text-gray-400 text-center mb-6">Kostenlosen Account erstellen</div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 mb-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Vollständiger Name *</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="Jagdip Singh"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">E-Mail-Adresse *</label>
            <input value={email} onChange={e => setEmail(e.target.value)}
              placeholder="name@email.de" type="email"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Passwort * (min. 8 Zeichen)</label>
            <input value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" type="password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Passwort bestätigen *</label>
            <input value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
              placeholder="••••••••" type="password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
        </div>

        <button onClick={handleRegister} disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 mb-4">
          {loading ? 'Registrieren...' : 'Kostenlos registrieren →'}
        </button>

        <div className="text-center text-sm text-gray-400">
          Bereits ein Konto?{' '}
          <button onClick={() => router.push('/login')}
            className="text-blue-500 hover:underline">
            Einloggen
          </button>
        </div>
      </div>
    </main>
  )
}