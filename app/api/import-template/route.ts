import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  // Tab 1: Daten mit Beispielzeilen
  const dataRows = [
    {
      'Objekt *': 'Mozartstraße 9',
      'Adresse': 'Mozartstraße 9, 49401 Damme',
      'Baujahr': 1995,
      'Einheit *': 'Wohnung 1 OG',
      'Fläche m²': 60,
      'Zimmer': 2,
      'Kaltmiete €': 800,
      'Nebenkosten €': 150,
      'MwSt %': 0,
      'Mieter Name': 'Max Mustermann',
      'Mieter E-Mail': 'max@email.de',
      'Mieter Telefon': '0151 12345678'
    },
    {
      'Objekt *': 'Mozartstraße 9',
      'Adresse': 'Mozartstraße 9, 49401 Damme',
      'Baujahr': 1995,
      'Einheit *': 'Wohnung 2 OG',
      'Fläche m²': 75,
      'Zimmer': 3,
      'Kaltmiete €': 950,
      'Nebenkosten €': 180,
      'MwSt %': 0,
      'Mieter Name': '',
      'Mieter E-Mail': '',
      'Mieter Telefon': ''
    },
    {
      'Objekt *': 'Schillerweg 4',
      'Adresse': 'Schillerweg 4, 49401 Damme',
      'Baujahr': 2010,
      'Einheit *': 'Wohnung A',
      'Fläche m²': 50,
      'Zimmer': 2,
      'Kaltmiete €': 700,
      'Nebenkosten €': 130,
      'MwSt %': 0,
      'Mieter Name': 'Anna Schmidt',
      'Mieter E-Mail': 'anna@email.de',
      'Mieter Telefon': ''
    }
  ]

  // Tab 2: Anleitung
  const instructionsData = [
    { Hinweis: 'MietNext Import-Vorlage – Anleitung' },
    { Hinweis: '' },
    { Hinweis: '1. Pflichtfelder sind mit * markiert (Objekt, Einheit)' },
    { Hinweis: '2. Identische Objekt-Namen werden zusammengeführt – das Objekt wird nur einmal angelegt' },
    { Hinweis: '3. Mehrere Einheiten zum gleichen Objekt = einfach mehrere Zeilen mit gleichem Objekt-Namen' },
    { Hinweis: '4. Mieter-Felder sind optional – leer lassen wenn keine Vermietung' },
    { Hinweis: '5. Beträge in Euro ohne Währungssymbol (z.B. 800 statt 800 €)' },
    { Hinweis: '6. MwSt %: 0 für Wohnraum, 19 für Gewerbe' },
    { Hinweis: '7. Maximal 500 Zeilen pro Upload' },
    { Hinweis: '' },
    { Hinweis: 'Vor dem Import siehst du eine Vorschau und kannst alles prüfen.' },
    { Hinweis: 'Du kannst den Import 24h lang rückgängig machen.' },
    { Hinweis: '' },
    { Hinweis: 'Beispieldaten in Tab "Import-Daten" – einfach überschreiben!' }
  ]

  const wb = XLSX.utils.book_new()

  const wsData = XLSX.utils.json_to_sheet(dataRows)
  wsData['!cols'] = [
    { wch: 18 }, { wch: 30 }, { wch: 8 }, { wch: 18 }, { wch: 10 },
    { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 18 },
    { wch: 22 }, { wch: 16 }
  ]
  XLSX.utils.book_append_sheet(wb, wsData, 'Import-Daten')

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