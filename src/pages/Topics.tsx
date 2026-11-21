import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useData } from '../lib/store'
import { normalize } from '../lib/search'
import { Banner, Card, Collapsible, EmptyNote, FavoriteButton, GeBadge, IssueLinks, List, ListLink, NotFound, Page, PageHeader, SearchField, SectionTitle, SourceBox, StatusBadge, useRecent } from '../components/ui'
import { IconCalc } from '../components/Icons'
import type { Competence, Medication, Topic } from '../types'

const pageRange = (t: Topic) => `S. ${t.pages[0]}${t.pages.length > 1 ? '–' + t.pages[t.pages.length - 1] : ''}`

export function KrankheitsbilderList() {
  const d = useData()
  const [q, setQ] = useState('')
  const cats = ['Leitsymptome', 'Krankheitsbilder', 'Trauma, MANV und Sonstiges']
  const list = useMemo(() => {
    const n = normalize(q)
    return d.topics.filter(t => cats.includes(t.category) && (n.length < 2 || normalize([t.title, ...t.synonyms].join(' ')).includes(n)))
  }, [d, q])
  return (
    <>
      <PageHeader title="Krankheitsbilder & Leitsymptome" subtitle="Behandlungspfade (BPR)" />
      <Page>
        <SearchField value={q} onChange={setQ} placeholder="Krankheitsbild filtern …" />
        {cats.map(c => {
          const items = list.filter(t => t.category === c)
          if (!items.length) return null
          return (
            <div key={c}>
              <SectionTitle>{c}</SectionTitle>
              <List>{items.map(t => <ListLink key={t.id} to={`/thema/${t.id}`} title={t.title} subtitle={`${pageRange(t)}${t.measures.some(m => m.ge?.level) ? ' · mit GE-Medikamentenkästen' : ''}`} />)}</List>
            </div>
          )
        })}
        {!list.length && <EmptyNote text="Keine Treffer." />}
      </Page>
    </>
  )
}

function medFor(c: Competence, meds: Medication[]): Medication | undefined {
  const head = normalize(c.box.slice(0, 3).join(' '))
  const all = normalize(c.box.join(' '))
  const byName = (s: string) => meds.find(m => {
    const n = normalize(m.name.split(' ')[0]); const w = normalize(m.wirkstoff.split(' ')[0])
    return (n.length > 3 && s.includes(n)) || (w.length > 3 && s.includes(w)) || m.synonyms.some(x => x.length > 4 && s.includes(normalize(x)))
  })
  return byName(head) ?? byName(all)
}

export function MeasureCard({ c, meds }: { c: Competence; meds: Medication[] }) {
  const med = medFor(c, meds)
  return (
    <div className="card2 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 text-[15px] space-y-0.5">{c.box.length ? c.box.map((l, i) => <div key={i} className={i === 0 ? 'font-bold' : ''}>{l}</div>) : <span className="muted">Kasten ohne Text</span>}</div>
        <GeBadge ge={c.ge} small />
      </div>
      {c.geFootnotes.length > 0 && <Banner kind="warn" title="Fußnote für Gelsenkirchen">{c.geFootnotes.join(' ')}</Banner>}
      <div className="flex items-center gap-3 text-[13px]">
        <span className="muted">S. {c.page ?? '–'}</span>
        {med && <Link to={`/medikamente/${med.id}`} className="accent font-semibold">→ {med.name}</Link>}
      </div>
      <details><summary className="text-[13px] muted min-h-[32px] flex items-center">Kompetenzzeilen anzeigen</summary><div className="pre muted mt-1">{c.rows.join('\n')}</div></details>
    </div>
  )
}

