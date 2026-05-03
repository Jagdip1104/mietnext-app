'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

export default function Profile() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setEmail(session.user.email || '')

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (data) {
        setFullName(data.full_name || '')
        setPhone(data.phone || '')
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setLoading(true)
    setSuccess('')
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('profiles').upsert({
      id: session?.user.id,
      full_name: fullName,
      phone,
      email,
    })

    setLoading(false)
    setSuccess('Profil erfolgreich gespeichert!')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handlePasswordChange = async () => {
    setError('')
    setSuccess('')

    if (newPassword.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    if (newPassword !== passwordConfirm) {
      setError('Passwörter stimmen nicht überein.')
      return
    }

    setLoadingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Passwort erfolgreich geändert!')
      setNewPassword('')
      setPasswordConfirm('')
      setTimeout(() => setSuccess(''), 3000)
    }
    setLoadingPassword(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-2xl mx-auto px-8 py-10">
        <h1 className="text-2xl font-medium text-gray-900 mb-1">Profil</h1>
        <p className="text-sm text-gray-400 mb-8">Deine persönlichen Einstellungen</p>

        {success && (
          <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg mb-6">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Persönliche Daten */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Persönliche Daten</h2>
          <div className="flex flex-col gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">E-Mail-Adresse</label>
              <input value={email} disabled
                className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
              <p className="text-xs text-gray-400 mt-1">E-Mail kann nicht geändert werden</p>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Vollständiger Name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Vor- und Nachname"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Telefon</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+49 123 456789"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
            </div>
          </div>
          <button onClick={handleSave} disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-40">
            {loading ? 'Speichern...' : 'Änderungen speichern'}
          </button>
        </div>

        {/* Passwort ändern */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Passwort ändern</h2>
          <div className="flex flex-col gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Neues Passwort</label>
              <input value={newPassword} onChange={e => setNewPassword(e.target.value)}
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
          <button onClick={handlePasswordChange} disabled={loadingPassword}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-40">
            {loadingPassword ? 'Speichern...' : 'Passwort ändern'}
          </button>
        </div>

        {/* Abmelden */}
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-2">Account</h2>
          <p className="text-xs text-gray-400 mb-4">Abmelden von MietNext auf diesem Gerät</p>
          <button onClick={handleLogout}
            className="border border-red-200 text-red-500 px-4 py-2 rounded-lg text-sm hover:bg-red-50">
            Abmelden
          </button>
        </div>
      </div>
    </main>
  )
}