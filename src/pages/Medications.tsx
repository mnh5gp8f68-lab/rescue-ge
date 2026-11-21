import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useData } from '../lib/store'
import { normalize } from '../lib/search'
import { Banner, BulletList, Card, Collapsible, EmptyNote, FavoriteButton, Field, GeBadge, IssueLinks, List, ListLink, NO_DATA, NotFound, Page, PageHeader, SearchField, SectionTitle, SourceBox, StatusBadge, useRecent } from '../components/ui'
import { IconCalc } from '../components/Icons'
import type { Medication } from '../types'

function geSummary(m: Medication) {
  const lv = [...new Set(m.geCompetence.map(c => c.ge?.level).filter(Boolean))] as string[]
  return lv
}

export function MedList() {
  const d = useData()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'alle' | 'ge' | 'rechner' | 'pruefen'>('alle')
  const withCalc = useMemo(() => new Set(d.calcRules.map(r => r.med)), [d])
  const list = useMemo(() => {
    const n = normalize(q)
    return [...d.medications]
      .filter(m => n.length < 2 || normalize([m.name, m.wirkstoff, ...m.synonyms, ...m.handelsnamen].join(' ')).includes(n))
      .filter(m => filter === 'alle' || (filter === 'ge' && geSummary(m).length > 0) || (filter === 'rechner' && withCalc.has(m.id)) || (filter === 'pruefen' && m.status !== 'Teilweise geprüft' && m.status !== 'Geprüft'))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }, [d, q, filter, withCalc])
  const chips: [typeof filter, string][] = [['alle', 'Alle'], ['ge', 'Mit GE-Feld'], ['rechner', 'Mit Rechner'], ['pruefen', 'Zu prüfen']]
  return (
    <>
      <PageHeader title="Medikamente" subtitle={`${d.medications.length} Einträge`} back={false}
        right={<Link to="/rechner" className="w-12 h-12 flex items-center justify-center accent" aria-label="Rechner"><IconCalc /></Link>} />
      <Page>
        <Link to="/rechner" className="btn btn-primary w-full text-[16px]"><IconCalc size={20} /> Medikamentenrechner</Link>
        <SearchField value={q} onChange={setQ} placeholder="Wirkstoff oder Name …" />
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          {chips.map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`btn min-h-[40px] text-[14px] whitespace-nowrap ${filter === k ? 'btn-primary' : ''}`}>{l}</button>)}
        </div>
        <List>
          {list.map(m => {
            const lv = geSummary(m)
            return <ListLink key={m.id} to={`/medikamente/${m.id}`} title={m.name}
              subtitle={<>{lv.length ? `GE: ${lv.join(' / ')}` : 'kein GE-Feld'}{m.hasSAA ? ` · S. ${m.source.printedPage}` : ' · keine eigene SAA'}</>}
              right={<StatusBadge status={m.status} small />} />
          })}
          {!list.length && <div className="p-4"><EmptyNote text="Keine Treffer." /></div>}
        </List>
      </Page>
    </>
  )
}

/** Einzeiliges Feld: Text oder Hinweis "Keine Angabe" */
function txt(v: string | string[] | null | undefined) {
  const a = Array.isArray(v) ? v.filter(Boolean) : v ? [v] : []
  return a.length ? <div className="space-y-1">{a.map((x, i) => <div key={i}>{x}</div>)}</div> : <EmptyNote />
}

/** Prüft, ob in den Dosierungszeilen eine Angabe vorkommt, ohne sie zu interpretieren */
function mentions(lines: string[], re: RegExp) { return lines.some(l => re.test(l)) }