export function TopicDetail() {
  const { id } = useParams()
  const d = useData()
  const t = d.topics.find(x => x.id === id)
  useRecent('topic', t?.id, t?.title)
  if (!t) return <NotFound what="Das Thema" />
  const withGE = t.measures.filter(m => m.ge?.level)
  const noGE = t.measures.filter(m => !m.ge?.level)
  const isRea = t.category === 'Reanimation'
  const reaRules = isRea ? d.calcRules.filter(r => ['epinephrin-rea-kind', 'amiodaron-rea-kind-1', 'amiodaron-rea-kind-2'].includes(r.id)) : []
  return (
    <>
      <PageHeader title={t.title} subtitle={`${t.category} · ${pageRange(t)}`} right={<FavoriteButton kind="topic" id={t.id} title={t.title} />} />
      <Page>
        <div className="flex flex-wrap gap-2"><StatusBadge status={t.status} /></div>
        <Banner kind="warn" title={t.category === 'Grundlagen' ? 'Textauszug' : 'Nur Textauszug des Flussdiagramms'}>{t.statusNote}{isRea && ' Originalalgorithmen nur als Textauszug – Sichtprüfung am Original erforderlich.'}</Banner>

        {(withGE.length > 0 || noGE.length > 0) && (
          <Card>
            <SectionTitle>Medikamente / Maßnahmen mit GE-Kennzeichnung</SectionTitle>
            {withGE.length ? <div className="space-y-2.5">{withGE.map((c, i) => <MeasureCard key={i} c={c} meds={d.medications} />)}</div> : <EmptyNote text="Kein Kasten mit GE-Feld auf diesen Seiten." />}
            {noGE.length > 0 && (
              <details className="mt-3">
                <summary className="min-h-[44px] flex items-center font-semibold text-amber-400">{noGE.length} Kasten/Kästen ohne GE-Feld (nicht für GE belegt)</summary>
                <div className="space-y-2.5 mt-2">{noGE.map((c, i) => <MeasureCard key={i} c={c} meds={d.medications} />)}</div>
              </details>
            )}
          </Card>
        )}

        {reaRules.length > 0 && (
          <Card>
            <SectionTitle>Dosierungsrechner Reanimation</SectionTitle>
            <div className="space-y-2">{reaRules.map(r => (
              <Link key={r.id} to={`/rechner/${r.id}`} className="flex items-center gap-2 card2 px-3 min-h-[52px]"><IconCalc size={20} className="accent" /><span className="flex-1 font-semibold text-[15px]">{d.medications.find(m => m.id === r.med)?.name} – {r.label}</span><GeBadge ge={r.ge} small /></Link>
            ))}</div>
          </Card>
        )}

        <div>
          <SectionTitle>Originaltext je Seite (maschineller Auszug)</SectionTitle>
          <div className="space-y-2">
            {t.pageTexts.map((p, i) => (
              <Collapsible key={p.printedPage} title={`Seite ${p.printedPage}`} open={i === 0 && t.pageTexts.length === 1}>
                {p.text.trim() ? <div className="pre">{p.text}</div> : <EmptyNote text="Kein Text auf dieser Seite (nur Grafik)." />}
              </Collapsible>
            ))}
          </div>
        </div>

        <IssueLinks ids={t.issues} />
        <SourceBox source={t.source} status={t.status} extraPages={t.pages} />
      </Page>
    </>
  )
}

export function ReanimationHub() {
  const d = useData()
  const topics = d.topics.filter(t => t.category === 'Reanimation')
  const rules = d.calcRules.filter(r => ['epinephrin-rea-kind', 'amiodaron-rea-kind-1', 'amiodaron-rea-kind-2'].includes(r.id))
  return (
    <>
      <PageHeader title="Reanimation" subtitle="ALS · PLS · NLS · Post-ROSC" />
      <Page>
        <Banner kind="warn">Originalalgorithmen nur als Textauszug – Sichtprüfung am Original erforderlich.</Banner>
        <List>{topics.map(t => <ListLink key={t.id} to={`/thema/${t.id}`} title={t.title} subtitle={pageRange(t)} />)}</List>
        <div>
          <SectionTitle>Dosierungsrechner</SectionTitle>
          <List>{rules.map(r => <ListLink key={r.id} to={`/rechner/${r.id}`} icon={<IconCalc size={20} />} title={`${d.medications.find(m => m.id === r.med)?.name} – ${r.label}`} right={<GeBadge ge={r.ge} small />} />)}</List>
        </div>
        <div>
          <SectionTitle>Medikamente bei Reanimation</SectionTitle>
          <List>{['epinephrin', 'amiodaron', 'lidocain'].map(id => d.medications.find(m => m.id === id)).filter(Boolean).map(m => <ListLink key={m!.id} to={`/medikamente/${m!.id}`} title={m!.name} right={<StatusBadge status={m!.status} small />} />)}</List>
        </div>
      </Page>
    </>
  )
}
