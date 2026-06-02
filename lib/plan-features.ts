// MietNext Plan-Features — Single Source of Truth für Landing UND Pricing.
// NUR hier pflegen, damit beide Seiten nie auseinanderlaufen.
// v: true = enthalten, false = nicht enthalten, 'soon' = kommt bald.

export const PLANS = [
  {
    id: 'free', name: 'Free', price: 0, priceId: null, einheiten: '3 Einheiten', cta: 'Kostenlos starten', highlight: false,
    features: [
      { t: 'Objekte, Mieter, Verträge', v: true },
      { t: 'Zahlungsübersicht', v: true },
      { t: 'Tickets', v: true },
      { t: 'PDF Export', v: false },
      { t: 'NK-Abrechnung', v: false },
      { t: 'GuV + Kosten', v: false },
      { t: 'Excel-Import', v: false },
      { t: 'Bankkonto', v: false },
    ],
  },
  {
    id: 'starter', name: 'Starter', price: 19, priceId: 'price_1TWjBLC2lxIY4GthiRV6tYo3', einheiten: '15 Einheiten', cta: 'Starter wählen', highlight: true,
    features: [
      { t: 'Alles aus Free', v: true },
      { t: 'PDF Export', v: true },
      { t: 'NK-Abrechnung', v: true },
      { t: 'GuV + Kosten', v: true },
      { t: 'Excel-Import', v: true },
      { t: 'E-Mail Support', v: true },
      { t: 'Bankkonto', v: 'soon' },
      { t: 'KI-Ausweis-Scan', v: false },
    ],
  },
  {
    id: 'business', name: 'Business', price: 49, priceId: 'price_1TWjDVC2lxIY4GthvtN0Jdxu', einheiten: '50 Einheiten', cta: 'Business wählen', highlight: false,
    features: [
      { t: 'Alles aus Starter', v: true },
      { t: 'KI-Ausweis-Scan', v: true },
      { t: 'Prioritäts-Support', v: true },
      { t: 'Früher Zugang zu neuen Features', v: true },
      { t: 'Bankkonto', v: 'soon' },
    ],
  },
  {
    id: 'enterprise', name: 'Enterprise', price: 199, priceId: 'price_1TWjDqC2lxIY4GthwMqCklKB', einheiten: 'Unbegrenzte Einheiten', cta: 'Enterprise wählen', highlight: false,
    features: [
      { t: 'Alles aus Business', v: true },
      { t: 'Dedicated Support', v: true },
      { t: 'Onboarding-Call', v: true },
      { t: 'SLA Garantie', v: true },
      { t: 'Bankkonto-Anbindung', v: 'soon' },
    ],
  },
]
