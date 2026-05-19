'use client'

import Link from 'next/link'
import Nav from '@/components/Nav'

export default function AGBPage() {
  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '64px 32px' }}>

        <h1 style={{ fontSize: '36px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>
          Allgemeine Geschäftsbedingungen
        </h1>
        <p style={{ fontSize: '14px', color: '#999', margin: '0 0 48px' }}>
          Stand: Mai 2026
        </p>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>§ 1 Geltungsbereich</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung der Software-as-a-Service-Plattform
            MietNext (im Folgenden &quot;Dienst&quot;), bereitgestellt durch Jagdip Singh, Wielandstraße 11, 49134 Wallenhorst
            (im Folgenden &quot;Anbieter&quot;).
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>§ 2 Vertragsgegenstand</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: '0 0 12px' }}>
            Der Anbieter stellt dem Nutzer eine webbasierte Anwendung zur Verwaltung von Immobilien, Mietern,
            Mietverträgen und Zahlungen zur Verfügung. Der genaue Funktionsumfang ergibt sich aus dem gewählten Tarif.
          </p>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Der Dienst richtet sich ausschließlich an Vermieter und Hausverwalter. Eine Nutzung durch Verbraucher
            im Sinne des § 13 BGB ist ausgeschlossen.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>§ 3 Vertragsschluss</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Der Vertrag kommt durch die Registrierung des Nutzers und die Bestätigung dieser AGB sowie der
            Datenschutzerklärung zustande. Mit der Bestätigung erklärt sich der Nutzer mit diesen AGB einverstanden.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>§ 4 Leistungen und Verfügbarkeit</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: '0 0 12px' }}>
            Der Anbieter stellt den Dienst mit einer durchschnittlichen Verfügbarkeit von 99% im Jahresmittel bereit.
            Ausgenommen sind geplante Wartungsarbeiten, höhere Gewalt und Ausfälle externer Dienstleister
            (Hosting, Datenbank, Zahlungsanbieter).
          </p>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Der Anbieter behält sich vor, den Funktionsumfang weiterzuentwickeln und einzelne Funktionen zu ändern,
            soweit dies dem Nutzer zumutbar ist.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>§ 5 Preise und Zahlungsbedingungen</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: '0 0 12px' }}>
            Die jeweils gültigen Preise ergeben sich aus der Preisübersicht auf <Link href="/pricing" style={{ color: '#2563eb' }}>mietnext.de/pricing</Link>.
            Alle Preise verstehen sich in Euro inklusive gesetzlicher Mehrwertsteuer.
          </p>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: '0 0 12px' }}>
            Die Abrechnung kostenpflichtiger Tarife erfolgt monatlich im Voraus über den Zahlungsdienstleister Stripe.
            Bei Zahlungsverzug behält sich der Anbieter vor, den Zugang zum Dienst zu sperren.
          </p>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Der Anbieter ist berechtigt, die Preise mit einer Frist von 30 Tagen anzupassen. Im Falle einer Preiserhöhung
            steht dem Nutzer ein außerordentliches Kündigungsrecht zu.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>§ 6 Laufzeit und Kündigung</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: '0 0 12px' }}>
            Der Vertrag wird auf unbestimmte Zeit geschlossen und kann monatlich mit einer Frist von 14 Tagen zum
            Monatsende von beiden Seiten gekündigt werden.
          </p>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Die Kündigung kann
            über die Account-Einstellungen oder per E-Mail an kontakt@mietnext.de erfolgen.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>§ 7 Pflichten des Nutzers</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: '0 0 12px' }}>
            Der Nutzer ist verpflichtet, seine Zugangsdaten geheim zu halten und sicher aufzubewahren.
            Bei Verdacht auf Missbrauch ist der Anbieter unverzüglich zu informieren.
          </p>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Der Nutzer ist verantwortlich für die Richtigkeit der von ihm eingegebenen Daten sowie für die Einhaltung
            datenschutzrechtlicher Bestimmungen bei der Verarbeitung von Mieterdaten.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>§ 8 Datenschutz und Auftragsverarbeitung</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Der Anbieter verarbeitet personenbezogene Daten ausschließlich gemäß der <Link href="/datenschutz" style={{ color: '#2563eb' }}>Datenschutzerklärung</Link>.
            Soweit der Nutzer Daten Dritter (z.B. Mieter) in den Dienst einträgt, handelt der Anbieter als
            Auftragsverarbeiter im Sinne des Art. 28 DSGVO. Auf Anfrage stellt der Anbieter einen entsprechenden
            Auftragsverarbeitungsvertrag (AV-Vertrag) bereit.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>§ 9 Haftung</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: '0 0 12px' }}>
            Der Anbieter haftet uneingeschränkt für Schäden aus Vorsatz und grober Fahrlässigkeit sowie für Schäden
            aus der Verletzung des Lebens, des Körpers oder der Gesundheit.
          </p>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: '0 0 12px' }}>
            Bei leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher Vertragspflichten und
            beschränkt auf den vertragstypischen, vorhersehbaren Schaden.
          </p>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Eine Haftung für entgangenen Gewinn, mittelbare Schäden, Datenverluste oder Folgeschäden ist
            ausgeschlossen, soweit gesetzlich zulässig.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>§ 10 Datensicherung</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Der Anbieter führt regelmäßige Datensicherungen durch. Eine Wiederherstellung kann jedoch nur im Rahmen
            der technischen Möglichkeiten erfolgen. Der Nutzer ist gehalten, geschäftskritische Daten zusätzlich
            selbstständig zu sichern (z.B. über die Export-Funktion).
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 16px' }}>§ 11 Schlussbestimmungen</h2>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: '0 0 12px' }}>
            Es gilt ausschließlich deutsches Recht unter Ausschluss des UN-Kaufrechts.
          </p>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: '0 0 12px' }}>
            Gerichtsstand ist Osnabrück, soweit der Nutzer Kaufmann, juristische Person des öffentlichen Rechts
            oder öffentlich-rechtliches Sondervermögen ist.
          </p>
          <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0 }}>
            Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen
            Bestimmungen unberührt.
          </p>
        </section>

        <div style={{ marginTop: '64px', paddingTop: '24px', borderTop: '1px solid #e8e6e0' }}>
          <Link href="/impressum" style={{ fontSize: '14px', color: '#2563eb', textDecoration: 'none', marginRight: '24px' }}>
            → Impressum
          </Link>
          <Link href="/datenschutz" style={{ fontSize: '14px', color: '#2563eb', textDecoration: 'none' }}>
            → Datenschutzerklärung
          </Link>
        </div>

      </div>
    </main>
  )
}