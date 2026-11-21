// Offline-Volltextsuche mit Normalisierung, Synonymen und Abkürzungen.
import type { Dataset, ItemKind } from '../types'

export interface SearchHit { kind: ItemKind; id: string; title: string; subtitle?: string; score: number }
export interface SearchGroup { label: string; kind: ItemKind; hits: SearchHit[] }
interface Doc { kind: ItemKind; id: string; title: string; subtitle?: string; titleN: string; keysN: string; bodyN: string }
export interface SearchIndex { docs: Doc[]; synonyms: Record<string, string[]> }

export function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[®™*]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

export function buildIndex(d: Dataset): SearchIndex {
  const docs: Doc[] = []
  const add = (kind: ItemKind, id: string, title: string, subtitle: string | undefined, keys: string[], body: string) =>
    docs.push({ kind, id, title, subtitle, titleN: normalize(title), keysN: ' ' + normalize(keys.join(' ')) + ' ', bodyN: normalize(body).slice(0, 20000) })
  for (const s of d.saa) add('saa', s.id, s.title, s.category, [...s.synonyms, s.category], s.sections.map(x => x.items.join(' ')).join(' '))
  for (const m of d.medications) add('medication', m.id, m.name, m.wirkstoff !== m.name ? m.wirkstoff : (m.gruppe ?? undefined),
    [...m.synonyms, ...m.handelsnamen, m.wirkstoff, ...m.geCompetence.map(c => c.label ?? '')], [...m.indikationen, ...m.dosierung, ...m.besonderheiten].join(' '))
  for (const t of d.topics) add('topic', t.id, t.title, t.category, [...t.synonyms, t.category], t.pageTexts.map(p => p.text).join(' '))
  for (const l of d.local) add('local', l.id, l.title, l.category, l.synonyms, l.text)
  for (const h of d.hospitals) add('hospital', h.id, h.name, h.city, [h.city, ...h.departments, ...h.focus, 'krankenhaus klinik'], h.assignments.map(a => a.text).join(' '))
  for (const c of d.calcRules) add('calc', c.id, `Rechner: ${c.label}`, d.medications.find(m => m.id === c.med)?.name, [c.med, 'rechner dosis berechnen'], c.population)
  return { docs, synonyms: d.searchSynonyms }
}

const LABEL: Record<ItemKind, string> = { topic: 'Krankheitsbilder & Themen', medication: 'Medikamente', saa: 'SAA / Maßnahmen', calc: 'Rechner', hospital: 'Kliniken', local: 'Lokales Wissen' }
const ORDER: ItemKind[] = ['topic', 'medication', 'saa', 'calc', 'hospital', 'local']

export function search(ix: SearchIndex, q: string, limitPerGroup = 8): SearchGroup[] {
  const qn = normalize(q)
  if (qn.length < 2) return []
  // Begriffe inkl. globaler Synonyme erweitern
  const terms = qn.split(' ').filter(Boolean).map(t => {
    const alts = new Set([t])
    for (const [k, v] of Object.entries(ix.synonyms)) {
      const vn = v.map(normalize)
      if (normalize(k) === t || vn.includes(t)) { alts.add(normalize(k)); vn.forEach(x => alts.add(x)) }
    }
    return [...alts]
  })
  const hits: SearchHit[] = []
  for (const d of ix.docs) {
    let score = 0; let all = true
    for (const alts of terms) {
      let best = 0
      for (const t of alts) {
        if (d.titleN === t) best = Math.max(best, 100)
        else if (d.titleN.startsWith(t)) best = Math.max(best, 60)
        else if (d.titleN.includes(t)) best = Math.max(best, 40)
        if (d.keysN.includes(' ' + t + ' ')) best = Math.max(best, 55)
        else if (d.keysN.includes(' ' + t)) best = Math.max(best, 35)
        if (best < 10 && t.length >= 3 && d.bodyN.includes(t)) best = Math.max(best, 8)
      }
      if (best === 0) { all = false; break }
      score += best
    }
    if (all) hits.push({ kind: d.kind, id: d.id, title: d.title, subtitle: d.subtitle, score })
  }
  return ORDER.map(k => ({ label: LABEL[k], kind: k, hits: hits.filter(h => h.kind === k).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'de')).slice(0, limitPerGroup) }))
    .filter(g => g.hits.length)
    .sort((a, b) => (b.hits[0].score - a.hits[0].score) || ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
}
