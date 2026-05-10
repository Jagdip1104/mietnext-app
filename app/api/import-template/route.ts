import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  // Tab 1: Daten mit Beispielzeilen (alle 20 Spalten)
  const dataRows = [
    {
      'Objekt *': 'Mozartstraße 9',
      'Straße': 'Mozartstraße 9',
      'PLZ': '49401',
      'Stadt': 'Damme',
      'Baujahr': 1995,
      'Einheit *': 'Wohnung 1 OG',
      'Stockwerk': '1. OG',
      'Fläche m²': 60,
      'Zimmer': 2,
      'Typ': 'Wohnung',
      'Nutzungsart': 'Wohnen',
      'Stellplatz': 'Tiefgarage',
      'Kaltmiete €': 800,
      'Nebenkosten €': 150,
      'MwSt-pflichtig': 'nein',
      'MwSt %': 0,
      'Notizen': 'Renoviert 2022',
      'Mieter Name': 'Max Mustermann',
      'Mieter E-Mail': 'max@email.de',
      'Mieter Telefon': '0151 12345678'
    },
    {
      'Objekt *': 'Mozartstraße 9',
      'Straße': 'Mozartstraße 9',
      'PLZ': '49401',
      'Stadt': 'Damme',
      'Baujahr': 1995,
      'Einheit *': 'Wohnung 2 OG',
      'Stockwerk': '2. OG',
      'Fläche m²': 75,
      'Zimmer': 3,
      'Typ': 'Wohnung',
      'Nutzungsart': 'Wohnen',
      'Stellplatz': '',
      'Kaltmiete €': 950,
      'Nebenkosten €': 180,
      'MwSt-pflichtig': 'nein',
      'MwSt %': 0,
      'Notizen': '',
      'Mieter Name': '',
      'Mieter E-Mail': '',
      'Mieter Telefon': ''
    },
    {
      'Objekt *': 'Schillerweg 4',
      'Straße': 'Schillerweg 4',
      'PLZ': '49401',
      'Stadt': 'Damme',
      'Baujahr': 2010,
      'Einheit *': 'Ladenfläche EG',
      'Stockwerk': 'EG',
      'Fläche m²': 120,
      'Zimmer': '',
      'Typ': 'Gewerbe',
      'Nutzungsart': 'Einzelhandel',
      'Stellplatz': '',
      'Kaltmiete €': 1500,
      'Nebenkosten €': 300,
      'MwSt-pflichtig': 'ja',
      'MwSt %': 19,
      'Notizen': 'Schaufensterfront',
      'Mieter Name': 'Bäckerei Schmidt GmbH',
      'Mieter E-Mail': 'kontakt@baeckerei-schmidt.de',
      'Mieter Telefon': '05491 12345'
    }
  ]

  // Tab 2: Anleitung
  const instructionsData = [
    { Hinweis: 'MietNext Import-Vorlage – Anleitung' },
    { Hinweis: '' },
    { Hinweis: '═══ PFLICHTFELDER ═══' },
    { Hinweis: 'Nur "Objekt *" und "Einheit *" sind Pflicht – der Rest ist optional!' },
    { Hinweis: '' },
    { Hinweis: '═══ MEHRERE EINHEITEN PRO OBJEKT ═══' },
    { Hinweis: 'Für jede Einheit eine eigene Zeile mit dem gleichen Objekt-Namen.' },
    { Hinweis: 'Identische Objekt-Namen werden automatisch zusammengeführt.' },
    { Hinweis: '' },
    { Hinweis: '═══ MIETER ═══' },
    { Hinweis: 'Nur ausfüllen wenn die Einheit aktuell vermietet ist.' },
    { Hinweis: 'Pro Einheit aktuell nur 1 Mieter (WG nachträglich anpassen).' },
    { Hinweis: '' },
    { Hinweis: '═══ MwSt ═══' },
    { Hinweis: 'MwSt-pflichtig: "ja" für Gewerbe, "nein" oder leer für Wohnraum.' },
    { Hinweis: 'MwSt %: meistens 19 für Gewerbe, 0 oder leer für Wohnraum.' },
    { Hinweis: '' },
    { Hinweis: '═══ FORMATE ═══' },
    { Hinweis: 'Beträge in Euro ohne Währungssymbol (z.B. 800 statt 800 €).' },
    { Hinweis: 'Fläche und Zimmer als Zahl (z.B. 60 oder 60.5).' },
    { Hinweis: 'Stockwerk als Text (EG, 1. OG, 2. OG, DG, KG, ...).' },
    { Hinweis: '' },
    { Hinweis: '═══ LIMITS ═══' },
    { Hinweis: 'Maximal 500 Zeilen pro Upload.' },
    { Hinweis: 'Vor dem Import siehst du eine Vorschau und kannst alles prüfen.' },
    { Hinweis: '' },
    { Hinweis: 'Beispieldaten in Tab "Import-Daten" – einfach überschreiben!' }
  ]

  const wb = XLSX.utils.book_new()

  // Daten-Tab
  const wsData = XLSX.utils.json_to_sheet(dataRows)
  wsData['!cols'] = [
    { wch: 18 }, { wch: 22 }, { wch: 8 }, { wch: 14 }, { wch: 8 },
    { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    { wch: 8 }, { wch: 24 }, { wch: 22 }, { wch: 26 }, { wch: 16 }
  ]
  XLSX.utils.book_append_sheet(wb, wsData, 'Import-Daten')

  // Anleitung-Tab
  const wsInstructions = XLSX.utils.json_to_sheet(instructionsData)
  wsInstructions['!cols'] = [{ wch: 80 }]
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Anleitung')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="MietNext-Import-Vorlage.xlsx"'
    }
  })
}