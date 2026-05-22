/**
 * Einheit-Code Generator
 * 
 * Format: STADT-STRASSE+HAUSNR-TYP+NR
 * Beispiele:
 *   WAL-WIE11-W01  = Wallenhorst, Wielandstr. 11, Wohnung 01
 *   OSN-BAH5-G01   = Osnabrück, Bahnhofstr. 5, Gewerbe 01
 *   BER-AMB3A-S01  = Berlin, Am Bach 3a, Stellplatz 01
 */

function normalizeUmlauts(str: string): string {
  return str
    .replace(/ä/g, 'ae').replace(/Ä/g, 'AE')
    .replace(/ö/g, 'oe').replace(/Ö/g, 'OE')
    .replace(/ü/g, 'ue').replace(/Ü/g, 'UE')
    .replace(/ß/g, 'ss')
}

function cityCode(city: string): string {
  if (!city) return 'XXX'
  return normalizeUmlauts(city.trim())
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X')
}

/**
 * Aus "Wielandstraße 11" oder "Am Bach 3a" → { street: "WIE", houseNum: "11" }
 */
function parseAddress(address: string): { street: string; houseNum: string } {
  if (!address) return { street: 'XXX', houseNum: '' }

  // Hausnummer am Ende extrahieren: optional Buchstabe (3a, 11b), oder Bereich (5-7)
  const match = address.trim().match(/^(.+?)\s+(\d+\s*[a-zA-Z]?(?:[-/]\d+\s*[a-zA-Z]?)?)\s*$/)
  
  let streetPart = address.trim()
  let houseNum = ''
  
  if (match) {
    streetPart = match[1].trim()
    houseNum = match[2].replace(/\s+/g, '').toUpperCase()
  }

  // Straßen-Kürzel aus dem LETZTEN Wort des Straßennamens
  const words = streetPart.split(/\s+/)
  const lastWord = words[words.length - 1] || streetPart

  // "straße/strasse/str./gasse/allee/platz/ring" am Ende entfernen
  // (Weg bleibt drin, weil sonst "Mittelweg" zu kurz wird)
  const streetClean = lastWord
    .replace(/strasse$/i, '')
    .replace(/straße$/i, '')
    .replace(/str\.?$/i, '')
    .replace(/gasse$/i, '')
    .replace(/allee$/i, '')
    .replace(/platz$/i, '')
    .replace(/ring$/i, '')

  const street = normalizeUmlauts(streetClean || lastWord)
    .replace(/[^A-Za-z]/g, '')
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X')

  return { street, houseNum }
}

function typeCode(type: string): string {
  const map: Record<string, string> = {
    wohnung: 'W',
    gewerbe: 'G',
    stellplatz: 'S',
    sonstige: 'X',
  }
  return map[type] || 'X'
}

export interface GenerateCodeParams {
  city: string
  address: string
  type: string
  existingCodes: string[]
}

/**
 * Generiert einen eindeutigen Code für eine neue Einheit.
 */
export function generateUnitCode(params: GenerateCodeParams): string {
  const city = cityCode(params.city)
  const { street, houseNum } = parseAddress(params.address)
  const tCode = typeCode(params.type)

  const streetPart = houseNum ? `${street}${houseNum}` : street
  const prefix = `${city}-${streetPart}-${tCode}`

  const usedNumbers = (params.existingCodes || [])
    .filter(c => c && c.startsWith(prefix))
    .map(c => {
      const tail = c.substring(prefix.length)
      const num = parseInt(tail.replace(/[^\d]/g, ''), 10)
      return isNaN(num) ? 0 : num
    })

  const nextNum = (usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0) + 1
  
  return `${prefix}${String(nextNum).padStart(2, '0')}`
}

/**
 * Prüft ob ein Code gültiges Format hat.
 */
export function isValidUnitCode(code: string): boolean {
  if (!code || code.length < 3 || code.length > 30) return false
  return /^[A-Z0-9\-.]+$/i.test(code)
}

/**
 * Falls Konflikt beim Speichern → Suffix anhängen.
 */
export function makeUniqueCode(baseCode: string, existingCodes: string[]): string {
  if (!existingCodes.includes(baseCode)) return baseCode
  let n = 2
  while (existingCodes.includes(`${baseCode}-${n}`)) n++
  return `${baseCode}-${n}`
}