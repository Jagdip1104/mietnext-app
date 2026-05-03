'use client'

import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Nav() {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/properties', label: 'Objekte' },
    { href: '/units', label: 'Einheiten' },
    { href: '/tenants', label: 'Mieter' },
    { href: '/contracts', label: 'Verträge' },
    { href: '/payments', label: 'Zahlungen' },
    { href: '/tickets', label: 'Tickets' },
  ]

  return (
    <nav className="bg-white border-b border-gray-100 px-8 py-0 flex justify-between items-center">
      <div className="flex items-center gap-8">
        <div className="text-lg font-medium text-gray-900 py-4">MietNext</div>
        <div className="flex gap-1">
          {links.map(link => (
            <button key={link.href} onClick={() => router.push(link.href)}
              className={`px-3 py-4 text-sm border-b-2 transition-colors ${
                pathname === link.href
                  ? 'border-blue-500 text-blue-600 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {link.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/profile')}
          className={`text-sm ${pathname === '/profile' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
          Profil
        </button>
        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-gray-600">
          Abmelden
        </button>
      </div>
    </nav>
  )
}