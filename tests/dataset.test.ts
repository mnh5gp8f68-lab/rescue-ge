// Datenintegrität: läuft nur, wenn die (vertrauliche) Datei data/dataset.json lokal vorhanden ist.
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { calculate } from '../src/lib/calc'
import { buildIndex, search } from '../src/lib/search'
import type { Dataset } from '../src/types'

const P = new URL('../data/dataset.json', import.meta.url)
const SRC = new URL('../data/sources/GemKompRD2026.pdf.txt', import.meta.url)
const have = existsSync(P) && existsSync(SRC)
const d: Dataset = have ? JSON.parse(readFileSync(P, 'utf8')) : ({} as Dataset)
const norm = (s: string) => s.replace(/\s+/g, ' ').trim()
const STATUS = ['Geprüft', 'Teilweise geprüft', 'GE-Gültigkeit noch zu prüfen', 'Unvollständige Quelle', 'Widersprüchliche Quellen', 'Veraltet']

describe.skipIf(!have)('Datensatz', () => {
  const src = have ? norm(readFileSync(SRC, 'utf8')) : ''
  const all = have ? [...d.saa, ...d.medications, ...d.topics, ...d.local] : []
  it('eindeutige IDs', () => { const ids = all.map(x => x.kind + ':' + x.id); expect(new Set(ids).size).toBe(ids.length) })
  it('jeder Eintrag hat Quelle, gültigen Status und (Kompendium) eine Seitenzahl', () => {
    for (const x of all) {
      expect(STATUS).toContain(x.status)
      expect(d.sources.some(s => s.id === x.source.sourceId)).toBe(true)
      if (x.source.sourceId === 'kompendium-2026') expect(x.source.printedPage).toBeGreaterThan(0)
    }
  })
  it('nichts ist als „Geprüft“ markiert (Freigabe durch ÄLRD steht aus)', () => { expect(all.filter(x => x.status === 'Geprüft')).toHaveLength(0) })
  it('alle Rechner-Zitate stehen wörtlich in der Quelle', () => { for (const r of d.calcRules) for (const q of r.quotes) expect(src.includes(norm(q)), `${r.id}: ${q}`).toBe(true) })
  it('jede Dosis/kg und Maximaldosis einer freigeschalteten Regel steht in einem Zitat', () => {
    const de = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 4 })
    for (const r of d.calcRules.filter(r => !r.locked)) {
      const q = r.quotes.join(' | ')
      expect(q, r.id).toContain(de(r.dosePerKg!))
      if (r.maxDose != null) expect(q.replace(/\./g, ''), r.id).toContain(de(r.maxDose).replace(/\./g, ''))
      for (const c of r.concentrations ?? []) expect(q.replace(/\s/g, ''), r.id + ' Konz.').toContain(de(c.mgPerMl))
    }
  })
  it('freigeschaltete Regeln haben eine GE-Kennzeichnung, gesperrte liefern keine Zahlen', () => {
    for (const r of d.calcRules) {
      const res = calculate(r, 30)
      if (r.locked || !r.ge?.level) { expect(res.ok).toBe(false); expect(res.dose).toBeUndefined() } else expect(r.ge.level).toBeTruthy()
    }
  })
  it('Widersprüche sind gesperrt (Glucose, Butylscopolamin, Esketamin i.m.)', () => {
    for (const id of ['glucose-kind', 'butylscopolamin', 'esketamin-im']) expect(d.calcRules.find(r => r.id === id)?.locked).toBe(true)
  })
  it('Beispielrechnungen gegen die Quelle', () => {
    const r = (id: string) => d.calcRules.find(x => x.id === id)!
    expect(calculate(r('amiodaron-rea-kind-1'), 20).dose).toBe(100)       // 5 mg/kgKG
    expect(calculate(r('amiodaron-rea-kind-1'), 70).dose).toBe(300)       // max. 300 mg
    expect(calculate(r('amiodaron-rea-kind-2'), 40).dose).toBe(150)       // max. 150 mg
    expect(calculate(r('epinephrin-rea-kind'), 20).dose).toBe(0.2)        // 0,01 mg/kgKG
    expect(calculate(r('tranexamsaeure'), 80).dose).toBe(1000)            // max. 1000 mg
    expect(calculate(r('tranexamsaeure'), 30).volumeMl).toBe(4.5)         // 450 mg / 100 mg/ml
    expect(calculate(r('nalbuphin-iv-u65'), 80).dose).toBe(16)
    expect(calculate(r('nalbuphin-iv-u65'), 120).dose).toBe(20)
    expect(calculate(r('naloxon-kind'), 20, 0).volumeMl).toBe(2)          // 0,2 mg / 0,1 mg/ml
    expect(calculate(r('vel-kind'), 25).dose).toBe(250)
  })
  it('Suche findet die Beispiele aus dem Auftrag', () => {
    const ix = buildIndex(d)
    const top = (q: string) => search(ix, q).flatMap(g => g.hits)[0]?.title ?? ''
    expect(top('ACS')).toMatch(/ACS/); expect(top('Schlaganfall')).toMatch(/Schlaganfall/); expect(top('Anaphylaxie')).toMatch(/Anaphylaxie/)
    expect(top('Midazolam')).toMatch(/Midazolam/); expect(top('Ketamin')).toMatch(/Ketamin/); expect(top('i.v.-Zugang')).toMatch(/i\.v\.-Zugang/)
    expect(search(ix, 'Reanimation Kind').flatMap(g => g.hits).map(h => h.title).join('|')).toMatch(/Kinder/)
    expect(top('Adrenalin')).toMatch(/Epinephrin/); expect(top('Stroke')).toMatch(/Schlaganfall/)
    expect(search(ix, 'Krankenhaus Neurologie')).toBeDefined()
  })
})
