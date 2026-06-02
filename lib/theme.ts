// MietNext Design-Palette — Single Source of Truth für Farben.
// Eine Palette für die ganze App: neutrale Basis + EIN grüner Akzent.
// Rot/Amber NUR funktional (Gefahr/Warnung), nie als Deko.

export const colors = {
  text: '#1a1a1a',
  textSecondary: '#666666',
  textMuted: '#999999',
  textHint: '#bbbbbb',
  border: '#e8e6e0',
  surface: '#fafaf8',
  white: '#ffffff',

  accent: '#16a34a',
  accentText: '#15803d',
  accentLight: '#f0fdf4',
  accentBorder: '#bbf7d0',

  danger: '#dc2626',
  dangerLight: '#fef2f2',
  dangerBorder: '#fecaca',
  warning: '#d97706',
  warningLight: '#fffbeb',
  warningBorder: '#fed7aa',

  // NUR in Diagrammen verwenden (kategoriale Daten):
  chart: { wohnung: '#16a34a', gewerbe: '#8b5cf6', lager: '#d97706' },
} as const

// Plan-Stufen: Gewicht statt Farbe (leer -> hell -> grün -> schwarz)
export const planBadge: Record<string, any> = {
  free:       { background: '#f1efe8', color: '#666666' },
  starter:    { background: '#1a1a1a', color: '#ffffff' },
  business:   { background: '#1a1a1a', color: '#ffffff' },
  enterprise: { background: '#1a1a1a', color: '#ffffff' },
}
