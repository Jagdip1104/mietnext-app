'use client'

import Link from 'next/link'
import Nav from '@/components/Nav'

export default function ImpressumPage() {
  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '64px 32px' }}>

        <h1 style={{ fontSize: '36px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>
          Impressum
        </h1>
        <p style={{ fontSize: '14px', color: '#999', margin: '0 0 48px' }}>
          Angaben gemäß § 5 TMG
        </p>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 12px' }}>Anbieter</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Jagdip Singh<br />
            Wielandstraße 11<br />
            49134 Wallenhorst<br />
            Deutschland
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 12px' }}>Kontakt</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            E-Mail: <a href="mailto:kontakt@mietnext.de" style={{ color: '#2563eb' }}>kontakt@mietnext.de</a>
          </p>
        </section>

        <section style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#fff8e1', borderRadius: '8px', border: '1px solid #ffe082' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 8px' }}>⚠️ Hinweis zur Plattform</h2>
          <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.7', margin: 0 }}>
            MietNext befindet sich aktuell in der Entwicklungsphase. Sämtliche Zahlungsvorgänge erfolgen ausschließlich
            im Stripe Test-Modus. Eine offizielle Gewerbeanmeldung sowie die Erteilung einer Umsatzsteuer-Identifikationsnummer
            erfolgen vor der Live-Schaltung kostenpflichtiger Funktionen.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 12px' }}>Verantwortlich für den Inhalt</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Jagdip Singh (Anschrift wie oben)
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 12px' }}>EU-Streitschlichtung</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: '0 0 12px' }}>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
            <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
              https://ec.europa.eu/consumers/odr/
            </a>
          </p>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 12px' }}>Haftung für Inhalte</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen
            Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet,
            übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen,
            die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung
            von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 12px' }}>Haftung für Links</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben.
            Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten
            Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 12px' }}>Urheberrecht</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
            Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
            Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
          </p>
        </section>

        <div style={{ marginTop: '64px', paddingTop: '24px', borderTop: '1px solid #e8e6e0' }}>
          <Link href="/datenschutz" style={{ fontSize: '14px', color: '#2563eb', textDecoration: 'none' }}>
            → Datenschutzerklärung
          </Link>
        </div>

      </div>
    </main>
  )
}