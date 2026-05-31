// Zentrale Kategorie-Definitionen (Single Source of Truth)
// genutzt von /kosten (Eingabe) und der Nebenkostenabrechnung (Verteilung).

export const DISTRIBUTION_KEYS = [
  { value: 'sqm',      label: 'Nach Wohnfläche m²'                          },
  { value: 'equal',    label: 'Gleichmäßig pro Einheit'                     },
  { value: 'persons',  label: 'Nach Personenzahl'                           },
  { value: 'per_unit', label: 'Einzelbeträge je Einheit (z.B. Ista/Techem)' },
]

// Die 17 §2-BetrKV-Töpfe (NK-Output) inkl. Default-Umlageschlüssel
export const BETRKV_CATEGORIES = [
  { value: 'grundsteuer',        label: '§2 Nr.1  – Grundsteuer',                            defaultKey: 'sqm'      },
  { value: 'wasser',             label: '§2 Nr.2  – Wasserversorgung',                        defaultKey: 'persons'  },
  { value: 'entwasserung',       label: '§2 Nr.3  – Entwässerung / Abwasser',                 defaultKey: 'persons'  },
  { value: 'heizung',            label: '§2 Nr.4  – Heizkosten (Ista/Techem)',                defaultKey: 'per_unit' },
  { value: 'warmwasser',         label: '§2 Nr.5  – Warmwasser (Ista/Techem)',                defaultKey: 'per_unit' },
  { value: 'heizung_warmwasser', label: '§2 Nr.6  – Heizung + Warmwasser (verbunden)',        defaultKey: 'per_unit' },
  { value: 'aufzug',             label: '§2 Nr.7  – Aufzug',                                  defaultKey: 'sqm'      },
  { value: 'strassenreinigung',  label: '§2 Nr.8  – Straßenreinigung / Müllbeseitigung',      defaultKey: 'persons'  },
  { value: 'gebaeudereinigung',  label: '§2 Nr.9  – Gebäudereinigung / Ungezieferbekämpfung', defaultKey: 'sqm'      },
  { value: 'gartenpflege',       label: '§2 Nr.10 – Gartenpflege',                            defaultKey: 'sqm'      },
  { value: 'allgemeinstrom',     label: '§2 Nr.11 – Allgemeinstrom / Beleuchtung',             defaultKey: 'sqm'      },
  { value: 'schornstein',        label: '§2 Nr.12 – Schornsteinreinigung',                    defaultKey: 'sqm'      },
  { value: 'versicherung',       label: '§2 Nr.13 – Sach- und Haftpflichtversicherung',       defaultKey: 'sqm'      },
  { value: 'hauswart',           label: '§2 Nr.14 – Hauswart / Hausmeister',                  defaultKey: 'sqm'      },
  { value: 'antenne',            label: '§2 Nr.15 – Gemeinschaftsantenne / Kabel / Internet', defaultKey: 'equal'    },
  { value: 'waeschepflege',      label: '§2 Nr.16 – Wäschepflege-Einrichtungen',              defaultKey: 'equal'    },
  { value: 'sonstige',           label: '§2 Nr.17 – Sonstige Betriebskosten',                 defaultKey: 'sqm'      },
]

