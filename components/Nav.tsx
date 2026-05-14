'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const PLAN_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  free:       { bg: '#f0ede6', text: '#666',    label: 'Free'       },
  starter:    { bg: '#dbeafe', text: '#1e40af', label: 'Starter'    },
  business:   { bg: '#dcfce7', text: '#166534', label: 'Business'   },
  enterprise: { bg: '#ede9fe', text: '#5b21b6', label: 'Enterprise' },
}

export default function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const [plan, setPlan] = useState<string>('free')
  const [email, setEmail] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setEmail(session.user.email || '')
      const { data: profile } = await supabase
        .from('profiles').select('plan').eq('id', session.user.id).single()
      setPlan(profile?.plan || 'free')
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const links = [
    { href: '/dashboard',             label: 'Dashboard'   },
    { href: '/properties',            label: 'Objekte'     },
    { href: '/units',                 label: 'Einheiten'   },
    { href: '/tenants',               label: 'Mieter'      },
    { href: '/contracts',             label: 'Verträge'    },
    { href: '/payments',              label: 'Zahlungen'   },
    { href: '/kosten',                label: 'Kosten'      },
    { href: '/guv',                   label: 'GuV'         },
    { href: '/nebenkostenabrechnung', label: 'Nebenkosten' },
    { href: '/tickets',               label: 'Tickets'     },
    { href: '/invite-tenant',         label: 'Einladen'    },
    { href: '/import',                label: 'Import'      },
  ]

  const planStyle = PLAN_COLORS[plan] || PLAN_COLORS.free

  return (
    <nav style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e8e6e0',
      padding: '0 32px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div style={{
          fontSize: '16px', fontWeight: '600',
          color: '#1a1a1a', letterSpacing: '-0.5px',
          fontFamily: 'Georgia, serif', padding: '16px 0',
          cursor: 'pointer',
        }} onClick={() => router.push('/dashboard')}>
          MietNext
        </div>
        <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' as const }}>
          {links.map(link => (
            <button key={link.href} onClick={() => router.push(link.href)}
              style={{
                padding: '6px 10px',
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

        {/* Plan-Badge mit Upgrade-Hint */}
        <button onClick={() => router.push('/pricing')}
          style={{
            padding: '5px 12px',
            fontSize: '11px',
            fontWeight: '500',
            backgroundColor: planStyle.bg,
            color: planStyle.text,
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            letterSpacing: '0.3px',
          }}>
          {plan === 'free' ? '⬆ Upgrade' : planStyle.label}
        </button>

        {/* User Email */}
        <span style={{
          fontSize: '12px',
          color: '#888',
          maxWidth: '160px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap' as const,
        }}>
          {email}
        </span>

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