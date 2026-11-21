import { describe, expect, it } from 'vitest'
import { calculate, parseWeight, round, fmt } from '../src/lib/calc'
import type { CalcRule } from '../src/types'

const base: CalcRule = {
  id: 't', med: 'x', label: 'Test', population: 'Kinder', route: 'i.v.', dosePerKg: 5, unit: 'mg', maxDose: 300,
  concentrations: [{ label: '50 mg/ml', mgPerMl: 50 }], quotes: [], pages: [1], competenceLine: 1, competencePage: 1, competenceBox: [],
  ge: { level: 'NotSan', star: false, mark: '' }, status: 'Teilweise geprüft',
}

describe('Rechenregeln', () => {
  it('Dosis = Gewicht × Dosis/kg, Volumen = Dosis ÷ Konzentration', () => {
    const r = calculate(base, 20)
    expect(r.ok).toBe(true); expect(r.dose).toBe(100); expect(r.volumeMl).toBe(2); expect(r.capped).toBeFalsy()
  })
  it('Maximaldosis wird angewendet', () => {
    const r = calculate(base, 80)
    expect(r.dose).toBe(300); expect(r.capped).toBe(true); expect(r.volumeMl).toBe(6)
  })
  it('Maximaldosis pro kg (Esketamin-Typ) wird als Grenze berechnet', () => {
    const r = calculate({ ...base, dosePerKg: 0.125, maxDose: null, maxDosePerKg: 0.25, concentrations: [{ label: '5', mgPerMl: 5 }] }, 70)
    expect(r.dose).toBe(8.75); expect(r.maxApplied).toBe(17.5); expect(r.volumeMl).toBe(1.75)
  })
  it('Rundung auf 2 Nachkommastellen, ungerundeter Wert bleibt erhalten', () => {
    const r = calculate({ ...base, dosePerKg: 0.01, maxDose: null, concentrations: [{ label: '1', mgPerMl: 1 }] }, 13.3)
    expect(r.doseUnrounded).toBeCloseTo(0.133, 10); expect(r.dose).toBe(0.13); expect(r.volumeMl).toBe(0.13)
  })
  it('Unterschiedliche Konzentrationen ergeben unterschiedliche Volumina', () => {
    const rule = { ...base, dosePerKg: 0.05, maxDose: 10, concentrations: [{ label: '10', mgPerMl: 10 }, { label: '20', mgPerMl: 20 }] }
    expect(calculate(rule, 30, 0).volumeMl).toBe(0.15); expect(calculate(rule, 30, 1).volumeMl).toBe(0.08)
  })
  it('Festdosis oberhalb der Gewichtsgrenze (Paracetamol-Typ)', () => {
    const rule = { ...base, dosePerKg: 15, maxDose: null, minWeight: 15, maxWeight: 50, aboveMaxWeight: { fixedDose: 1000, text: 'x' }, concentrations: [{ label: '10', mgPerMl: 10 }] }
    expect(calculate(rule, 40).dose).toBe(600); expect(calculate(rule, 50).dose).toBe(750)
    const f = calculate(rule, 51); expect(f.fixed).toBe(true); expect(f.dose).toBe(1000); expect(f.volumeMl).toBe(100)
    expect(calculate(rule, 14).ok).toBe(false)
  })
  it('Volumentherapie in ml ohne Konzentration', () => {
    const r = calculate({ ...base, dosePerKg: 10, unit: 'ml', maxDose: null, concentrations: [] }, 18)
    expect(r.dose).toBe(180); expect(r.volumeMl).toBe(180)
  })
})

describe('Sicherheitsgrenzen', () => {
  it('kein Gewicht / 0 / negativ / unplausibel → kein Ergebnis', () => {
    for (const w of [null, 0, -5, 0.2, 301, NaN]) { const r = calculate(base, w as number | null); expect(r.ok).toBe(false); expect(r.dose).toBeUndefined() }
  })
  it('hohes Gewicht → Warnung', () => { expect(calculate(base, 160).warnings.join(' ')).toMatch(/hohes Gewicht/) })
  it('gesperrte Regel liefert keine Zahlen', () => {
    const r = calculate({ ...base, locked: true, lockReason: 'Widerspruch' }, 20)
    expect(r.ok).toBe(false); expect(r.blocked).toBe('Widerspruch'); expect(r.dose).toBeUndefined(); expect(r.volumeMl).toBeUndefined()
  })
  it('ohne GE-Kennzeichnung gesperrt', () => { expect(calculate({ ...base, ge: null }, 20).blocked).toMatch(/GE/) })
  it('ohne Dosierungsangabe gesperrt', () => { expect(calculate({ ...base, dosePerKg: undefined }, 20).blocked).toMatch(/Keine Dosierungsangabe/) })
  it('Mindestgewicht und widersprüchlicher Gewichtsbereich', () => {
    const rule = { ...base, minWeight: 21, conflictWeightRange: [20, 21] as [number, number] }
    expect(calculate(rule, 20.5).blocked).toMatch(/Widersprüchliche/); expect(calculate(rule, 19).blocked).toMatch(/Widersprüchliche|erst ab/)
    expect(calculate(rule, 15).blocked).toMatch(/erst ab/); expect(calculate(rule, 21).ok).toBe(true)
  })
  it('exklusive Mindestgrenze (> 10 kg)', () => {
    const rule = { ...base, minWeightExclusive: 10 }
    expect(calculate(rule, 10).ok).toBe(false); expect(calculate(rule, 10.1).ok).toBe(true)
  })
  it('Gewichtseingabe parsen (Komma, Text, negativ)', () => {
    expect(parseWeight('12,5')).toBe(12.5); expect(parseWeight(' 70 ')).toBe(70)
    expect(parseWeight('-3')).toBeNull(); expect(parseWeight('abc')).toBeNull(); expect(parseWeight('')).toBeNull(); expect(parseWeight('1e3')).toBeNull()
  })
  it('round/fmt', () => { expect(round(1.005, 2)).toBe(1.01); expect(fmt(1234.5)).toBe('1.234,5') })
})
