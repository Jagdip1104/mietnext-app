'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Prüfe ob ein Reset-Token in der URL ist
    if (window.location.hash.includes('type=recovery')) {
      router.push('/reset-password' + window.location.hash)
    }
  }, [])

  return (
    <main className="min-h-screen bg-white">
      <nav className="flex justify-between items-center px-8 py-4 border-b border-gray-100">
        <div className="text-lg font-medium text-gray-900">MietNext</div>
        <div className="flex gap-4 items-center">
          <a href="/login" className="text-sm text-gray-500 hover:text-gray-900">Einloggen</a>
          <a href="/register" className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
            Kostenlos starten →
          </a>
        </div>
      </nav>

      <div className="text-center px-8 py-20">
        <div className="inline-block bg-blue-50 text-blue-600 text-xs px-3 py-1 rounded-full mb-6">
          Jetzt in Deutschland verfügbar
        </div>
        <h1 className="text-4xl font-medium text-gray-900 mb-4 max-w-xl mx-auto leading-tight">
          Immobilienverwaltung die endlich einfach ist
        </h1>
        <p className="text-gray-500 text-base max-w-md mx-auto mb-8 leading-relaxed">
          Verwalte alle deine Objekte, Mieter und Finanzen an einem Ort.
          Deine Mieter erhalten ihr eigenes Portal.
        </p>
        <div className="flex gap-3 justify-center">
          <a href="/register" className="bg-blue-500 text-white px-6 py-3 rounded-lg text-sm hover:bg-blue-600">
            Kostenlos starten – 0 € →
          </a>
          <a href="#demo" className="border border-gray-200 text-gray-600 px-6 py-3 rounded-lg text-sm hover:bg-gray-50">
            Demo ansehen
          </a>
        </div>
      </div>
    </main>
  )
}