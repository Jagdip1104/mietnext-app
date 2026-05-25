'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash

    if (hash.includes('type=recovery')) {
      router.push('/reset-password' + hash)
      return
    }

    if (hash.includes('access_token')) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event: string, session: any) => {
          if (event === 'SIGNED_IN' && session) {
            subscription.unsubscribe()
            const { data: tenantUser } = await supabase
              .from('tenant_users').select('id')
              .eq('user_id', session.user.id).single()
            if (tenantUser) {
              router.push('/tenant-portal')
            } else {
              router.push('/dashboard')
            }
          }
        }
      )
    }
  }, [])

  return (
    <main style={{ fontFamily: "'Georgia', serif", backgroundColor: '#fafaf8', minHeight: '100vh', overflowX: 'hidden' }}>
      <nav className="flex justify-between items-center gap-3 px-5 py-4 md:px-12 md:py-5 border-b border-[#e8e6e0] bg-[#fafaf8] sticky top-0 z-[100]">
        <div style={{ fontSize: '18px', fontWeight: '600', letterSpacing: '-0.5px', color: '#1a1a1a' }}>MietNext</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="/login" style={{ fontSize: '14px', color: '#666', textDecoration: 'none', padding: '8px 16px', borderRadius: '8px' }}>Einloggen</a>
          <a href="/register" className="shrink-0 whitespace-nowrap" style={{ fontSize: '14px', backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 16px', borderRadius: '8px', textDecoration: 'none', fontFamily: 'system-ui, sans-serif' }}><span className="hidden sm:inline">Kostenlos </span>Starten →</a>
        </div>
      </nav>

      <section className="max-w-[960px] mx-auto px-5 pt-12 pb-10 md:px-12 md:pt-20 md:pb-15">
        <div style={{ display: 'inline-block', fontSize: '12px', fontFamily: 'system-ui, sans-serif', color: '#666', border: '1px solid #ddd', borderRadius: '20px', padding: '4px 14px', marginBottom: '32px', letterSpacing: '0.5px' }}>
          Jetzt in Deutschland verfügbar
        </div>
        <h1 style={{ fontWeight: '400', lineHeight: '1.1', color: '#1a1a1a', marginBottom: '20px', letterSpacing: '-1px', maxWidth: '720px', fontSize: 'clamp(32px, 9vw, 56px)' }}>
          Immobilienverwaltung,<br />
          <em style={{ fontStyle: 'italic', color: '#888' }}>die endlich einfach ist</em>
        </h1>
        <p style={{ color: '#666', lineHeight: '1.6', maxWidth: '520px', marginBottom: '28px', fontFamily: 'system-ui, sans-serif', fontSize: 'clamp(15px, 4vw, 18px)' }}>
          Verwalte all deine Objekte, Mieter und Finanzen an einem Ort. Jeder Mieter bekommt sein eigenes Portal.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="/register" style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '14px 28px', borderRadius: '10px', textDecoration: 'none', fontSize: '15px', fontFamily: 'system-ui, sans-serif' }}>Kostenlos starten – 0 €</a>
          <a href="/login" style={{ backgroundColor: '#fff', color: '#444', padding: '14px 28px', borderRadius: '10px', textDecoration: 'none', fontSize: '15px', border: '1px solid #ddd', fontFamily: 'system-ui, sans-serif' }}>Einloggen</a>
        </div>
      </section>

      <section className="max-w-[960px] mx-auto px-5 pt-10 pb-16 md:px-12 md:pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-px bg-[#e8e6e0] rounded-2xl overflow-hidden">
          {[
            { icon: '🏢', title: 'Objekte & Einheiten', desc: 'Verwalte Wohnungen, Gewerbeeinheiten und Stellplätze an einem Ort.' },
            { icon: '👥', title: 'Mieterverwaltung', desc: 'Alle Mieter mit Kontaktdaten, Verträgen und Kommunikationsverlauf.' },
            { icon: '💶', title: 'Zahlungen tracken', desc: 'Behalte den Überblick über Einnahmen, offene und überfällige Mieten.' },
            { icon: '🔧', title: 'Ticketsystem', desc: 'Schäden und Wartungsanfragen einfach erfassen und verfolgen.' },
            { icon: '📄', title: 'Mietverträge', desc: 'Verträge digital anlegen, verwalten und jederzeit abrufen.' },
            { icon: '📊', title: 'Live Dashboard', desc: 'Alle wichtigen Kennzahlen auf einen Blick – Auslastung, Einnahmen, Tickets.' },
          ].map((f, i) => (
            <div key={i} style={{ backgroundColor: '#fafaf8', padding: '32px 28px' }}>
              <div style={{ fontSize: '28px', marginBottom: '14px' }}>{f.icon}</div>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', marginBottom: '8px', fontFamily: 'system-ui, sans-serif' }}>{f.title}</h3>
              <p style={{ fontSize: '14px', color: '#888', lineHeight: '1.6', fontFamily: 'system-ui, sans-serif' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#1a1a1a] px-5 py-16 md:px-12 md:py-20">
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <h2 style={{ fontWeight: '400', color: '#fff', marginBottom: '36px', letterSpacing: '-1px', fontSize: 'clamp(28px, 7vw, 36px)' }}>Zwei Portale, eine Plattform</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {[
              { tag: 'Vermieter-Portal', title: 'Alles unter Kontrolle', items: ['Alle Objekte & Einheiten', 'Mieter & Verträge', 'Zahlungen & Finanzen', 'Tickets & Wartung', 'Dashboard & Berichte'], color: '#4ade80' },
              { tag: 'Mieter-Portal', title: 'Eigener Zugang', items: ['Eigene Wohnungsinfos', 'Dokumente abrufen', 'Schäden melden', 'Ticket-Status verfolgen', 'Direkter Kontakt'], color: '#60a5fa' },
            ].map(p => (
              <div key={p.tag} className="p-6 md:p-9" style={{ backgroundColor: '#242424', borderRadius: '16px', border: '1px solid #333' }}>
                <div style={{ fontSize: '11px', letterSpacing: '2px', color: '#888', marginBottom: '16px', fontFamily: 'system-ui, sans-serif', textTransform: 'uppercase' }}>{p.tag}</div>
                <h3 style={{ fontSize: '22px', color: '#fff', fontWeight: '400', marginBottom: '16px' }}>{p.title}</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {p.items.map(item => (
                    <li key={item} style={{ fontSize: '14px', color: '#aaa', padding: '8px 0', borderBottom: '1px solid #333', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: p.color }}>✓</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-[960px] mx-auto px-5 py-16 md:px-12 md:py-20">
        <h2 style={{ fontWeight: '400', color: '#1a1a1a', marginBottom: '8px', letterSpacing: '-1px', fontSize: 'clamp(28px, 7vw, 36px)' }}>Einfache Preise</h2>
        <p style={{ fontSize: '16px', color: '#888', marginBottom: '48px', fontFamily: 'system-ui, sans-serif' }}>Starte kostenlos – upgrade wenn du bereit bist.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Free', price: '0 €', features: ['Bis zu 3 Einheiten', '1 Vermieter-Account', 'Dashboard & Übersicht', 'Ticketsystem'], cta: 'Kostenlos starten', highlight: false },
            { name: 'Pro', price: '19 €', features: ['Unbegrenzte Einheiten', 'Mieter-Portal', 'Zahlungsverfolgung', 'Prioritäts-Support'], cta: 'Pro starten', highlight: true },
            { name: 'Business', price: '49 €', features: ['Alles aus Pro', 'Mehrere Verwalter', 'API-Zugang', 'Individuelle Berichte'], cta: 'Business starten', highlight: false },
          ].map(plan => (
            <div key={plan.name} className="p-6 md:p-8" style={{ borderRadius: '16px', backgroundColor: plan.highlight ? '#1a1a1a' : '#fff', border: plan.highlight ? 'none' : '1px solid #e8e6e0' }}>
              <div style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', color: plan.highlight ? '#aaa' : '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '24px' }}>
                <span style={{ fontSize: '36px', fontWeight: '400', color: plan.highlight ? '#fff' : '#1a1a1a' }}>{plan.price}</span>
                <span style={{ fontSize: '14px', color: plan.highlight ? '#aaa' : '#888', fontFamily: 'system-ui, sans-serif' }}>/Monat</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px' }}>
                {plan.features.map(f => (
                  <li key={f} style={{ fontSize: '14px', color: plan.highlight ? '#ccc' : '#666', padding: '6px 0', fontFamily: 'system-ui, sans-serif', display: 'flex', gap: '8px' }}>
                    <span style={{ color: plan.highlight ? '#4ade80' : '#22c55e' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="/register" style={{ display: 'block', textAlign: 'center', backgroundColor: plan.highlight ? '#fff' : '#1a1a1a', color: plan.highlight ? '#1a1a1a' : '#fff', padding: '12px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontFamily: 'system-ui, sans-serif' }}>
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#f0ede6] px-5 py-16 md:px-12 md:py-20 text-center">
        <h2 style={{ fontWeight: '400', color: '#1a1a1a', marginBottom: '16px', letterSpacing: '-1px', fontSize: 'clamp(30px, 8vw, 40px)' }}>Bereit loszulegen?</h2>
        <p style={{ fontSize: '16px', color: '#888', marginBottom: '32px', fontFamily: 'system-ui, sans-serif' }}>Kostenlos registrieren – keine Kreditkarte erforderlich.</p>
        <a href="/register" style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '16px 36px', borderRadius: '10px', textDecoration: 'none', fontSize: '16px', fontFamily: 'system-ui, sans-serif' }}>
          Jetzt kostenlos starten →
        </a>
      </section>

      <footer className="border-t border-[#e8e6e0] px-5 py-6 md:px-12 md:py-8 flex flex-col gap-3 text-center md:flex-row md:gap-4 md:justify-between md:items-center md:text-left bg-[#fafaf8]">
        <div style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: '600' }}>MietNext</div>
        <div style={{ fontSize: '13px', color: '#aaa', fontFamily: 'system-ui, sans-serif' }}>© 2026 MietNext · DSGVO-konform · Hosted in Frankfurt 🇩🇪</div>
        <div style={{ display: 'flex', gap: '20px' }}>
          {['Impressum', 'Datenschutz', 'Kontakt'].map(link => (
            <a key={link} href="#" style={{ fontSize: '13px', color: '#aaa', textDecoration: 'none', fontFamily: 'system-ui, sans-serif' }}>{link}</a>
          ))}
        </div>
      </footer>
    </main>
  )
}