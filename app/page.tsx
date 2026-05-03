'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      router.push('/reset-password' + window.location.hash)
    }
  }, [])

  return (
    <main style={{ fontFamily: "'Georgia', serif", backgroundColor: '#fafaf8', minHeight: '100vh' }}>

      {/* Navigation */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 48px', borderBottom: '1px solid #e8e6e0',
        backgroundColor: '#fafaf8', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ fontSize: '18px', fontWeight: '600', letterSpacing: '-0.5px', color: '#1a1a1a' }}>
          MietNext
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="/login" style={{
            fontSize: '14px', color: '#666', textDecoration: 'none',
            padding: '8px 16px', borderRadius: '8px',
          }}>
            Einloggen
          </a>
          <a href="/register" style={{
            fontSize: '14px', backgroundColor: '#1a1a1a', color: '#fff',
            padding: '10px 20px', borderRadius: '8px', textDecoration: 'none',
            fontFamily: 'system-ui, sans-serif',
          }}>
            Kostenlos starten →
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: '960px', margin: '0 auto', padding: '80px 48px 60px' }}>
        <div style={{
          display: 'inline-block', fontSize: '12px', fontFamily: 'system-ui, sans-serif',
          color: '#666', border: '1px solid #ddd', borderRadius: '20px',
          padding: '4px 14px', marginBottom: '32px', letterSpacing: '0.5px',
        }}>
          Jetzt in Deutschland verfügbar
        </div>

        <h1 style={{
          fontSize: '56px', fontWeight: '400', lineHeight: '1.1',
          color: '#1a1a1a', marginBottom: '24px', letterSpacing: '-1.5px',
          maxWidth: '720px',
        }}>
          Immobilienverwaltung,<br />
          <em style={{ fontStyle: 'italic', color: '#888' }}>die endlich einfach ist</em>
        </h1>

        <p style={{
          fontSize: '18px', color: '#666', lineHeight: '1.7',
          maxWidth: '520px', marginBottom: '40px',
          fontFamily: 'system-ui, sans-serif',
        }}>
          Verwalte all deine Objekte, Mieter und Finanzen an einem Ort.
          Jeder Mieter bekommt sein eigenes Portal.
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <a href="/register" style={{
            backgroundColor: '#1a1a1a', color: '#fff', padding: '14px 28px',
            borderRadius: '10px', textDecoration: 'none', fontSize: '15px',
            fontFamily: 'system-ui, sans-serif',
          }}>
            Kostenlos starten – 0 €
          </a>
          <a href="/login" style={{
            backgroundColor: '#fff', color: '#444', padding: '14px 28px',
            borderRadius: '10px', textDecoration: 'none', fontSize: '15px',
            border: '1px solid #ddd', fontFamily: 'system-ui, sans-serif',
          }}>
            Einloggen
          </a>
        </div>
      </section>

      {/* Features */}
      <section style={{
        maxWidth: '960px', margin: '0 auto', padding: '40px 48px 80px',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px',
          backgroundColor: '#e8e6e0', borderRadius: '16px', overflow: 'hidden',
        }}>
          {[
            { icon: '🏢', title: 'Objekte & Einheiten', desc: 'Verwalte Wohnungen, Gewerbeeinheiten und Stellplätze an einem Ort.' },
            { icon: '👥', title: 'Mieterverwaltung', desc: 'Alle Mieter mit Kontaktdaten, Verträgen und Kommunikationsverlauf.' },
            { icon: '💶', title: 'Zahlungen tracken', desc: 'Behalte den Überblick über Einnahmen, offene und überfällige Mieten.' },
            { icon: '🔧', title: 'Ticketsystem', desc: 'Schäden und Wartungsanfragen einfach erfassen und verfolgen.' },
            { icon: '📄', title: 'Mietverträge', desc: 'Verträge digital anlegen, verwalten und jederzeit abrufen.' },
            { icon: '📊', title: 'Live Dashboard', desc: 'Alle wichtigen Kennzahlen auf einen Blick – Auslastung, Einnahmen, Tickets.' },
          ].map((f, i) => (
            <div key={i} style={{
              backgroundColor: '#fafaf8', padding: '32px 28px',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '14px' }}>{f.icon}</div>
              <h3 style={{
                fontSize: '15px', fontWeight: '600', color: '#1a1a1a',
                marginBottom: '8px', fontFamily: 'system-ui, sans-serif',
              }}>
                {f.title}
              </h3>
              <p style={{
                fontSize: '14px', color: '#888', lineHeight: '1.6',
                fontFamily: 'system-ui, sans-serif',
              }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Zwei Portale */}
      <section style={{
        backgroundColor: '#1a1a1a', padding: '80px 48px',
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '36px', fontWeight: '400', color: '#fff',
            marginBottom: '48px', letterSpacing: '-1px',
          }}>
            Zwei Portale, eine Plattform
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={{
              backgroundColor: '#242424', borderRadius: '16px', padding: '36px',
              border: '1px solid #333',
            }}>
              <div style={{
                fontSize: '11px', letterSpacing: '2px', color: '#888',
                marginBottom: '16px', fontFamily: 'system-ui, sans-serif',
                textTransform: 'uppercase',
              }}>
                Vermieter-Portal
              </div>
              <h3 style={{ fontSize: '22px', color: '#fff', fontWeight: '400', marginBottom: '16px' }}>
                Alles unter Kontrolle
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {['Alle Objekte & Einheiten', 'Mieter & Verträge', 'Zahlungen & Finanzen', 'Tickets & Wartung', 'Dashboard & Berichte'].map(item => (
                  <li key={item} style={{
                    fontSize: '14px', color: '#aaa', padding: '8px 0',
                    borderBottom: '1px solid #333', fontFamily: 'system-ui, sans-serif',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <span style={{ color: '#4ade80' }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{
              backgroundColor: '#242424', borderRadius: '16px', padding: '36px',
              border: '1px solid #333',
            }}>
              <div style={{
                fontSize: '11px', letterSpacing: '2px', color: '#888',
                marginBottom: '16px', fontFamily: 'system-ui, sans-serif',
                textTransform: 'uppercase',
              }}>
                Mieter-Portal
              </div>
              <h3 style={{ fontSize: '22px', color: '#fff', fontWeight: '400', marginBottom: '16px' }}>
                Eigener Zugang
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {['Eigene Wohnungsinfos', 'Dokumente abrufen', 'Schäden melden', 'Ticket-Status verfolgen', 'Direkter Kontakt'].map(item => (
                  <li key={item} style={{
                    fontSize: '14px', color: '#aaa', padding: '8px 0',
                    borderBottom: '1px solid #333', fontFamily: 'system-ui, sans-serif',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <span style={{ color: '#60a5fa' }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Preise */}
      <section style={{ maxWidth: '960px', margin: '0 auto', padding: '80px 48px' }}>
        <h2 style={{
          fontSize: '36px', fontWeight: '400', color: '#1a1a1a',
          marginBottom: '8px', letterSpacing: '-1px',
        }}>
          Einfache Preise
        </h2>
        <p style={{
          fontSize: '16px', color: '#888', marginBottom: '48px',
          fontFamily: 'system-ui, sans-serif',
        }}>
          Starte kostenlos – upgrade wenn du bereit bist.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[
            { name: 'Free', price: '0 €', period: '/Monat', features: ['Bis zu 3 Einheiten', '1 Vermieter-Account', 'Dashboard & Übersicht', 'Ticketsystem'], cta: 'Kostenlos starten', highlight: false },
            { name: 'Pro', price: '19 €', period: '/Monat', features: ['Unbegrenzte Einheiten', 'Mieter-Portal', 'Zahlungsverfolgung', 'Prioritäts-Support'], cta: 'Pro starten', highlight: true },
            { name: 'Business', price: '49 €', period: '/Monat', features: ['Alles aus Pro', 'Mehrere Verwalter', 'API-Zugang', 'Individuelle Berichte'], cta: 'Business starten', highlight: false },
          ].map(plan => (
            <div key={plan.name} style={{
              borderRadius: '16px', padding: '32px',
              backgroundColor: plan.highlight ? '#1a1a1a' : '#fff',
              border: plan.highlight ? 'none' : '1px solid #e8e6e0',
            }}>
              <div style={{
                fontSize: '12px', fontFamily: 'system-ui, sans-serif',
                color: plan.highlight ? '#aaa' : '#888',
                letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px',
              }}>
                {plan.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '24px' }}>
                <span style={{ fontSize: '36px', fontWeight: '400', color: plan.highlight ? '#fff' : '#1a1a1a' }}>
                  {plan.price}
                </span>
                <span style={{ fontSize: '14px', color: plan.highlight ? '#aaa' : '#888', fontFamily: 'system-ui, sans-serif' }}>
                  {plan.period}
                </span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px' }}>
                {plan.features.map(f => (
                  <li key={f} style={{
                    fontSize: '14px', color: plan.highlight ? '#ccc' : '#666',
                    padding: '6px 0', fontFamily: 'system-ui, sans-serif',
                    display: 'flex', gap: '8px',
                  }}>
                    <span style={{ color: plan.highlight ? '#4ade80' : '#22c55e' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="/register" style={{
                display: 'block', textAlign: 'center',
                backgroundColor: plan.highlight ? '#fff' : '#1a1a1a',
                color: plan.highlight ? '#1a1a1a' : '#fff',
                padding: '12px', borderRadius: '8px', textDecoration: 'none',
                fontSize: '14px', fontFamily: 'system-ui, sans-serif',
              }}>
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        backgroundColor: '#f0ede6', padding: '80px 48px', textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: '40px', fontWeight: '400', color: '#1a1a1a',
          marginBottom: '16px', letterSpacing: '-1px',
        }}>
          Bereit loszulegen?
        </h2>
        <p style={{
          fontSize: '16px', color: '#888', marginBottom: '32px',
          fontFamily: 'system-ui, sans-serif',
        }}>
          Kostenlos registrieren – keine Kreditkarte erforderlich.
        </p>
        <a href="/register" style={{
          backgroundColor: '#1a1a1a', color: '#fff', padding: '16px 36px',
          borderRadius: '10px', textDecoration: 'none', fontSize: '16px',
          fontFamily: 'system-ui, sans-serif',
        }}>
          Jetzt kostenlos starten →
        </a>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #e8e6e0', padding: '32px 48px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#fafaf8',
      }}>
        <div style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: '600' }}>MietNext</div>
        <div style={{ fontSize: '13px', color: '#aaa', fontFamily: 'system-ui, sans-serif' }}>
          © 2026 MietNext · DSGVO-konform · Hosted in Frankfurt 🇩🇪
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          {['Impressum', 'Datenschutz', 'Kontakt'].map(link => (
            <a key={link} href="#" style={{
              fontSize: '13px', color: '#aaa', textDecoration: 'none',
              fontFamily: 'system-ui, sans-serif',
            }}>
              {link}
            </a>
          ))}
        </div>
      </footer>

    </main>
  )
}