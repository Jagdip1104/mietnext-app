'use client'

import Link from 'next/link'
import Nav from '@/components/Nav'

export default function DatenschutzPage() {
  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '64px 32px' }}>

        <h1 style={{ fontSize: '36px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>
          Datenschutzerklärung
        </h1>
        <p style={{ fontSize: '14px', color: '#999', margin: '0 0 48px' }}>
          Stand: November 2026
        </p>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>1. Verantwortlicher</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Verantwortlicher im Sinne der DSGVO ist:<br /><br />
            Jagdip Singh<br />
            Wielandstraße 11<br />
            49134 Wallenhorst<br />
            E-Mail: <a href="mailto:kontakt@mietnext.de" style={{ color: '#2563eb' }}>kontakt@mietnext.de</a>
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>2. Erhebung und Verarbeitung personenbezogener Daten</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: '0 0 16px' }}>
            Bei der Nutzung von MietNext werden folgende Daten erhoben und verarbeitet:
          </p>
          <ul style={{ fontSize: '15px', color: '#333', lineHeight: '1.8', margin: 0, paddingLeft: '24px' }}>
            <li>E-Mail-Adresse (zur Registrierung und Authentifizierung)</li>
            <li>Name (optional, zur Personalisierung)</li>
            <li>Daten zu Immobilien, Mietern, Verträgen und Zahlungen, die Sie selbst eingeben</li>
            <li>IP-Adresse und technische Browserinformationen (Server-Logs)</li>
            <li>Bei kostenpflichtigen Plänen: Zahlungsdaten (verarbeitet durch Stripe)</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>3. Zweck der Datenverarbeitung</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Die erhobenen Daten werden verwendet, um Ihnen die Funktionen der Plattform bereitzustellen
            (Verwaltung von Immobilien, Mietern, Zahlungen und Tickets), Ihren Account zu sichern, sowie zur
            Abwicklung kostenpflichtiger Abonnements. Eine Weitergabe an Dritte erfolgt ausschließlich an die
            unten genannten Auftragsverarbeiter.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>4. Rechtsgrundlage</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Erfüllung des Nutzungsvertrags)
            sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren Betrieb der Plattform).
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>5. Eingesetzte Dienstleister</h2>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 8px' }}>Hosting – Vercel Inc.</h3>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.7', margin: 0 }}>
              440 N Barranca Avenue #4133, Covina, CA 91723, USA. Vercel hostet die Anwendung in europäischen Regionen
              (Frankfurt). Datenschutz: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>vercel.com/legal/privacy-policy</a>
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 8px' }}>Datenbank – Supabase</h3>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.7', margin: 0 }}>
              Supabase Inc., 970 Toa Payoh North #07-04, Singapore. Die Datenbank wird in Frankfurt (EU) gehostet.
              Datenschutz: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>supabase.com/privacy</a>
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 8px' }}>Zahlungsabwicklung – Stripe</h3>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.7', margin: 0 }}>
              Stripe Payments Europe Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irland. Stripe
              verarbeitet Kreditkarten- und Zahlungsdaten DSGVO-konform. Aktuell befindet sich die Plattform im
              Test-Modus, es werden keine echten Zahlungen verarbeitet.
              Datenschutz: <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>stripe.com/de/privacy</a>
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 8px' }}>E-Mail-Versand – Resend</h3>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.7', margin: 0 }}>
              Resend (Coachella Inc.), 2261 Market Street #4036, San Francisco, CA 94114, USA. Resend versendet
              transaktionale E-Mails (z.B. Einladungen, Passwort-Reset).
              Datenschutz: <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>resend.com/legal/privacy-policy</a>
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>6. Cookies</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            MietNext verwendet ausschließlich technisch notwendige Cookies (Session-Cookies für die Authentifizierung).
            Es werden keine Tracking- oder Analyse-Cookies gesetzt.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>7. Speicherdauer</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Ihre Daten werden gespeichert, solange Ihr Account besteht. Bestimmte Daten (insbesondere Rechnungs-
            und Zahlungsbelege) werden gemäß den gesetzlichen Aufbewahrungsfristen (§ 147 AO – 10 Jahre) aufbewahrt.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>8. Ihre Rechte (DSGVO)</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: '0 0 12px' }}>
            Sie haben jederzeit das Recht auf:
          </p>
          <ul style={{ fontSize: '15px', color: '#333', lineHeight: '1.8', margin: 0, paddingLeft: '24px' }}>
            <li>Auskunft über die Sie betreffenden personenbezogenen Daten (Art. 15 DSGVO)</li>
            <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
            <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
            <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
            <li>Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
          </ul>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: '12px 0 0' }}>
            Zur Ausübung Ihrer Rechte wenden Sie sich bitte an:{' '}
            <a href="mailto:kontakt@mietnext.de" style={{ color: '#2563eb' }}>kontakt@mietnext.de</a>
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>9. SSL-Verschlüsselung</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Diese Website nutzt aus Sicherheitsgründen eine SSL-Verschlüsselung. Sie erkennen eine verschlüsselte
            Verbindung daran, dass die Adresszeile des Browsers von „http://" auf „https://" wechselt.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>10. Änderungen dieser Erklärung</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen
            Anforderungen entspricht oder um Änderungen unserer Leistungen umzusetzen.
          </p>
        </section>

        <div style={{ marginTop: '64px', paddingTop: '24px', borderTop: '1px solid #e8e6e0' }}>
          <Link href="/impressum" style={{ fontSize: '14px', color: '#2563eb', textDecoration: 'none' }}>
            → Impressum
          </Link>
        </div>

      </div>
    </main>
  )
}