// Rechenlogik Medikamentenrechner. Reine Mathematik: alle Dosierungen/Konzentrationen stammen aus CalcRule (Quelle).
import type { CalcRule, Concentration } from '../types'

export const WEIGHT_MIN = 0.5      // kg – Plausibilitätsgrenzen der Eingabe
export const WEIGHT_MAX = 300      // kg
export const WEIGHT_WARN = 150     // kg – Hinweis auf ungewöhnlich hohes Gewicht

export interface CalcResult {
  ok: boolean
  blocked?: string            // Grund, warum nicht berechnet wird
  errors: string[]; warnings: string[]
  unit: string
  dose?: number; doseUnrounded?: number
  capped?: boolean; maxApplied?: number | null
  fixed?: boolean             // Festdosis (z.B. Paracetamol > 50 kg)
  concentration?: Concentration | null
  volumeMl?: number | null; volumeUnrounded?: number | null
  steps: string[]             // transparenter Rechenweg
}

/** Kaufmännisch runden auf n Nachkommastellen (ohne Gleitkomma-Artefakte) */
export function round(x: number, n = 2): number {
  const f = 10 ** n
  return Math.round((x + Number.EPSILON) * f) / f
}
/** Deutsche Zahlformatierung */
export function fmt(x: number, n = 2): string {
  return round(x, n).toLocaleString('de-DE', { maximumFractionDigits: n })
}

export function parseWeight(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  return Number(t)
}

export function calculate(rule: CalcRule, weightKg: number | null, concIndex = 0): CalcResult {
  const unit = rule.unit ?? 'mg'
  const r: CalcResult = { ok: false, errors: [], warnings: [...(rule.warnings ?? [])], unit, steps: [] }
  if (rule.locked) { r.blocked = rule.lockReason ?? 'Berechnung gesperrt.'; return r }
  if (!rule.ge || !rule.ge.level) { r.blocked = 'Keine GE-Kennzeichnung – GE-Gültigkeit noch zu prüfen.'; return r }
  if (rule.dosePerKg == null || !(rule.dosePerKg > 0)) { r.blocked = 'Keine Dosierungsangabe in den hinterlegten Quellen.'; return r }
  if (weightKg == null || Number.isNaN(weightKg)) { r.errors.push('Bitte ein Körpergewicht eingeben.'); return r }
  if (weightKg <= 0) { r.errors.push('Das Gewicht muss größer als 0 kg sein.'); return r }
  if (weightKg < WEIGHT_MIN || weightKg > WEIGHT_MAX) { r.errors.push(`Unplausibles Gewicht. Erlaubt: ${fmt(WEIGHT_MIN)} – ${WEIGHT_MAX} kg.`); return r }
  if (weightKg > WEIGHT_WARN) r.warnings.push(`Ungewöhnlich hohes Gewicht (${fmt(weightKg)} kg) – Eingabe prüfen.`)
  if (rule.conflictWeightRange && weightKg >= rule.conflictWeightRange[0] && weightKg < rule.conflictWeightRange[1]) {
    r.blocked = `Widersprüchliche Gewichtsgrenze in den Quellen (${rule.conflictWeightRange[0]} kg vs. ${rule.conflictWeightRange[1]} kg). Berechnung für dieses Gewicht gesperrt.`; return r
  }
  if (rule.minWeight != null && weightKg < rule.minWeight) { r.blocked = `Laut Quelle erst ab ${fmt(rule.minWeight)} kg KG. Keine Berechnung.`; return r }
  if (rule.minWeightExclusive != null && weightKg <= rule.minWeightExclusive) { r.blocked = `Laut Quelle erst über ${fmt(rule.minWeightExclusive)} kg KG. Keine Berechnung.`; return r }

  const concs = rule.concentrations ?? []
  const conc = concs.length ? concs[Math.min(Math.max(concIndex, 0), concs.length - 1)] : null
  if (conc && !(conc.mgPerMl > 0)) { r.blocked = 'Ungültige Konzentrationsangabe.'; return r }

  let raw: number
  if (rule.maxWeight != null && weightKg > rule.maxWeight) {
    if (!rule.aboveMaxWeight) { r.blocked = `Laut Quelle nur bis ${fmt(rule.maxWeight)} kg KG. Keine Berechnung.`; return r }
    raw = rule.aboveMaxWeight.fixedDose; r.fixed = true
    r.steps.push(`Gewicht ${fmt(weightKg)} kg > ${fmt(rule.maxWeight)} kg → Festdosis laut Quelle: ${fmt(raw)} ${unit}`)
    r.steps.push(`„${rule.aboveMaxWeight.text}“`)
  } else {
    raw = weightKg * rule.dosePerKg
    r.steps.push(`${fmt(weightKg)} kg × ${fmt(rule.dosePerKg, 4)} ${unit}/kg = ${fmt(raw, 4)} ${unit}`)
  }
  let max: number | null = rule.maxDose ?? null
  if (rule.maxDosePerKg != null) {
    const m2 = weightKg * rule.maxDosePerKg
    r.steps.push(`Maximaldosis: ${fmt(weightKg)} kg × ${fmt(rule.maxDosePerKg, 4)} ${unit}/kg = ${fmt(m2, 4)} ${unit}`)
    max = max == null ? m2 : Math.min(max, m2)
  }
  r.maxApplied = max
  let dose = raw
  if (max != null && raw > max) { dose = max; r.capped = true; r.steps.push(`Begrenzt auf Maximaldosis ${fmt(max)} ${unit}`) }
  r.doseUnrounded = dose; r.dose = round(dose, 2)
  if (conc) {
    const v = dose / conc.mgPerMl
    r.concentration = conc; r.volumeUnrounded = v; r.volumeMl = round(v, 2)
    r.steps.push(`${fmt(dose, 4)} ${unit} ÷ ${fmt(conc.mgPerMl, 4)} ${unit}/ml = ${fmt(v, 4)} ml`)
    if (v > 0 && v < 0.1) r.warnings.push('Sehr kleines Volumen (< 0,1 ml) – Abmessgenauigkeit beachten.')
  } else {
    r.concentration = null; r.volumeMl = unit === 'ml' ? r.dose : null
  }
  r.ok = true
  return r
}
