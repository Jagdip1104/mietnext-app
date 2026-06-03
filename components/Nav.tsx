'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { planBadge } from '@/lib/theme'
import { Home, Building2, Wallet, Bell, MoreHorizontal, X, User } from 'lucide-react'

interface NavChild {
  label: string
  href: string
}

interface NavItem {
  label: string
  href?: string
  Icon: any
  children?: NavChild[]
}

const navStructure: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', Icon: Home },
  {
    label: 'Objekte',
    Icon: Building2,
    children: [
      { label: 'Objekte', href: '/properties' },
      { label: 'Einheiten', href: '/units' },
      { label: 'Mieter', href: '/tenants' },
      { label: 'Verträge', href: '/contracts' },
    ],
  },
  {
    label: 'Finanzen',
    Icon: Wallet,
    children: [
      { label: 'Zahlungen', href: '/payments' },
      { label: 'Kosten', href: '/kosten' },
      { label: 'GuV', href: '/guv' },
      { label: 'Nebenkosten', href: '/nebenkostenabrechnung' },
    ],
  },
  { label: 'Tickets', href: '/tickets', Icon: Bell },
  {
    label: 'Mehr',
    Icon: MoreHorizontal,
    children: [
      { label: 'Einladen', href: '/invite-tenant' },
      { label: 'Import', href: '/import' },
      { label: 'Mietvertrag (Beta)', href: '/mietvertrag' },
      { label: 'Assistent (Beta)', href: '/assistent' },
      { label: 'Profil', href: '/profile' },
    ],
  },
]

const planLabels: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  business: 'Business',
  enterprise: 'Enterprise',
}

export default function Nav() {
  const [email, setEmail] = useState<string>('')
  const [plan, setPlan] = useState<string>('free')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setEmail(session.user.email || '')
        const { data: profile } = await supabase
          .from('profiles').select('plan').eq('id', session.user.id).maybeSingle()
        if (profile?.plan) setPlan(profile.plan)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    if (openDropdown) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [openDropdown])

  const isActive = (href?: string) => {
    if (!href) return false
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname?.startsWith(href) ?? false
  }

  const isParentActive = (item: NavItem) => {
    if (item.href) return isActive(item.href)
    return item.children?.some(c => isActive(c.href)) ?? false
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* === Desktop Nav === */}
      <nav className="hidden md:block sticky top-0 z-40 bg-white border-b border-[#e8e6e0]">
        <div className="max-w-[1200px] mx-auto px-8 h-16 flex items-center justify-between gap-6">
          <Link href="/dashboard" className="text-lg font-semibold text-[#1a1a1a]" style={{ fontFamily: 'Georgia, serif' }}>
            MietNext
          </Link>

          <div ref={dropdownRef} className="flex items-center gap-1">
            {navStructure.map((item) => {
              const active = isParentActive(item)
              if (item.children) {
                return (
                  <div key={item.label} className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                      className={`flex items-center gap-1 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${active ? 'text-[#1a1a1a] bg-[#f5f4f0]' : 'text-[#666] hover:text-[#1a1a1a] hover:bg-[#fafaf8]'}`}
                    >
                      {item.label}<span className="text-[10px]">▾</span>
                    </button>
                    {openDropdown === item.label && (
                      <div className="absolute top-full left-0 mt-1 min-w-[180px] bg-white border border-[#e8e6e0] rounded-lg shadow-lg py-1 z-50">
                        {item.children.map(child => (
                          <Link
                            key={child.href} href={child.href}
                            onClick={() => setOpenDropdown(null)}
                            className={`block px-4 py-2 text-[13px] transition-colors ${isActive(child.href) ? 'text-[#1a1a1a] bg-[#f5f4f0] font-medium' : 'text-[#666] hover:bg-[#fafaf8]'}`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }
              return (
                <Link key={item.label} href={item.href!}
                  className={`px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${active ? 'text-[#1a1a1a] bg-[#f5f4f0]' : 'text-[#666] hover:text-[#1a1a1a] hover:bg-[#fafaf8]'}`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer" style={planBadge[plan] || planBadge.free}>
              {planLabels[plan] || plan}
            </Link>
            <span className="text-[12px] text-[#999] truncate max-w-[160px]">{email}</span>
            <button onClick={signOut} className="text-[12px] text-[#666] hover:text-[#1a1a1a] border border-[#e8e6e0] rounded-md px-3 py-1.5 transition-colors hover:border-[#1a1a1a]">
              Abmelden
            </button>
          </div>
        </div>
      </nav>

      {/* === Mobile Top Bar === */}
      <nav className="md:hidden sticky top-0 z-40 bg-white border-b border-[#e8e6e0] h-14 flex items-center justify-between px-4">
        <Link href="/dashboard" className="text-lg font-semibold text-[#1a1a1a]" style={{ fontFamily: 'Georgia, serif' }}>
          MietNext
        </Link>
        <div className="flex items-center gap-2.5">
          <Link href="/pricing" className="text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer" style={planBadge[plan] || planBadge.free}>
            {planLabels[plan] || plan}
          </Link>
          <Link href="/profile" aria-label="Profil" className="flex items-center justify-center w-8 h-8 rounded-full border border-[#e8e6e0] text-[#666] hover:text-[#1a1a1a] hover:border-[#1a1a1a] transition-colors">
            <User size={16} />
          </Link>
        </div>
      </nav>

      {/* === Mobile Bottom Nav === */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e8e6e0] flex items-stretch h-16">
        {navStructure.map(item => {
          const active = isParentActive(item)
          const Icon = item.Icon
          if (item.children) {
            return (
              <button key={item.label} onClick={() => setMobileOpen(item.label)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 ${active ? 'text-[#1a1a1a]' : 'text-[#999]'}`}
              >
                <Icon size={18} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            )
          }
          return (
            <Link key={item.label} href={item.href!}
              className={`flex-1 flex flex-col items-center justify-center gap-1 ${active ? 'text-[#1a1a1a]' : 'text-[#999]'}`}
            >
              <Icon size={18} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* === Mobile Bottom Sheet === */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end" onClick={() => setMobileOpen(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full bg-white rounded-t-2xl pb-10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <p className="text-[15px] font-medium text-[#1a1a1a]" style={{ fontFamily: 'Georgia, serif' }}>
                {mobileOpen}
              </p>
              <button onClick={() => setMobileOpen(null)} className="text-[#999]">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col py-2">
              {navStructure.find(i => i.label === mobileOpen)?.children?.map(child => (
                <Link key={child.href} href={child.href}
                  onClick={() => setMobileOpen(null)}
                  className={`px-5 py-3 text-[15px] transition-colors ${isActive(child.href) ? 'text-[#1a1a1a] bg-[#f5f4f0] font-medium' : 'text-[#666]'}`}
                >
                  {child.label}
                </Link>
              ))}
              {mobileOpen === 'Mehr' && (
                <>
                  <div className="px-5 py-2 text-[11px] text-[#bbb] uppercase tracking-wider">{email}</div>
                  <button onClick={signOut} className="px-5 py-3 text-[15px] text-[#dc2626] text-left">
                    Abmelden
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spacer für Mobile Bottom-Nav */}
      <div className="md:hidden h-16" />
    </>
  )
}