// Eingabe-Kategorien (/kosten): granular, mit umlagefaehig + Verknüpfung zum §2-Topf
export const COST_CATEGORIES = [
  // ── Umlagefähig (§2 BetrKV) ──
  { value: 'grundsteuer',        label: 'Grundsteuer',                               umlagefaehig: true,  betrkv: 'grundsteuer'        },
  { value: 'wasser',             label: 'Wasserversorgung',                          umlagefaehig: true,  betrkv: 'wasser'             },
  { value: 'abwasser',           label: 'Entwässerung / Abwasser',                   umlagefaehig: true,  betrkv: 'entwasserung'       },
  { value: 'heizung',            label: 'Heizkosten',                                umlagefaehig: true,  betrkv: 'heizung'            },
  { value: 'warmwasser',         label: 'Warmwasserversorgung',                      umlagefaehig: true,  betrkv: 'warmwasser'         },
  { value: 'heizung_warmwasser', label: 'Heizung + Warmwasser (verbunden)',          umlagefaehig: true,  betrkv: 'heizung_warmwasser' },
  { value: 'aufzug',             label: 'Aufzug (Betrieb + Wartung)',                umlagefaehig: true,  betrkv: 'aufzug'             },
  { value: 'strassenreinigung',  label: 'Straßenreinigung + Winterdienst',           umlagefaehig: true,  betrkv: 'strassenreinigung'  },
  { value: 'muell',              label: 'Müllbeseitigung',                           umlagefaehig: true,  betrkv: 'strassenreinigung'  },
  { value: 'gebaeudereinigung',  label: 'Gebäudereinigung',                          umlagefaehig: true,  betrkv: 'gebaeudereinigung'  },
  { value: 'ungeziefer',         label: 'Ungezieferbekämpfung (laufend)',            umlagefaehig: true,  betrkv: 'gebaeudereinigung'  },
  { value: 'gartenpflege',       label: 'Gartenpflege',                              umlagefaehig: true,  betrkv: 'gartenpflege'       },
  { value: 'allgemeinstrom',     label: 'Allgemeinstrom / Gemeinschaftsbeleuchtung', umlagefaehig: true,  betrkv: 'allgemeinstrom'     },
  { value: 'schornstein',        label: 'Schornsteinreinigung',                      umlagefaehig: true,  betrkv: 'schornstein'        },
  { value: 'versicherung_uml',   label: 'Gebäude- & Haftpflichtversicherung',        umlagefaehig: true,  betrkv: 'versicherung'       },
  { value: 'hauswart_uml',       label: 'Hausmeister (umlagefähige Tätigkeiten)',    umlagefaehig: true,  betrkv: 'hauswart'           },
  { value: 'antenne',            label: 'Gemeinschaftsantenne / SAT',                umlagefaehig: true,  betrkv: 'antenne'            },
  { value: 'waeschepflege',      label: 'Wäschepflege-Einrichtungen',                umlagefaehig: true,  betrkv: 'waeschepflege'      },
  { value: 'rauchmelder',        label: 'Rauchwarnmelder (Wartung / Miete)',         umlagefaehig: true,  betrkv: 'sonstige'           },
  { value: 'co2_umlage',         label: 'CO₂-Kostenanteil Mieter (ab 2023)',         umlagefaehig: true,  betrkv: 'sonstige'           },
  { value: 'dachrinne',          label: 'Dachrinnenreinigung',                       umlagefaehig: true,  betrkv: 'sonstige'           },
  { value: 'pool_sauna',         label: 'Pool / Sauna / Gemeinschaftsanlage',        umlagefaehig: true,  betrkv: 'sonstige'           },
  { value: 'sonstige_uml',       label: 'Sonstige Betriebskosten §2 Nr.17 …',        umlagefaehig: true,  betrkv: 'sonstige'           },
  // ── Nicht umlagefähig ──
  { value: 'instandhaltung',     label: 'Instandhaltung / Reparaturen',              umlagefaehig: false, betrkv: null },
  { value: 'modernisierung',     label: 'Modernisierung / Sanierung',                umlagefaehig: false, betrkv: null },
  { value: 'hausverwaltung',     label: 'Hausverwaltungsgebühren',                   umlagefaehig: false, betrkv: null },
  { value: 'steuerberatung',     label: 'Steuerberatung / Buchhaltung',              umlagefaehig: false, betrkv: null },
  { value: 'rechtskosten',       label: 'Rechtskosten / Anwalt',                     umlagefaehig: false, betrkv: null },
  { value: 'versicherung_nicht', label: 'Mietausfall- / Rechtsschutzversicherung',   umlagefaehig: false, betrkv: null },
  { value: 'kredit',             label: 'Kreditzinsen / Finanzierung',               umlagefaehig: false, betrkv: null },
  { value: 'weg_ruecklagen',     label: 'WEG-Rücklagen',                             umlagefaehig: false, betrkv: null },
  { value: 'neuvermietung',      label: 'Neuvermietung / Makler / Inserate',         umlagefaehig: false, betrkv: null },
  { value: 'leerstand',          label: 'Leerstandskosten',                          umlagefaehig: false, betrkv: null },
  { value: 'anschaffung',        label: 'Anschaffungen (Geräte, Ausstattung)',       umlagefaehig: false, betrkv: null },
  { value: 'hauswart_nicht',     label: 'Hausmeister (Verwaltungstätigkeiten)',      umlagefaehig: false, betrkv: null },
  { value: 'bankgebuehren',      label: 'Bankgebühren / Kontoführung',               umlagefaehig: false, betrkv: null },
  { value: 'sonstige_nicht',     label: 'Sonstige nicht umlagefähige Kosten …',      umlagefaehig: false, betrkv: null },
]

// Abwärtskompatibel: /kosten nutzt EXPENSE_CATEGORIES weiter
export const EXPENSE_CATEGORIES = COST_CATEGORIES

// Abgeleitetes Mapping Eingabe-Kategorie -> §2-Topf (kein Handsync mehr)
export const EXPENSE_TO_BETRKV: Record<string, string> = COST_CATEGORIES.reduce(
  (acc, c) => { if (c.betrkv) acc[c.value] = c.betrkv; return acc },
  {} as Record<string, string>
)

// Helfer
export const umlagefaehigeCategories = () => COST_CATEGORIES.filter((c) => c.umlagefaehig)
export const betrkvFor = (catValue: string) =>
  COST_CATEGORIES.find((c) => c.value === catValue)?.betrkv ?? 'sonstige'
export const defaultKeyFor = (bucketValue: string) =>
  BETRKV_CATEGORIES.find((b) => b.value === bucketValue)?.defaultKey ?? 'sqm'