export function MedDetail() {
  const { id } = useParams()
  const d = useData()
  const m = d.medications.find(x => x.id === id)
  useRecent('medication', m?.id, m?.name)
  if (!m) return <NotFound what="Das Medikament" />
  const rules = d.calcRules.filter(r => r.med === m.id)
  const ohne = d.calcOhneGE.filter(x => x.med === m.id)
  const dose = m.dosierung
  const seeDose = (re: RegExp) => mentions(dose, re) ? <span>siehe Dosierung</span> : <EmptyNote />
  const pagesExtra = m.geCompetence.map(c => c.page).filter((p): p is number => p != null)

  return (
    <>
      <PageHeader title={m.name} subtitle={m.gruppe ?? undefined} right={<FavoriteButton kind="medication" id={m.id} title={m.name} />} />
      <Page>
        <div className="flex flex-wrap gap-2"><StatusBadge status={m.status} />{[...new Set(m.geCompetence.map(c => c.ge?.level).filter(Boolean))].map(l => <GeBadge key={l} ge={{ level: l!, star: false, mark: '' }} />)}</div>
        {!m.hasSAA && <Banner kind="warn" title="Keine eigene SAA im Kompendium">Nur im Medikamentenkasten eines Behandlungspfades genannt. Kontraindikationen, Konzentration und weitere Angaben fehlen in den hinterlegten Quellen.</Banner>}
        {m.status === 'Widersprüchliche Quellen' && <Banner kind="danger" title="Widersprüchliche Quellen">Zu diesem Medikament gibt es widersprüchliche oder unklare Angaben. Details unter „Offene Fragen“.</Banner>}

        {rules.length > 0 && (
          <Card>
            <SectionTitle>Rechner</SectionTitle>
            <div className="space-y-2">
              {rules.map(r => (
                <Link key={r.id} to={`/rechner/${r.id}`} className={`flex items-center gap-3 card2 px-3 min-h-[52px] ${r.locked ? 'opacity-80' : ''}`}>
                  <IconCalc size={20} className={r.locked ? 'text-red-400' : 'accent'} />
                  <span className="flex-1 font-semibold text-[15px]">{r.label}</span>
                  {r.locked ? <span className="text-xs font-bold text-red-400">gesperrt</span> : <GeBadge ge={r.ge} small />}
                </Link>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <Field label="Wirkstoff">{txt(m.wirkstoff)}</Field>
          <Field label="Handelsname">{m.handelsnamen.length ? m.handelsnamen.join(', ') : <EmptyNote />}</Field>
          <Field label="Arzneimittelgruppe">{txt(m.gruppe)}</Field>
          <Field label="Konzentration">{txt(m.konzentration)}</Field>
        </Card>

        <Card><SectionTitle>Indikationen</SectionTitle><BulletList items={m.indikationen} /></Card>
        <Card>
          <SectionTitle>Kontraindikationen – keine Anwendung, wenn</SectionTitle><BulletList items={m.keineAnwendung} />
          <div className="mt-4"><SectionTitle>Anwendung nach sorgfältiger Nutzen-Risiko-Abwägung, wenn</SectionTitle><BulletList items={m.nutzenRisiko} /></div>
        </Card>
        <Card><SectionTitle>Altersbegrenzung</SectionTitle>{txt(m.altersbegrenzung)}</Card>

        {m.primaereMassnahmen.length > 0 && <Card><SectionTitle>Primäre Maßnahmen</SectionTitle><div className="space-y-1">{m.primaereMassnahmen.map((l, i) => <div key={i}>{l}</div>)}</div></Card>}

        <Card>
          <SectionTitle>Durchführung / Dosierung {m.dosierungHinweis ?? ''}</SectionTitle>
          {dose.length ? <div className="space-y-1 text-[16px]">{dose.map((l, i) => <div key={i} className={/^[-⁃]/.test(l) ? 'pl-3' : 'font-semibold mt-2 first:mt-0'}>{l}</div>)}</div> : <EmptyNote />}
          <p className="text-xs muted mt-3">Wortlaut aus der SAA (Textfassung). Gewichtsabhängige Dosierungen nur im Rechner berechnen.</p>
        </Card>

        <Card>
          <Field label="Dosierung Erwachsene">{seeDose(/erwachsen|pat\.\s*>|> ?12 jahre|≥ ?18/i)}</Field>
          <Field label="Dosierung Kinder">{seeDose(/kind|säugling|jahre|monate/i)}</Field>
          <Field label="Gewichtsabhängige Dosierung">{seeDose(/kg ?kg|\/kg|pro kg/i)}</Field>
          <Field label="Maximaldosis">{seeDose(/max/i)}</Field>
          <Field label="Applikationsweg">{seeDose(/i\.v|i\.m|i\.o|nasal|rect|rekt|oral|bukkal|buccal|inhal|vernebel|sublingual|s\.c|kurzinfusion/i)}</Field>
          <Field label="Verdünnung">{seeDose(/verdünn|in \d+ ?ml|nacl/i)}</Field>
        </Card>

        <Card><SectionTitle>Unerwünschte Arzneimittelwirkungen / Risiken</SectionTitle><BulletList items={m.uaw} /></Card>
        {m.ueberdosierung.length > 0 && <Card><SectionTitle>Überdosierung / Gegenmaßnahmen</SectionTitle><div className="space-y-1">{m.ueberdosierung.map((l, i) => <div key={i}>{l}</div>)}</div></Card>}
        <Card><SectionTitle>Besonderheiten / Hinweise zur Verabreichung</SectionTitle><BulletList items={m.besonderheiten} /></Card>

        <Card>
          <SectionTitle>GE-Kompetenz nach BPR</SectionTitle>
          {m.geCompetence.length === 0 ? <EmptyNote text={`Kein Medikamentenkasten mit Kompetenzzeile gefunden. ${NO_DATA}`} /> : (
            <div className="space-y-2">
              {m.geCompetence.map((c, i) => (
                <details key={i} className="card2">
                  <summary className="flex items-center gap-2 px-3 min-h-[52px]">
                    <span className="flex-1 min-w-0"><span className="block font-semibold text-[15px] leading-snug">{c.label ?? 'Kasten'}</span><span className="block text-xs muted">S. {c.page ?? '–'}</span></span>
                    <GeBadge ge={c.ge} small />
                  </summary>
                  <div className="px-3 pb-3 space-y-2">
                    {c.box.length > 0 && <div className="text-[15px] space-y-0.5">{c.box.map((l, j) => <div key={j}>{l}</div>)}</div>}
                    {c.geFootnotes.length > 0 && <Banner kind="warn" title="Fußnote für Gelsenkirchen">{c.geFootnotes.join(' ')}</Banner>}
                    <div className="pre muted">{c.rows.join('\n')}</div>
                  </div>
                </details>
              ))}
            </div>
          )}
          {ohne.map((x, i) => <p key={i} className="text-[14px] mt-3 warn p-2.5">{x.text}</p>)}
          <p className="text-xs muted mt-3">Kompetenzangaben aus der Textfassung, Gültigkeitsfarben nicht visuell geprüft.</p>
        </Card>

        <Collapsible title="Originaltext SAA (maschineller Auszug)"><div className="pre">{m.rawText || '–'}</div></Collapsible>
        <IssueLinks ids={m.issues} />
        <SourceBox source={m.source} ge={m.geCompetence.find(c => c.ge?.level)?.ge ?? null} status={m.status} extraPages={pagesExtra} />
      </Page>
    </>
  )
}
