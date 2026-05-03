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
    { href: '/invite-tenant', label: 'Einladen' },
  ]

  return (
    <nav style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e8e6e0',
      padding: '0 48px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
        <div style={{
          fontSize: '16px', fontWeight: '600',
          color: '#1a1a1a', letterSpacing: '-0.5px',
          fontFamily: 'Georgia, serif', padding: '16px 0',
          cursor: 'pointer',
        }} onClick={() => router.push('/dashboard')}>
          MietNext
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {links.map(link => (
            <button key={link.href} onClick={() => router.push(link.href)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: pathname === link.href ? '500' : '400',
                color: pathname === link.href ? '#1a1a1a' : '#888',
                backgroundColor: pathname === link.href ? '#f0ede6' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
              {link.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={() => router.push('/profile')}
          style={{
            padding: '6px 12px', fontSize: '13px',
            color: pathname === '/profile' ? '#1a1a1a' : '#888',
            backgroundColor: pathname === '/profile' ? '#f0ede6' : 'transparent',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
          }}>
          Profil
        </button>
        <button onClick={handleLogout}
          style={{
            padding: '6px 12px', fontSize: '13px',
            color: '#888', backgroundColor: 'transparent',
            border: '1px solid #e8e6e0', borderRadius: '6px', cursor: 'pointer',
          }}>
          Abmelden
        </button>
      </div>
    </nav>
  )
}