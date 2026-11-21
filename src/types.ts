// Datenmodell RESCUE GE – entspricht data/dataset.json (erzeugt durch tools/build_dataset.py)

export type Status =
  | 'Geprüft' | 'Teilweise geprüft' | 'GE-Gültigkeit noch zu prüfen'
  | 'Unvollständige Quelle' | 'Widersprüchliche Quellen' | 'Veraltet'

export interface SourceRef {
  sourceId: string            // verweist auf Source.id
  printedPage: number | null  // aufgedruckte Seitenzahl
  pdfPage?: number | null     // PDF-Seite (abgeleitet aus der Seitenfolge, s. pdfPageDerived)
  pdfPageDerived?: boolean
  note?: string
}

export interface Source {
  id: string; title: string; document: string; version: string; date: string
  issuer: string; scope: string; kind: string; sha256: string; priority: number
}

export interface GE { level: string | null; star: boolean; mark: string; rowText?: string }

/** Ein Maßnahmen-/Medikamentenkasten mit Kompetenzzeilen aus einem BPR */
export interface Competence {
  label?: string; line: number; page: number | null
  box: string[]; rows: string[]; footnotes: string[]; geFootnotes: string[]
  ge: GE | null; noGE?: boolean
}

export interface Saa {
  id: string; kind: 'saa'; title: string; category: string
  sections: { heading: string; items: string[] }[]
  ge: GE | null; competenceRows: string[]; footnotes: string[]; rawText: string
  status: Status; issues: string[]; source: SourceRef; synonyms: string[]; isFlowchart: boolean
}

export interface Medication {
  id: string; kind: 'medication'; name: string; wirkstoff: string; handelsnamen: string[]
  konzentration: string[]; gruppe: string | null; indikationen: string[]; keineAnwendung: string[]
  altersbegrenzung: string[]; nutzenRisiko: string[]; primaereMassnahmen: string[]
  dosierungHinweis: string | null; dosierung: string[]; uaw: string[]; ueberdosierung: string[]; besonderheiten: string[]
  geCompetence: Competence[]; status: Status; issues: string[]; rawText: string
  source: SourceRef; synonyms: string[]; hasSAA: boolean
}

export interface Concentration { label: string; mgPerMl: number }

export interface CalcRule {
  id: string; med: string; label: string; population: string; route: string
  dosePerKg?: number; unit?: 'mg' | 'µg' | 'ml' | 'g'
  maxDose?: number | null; maxDosePerKg?: number; maxDoseLabel?: string
  minWeight?: number; minWeightExclusive?: number; maxWeight?: number
  aboveMaxWeight?: { fixedDose: number; text: string }
  conflictWeightRange?: [number, number]
  weightLabel?: string; resultLabel?: string
  concentrations?: Concentration[]   // mgPerMl bedeutet "Einheit pro ml" (bei µg: µg/ml)
  dilutionNote?: string; notes?: string[]; warnings?: string[]
  quotes: string[]; pages: number[]; competenceLine: number; competencePage: number | null; competenceBox: string[]
  ge: GE | null; locked?: boolean; lockReason?: string; status: Status
}

export interface Topic {
  id: string; kind: 'topic'; title: string; category: string; pages: number[]
  pageTexts: { printedPage: number; text: string }[]
  measures: Competence[]; status: Status; statusNote: string; issues: string[]
  source: SourceRef; synonyms: string[]
}

export interface LocalInfo {
  id: string; kind: 'local'; title: string; category: string; text: string
  status: Status; source: SourceRef; synonyms: string[]
}

export interface Hospital {
  id: string; name: string; city: string; address: string; phone: string | null; phoneEmergency: string | null
  departments: string[]; focus: string[]
  assignments: { type: string; text: string; sourceId: string }[]
  sourceId: string; asOf: string; status: Status
}

export interface Issue { id: string; prio: 'hoch' | 'mittel' | 'niedrig'; type: string; title: string; text: string; need: string; pages: number[] }

export interface Dataset {
  schema: number
  meta: { datasetVersion: string; generatedAt: string; kompendiumVersion: string; localDataDate: string; disclaimer: string; rounding: string }
  sources: Source[]; saa: Saa[]; medications: Medication[]; calcRules: CalcRule[]
  calcOhneGE: { med: string; text: string }[]
  topics: Topic[]; local: LocalInfo[]; hospitals: Hospital[]; hospitalNotes: string[]; issues: Issue[]
  searchSynonyms: Record<string, string[]>
}

export type ItemKind = 'saa' | 'medication' | 'topic' | 'local' | 'hospital' | 'calc'
export interface ItemRef { kind: ItemKind; id: string; title: string }
