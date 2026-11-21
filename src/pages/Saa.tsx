import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useData } from '../lib/store'
import { Banner, Card, Collapsible, FavoriteButton, GeBadge, IssueLinks, List, ListLink, NotFound, Page, PageHeader, SearchField, SectionTitle, SourceBox, StatusBadge, BulletList, useRecent } from '../components/ui'
import { normalize } from '../lib/search'
import type { Saa } from '../types'

const ORDER = ['Indikationen / Symptome', 'Indikationen', 'Kontraindikationen', 'Alternativen', 'Aufklärung / Risiken', 'Einwilligung', 'Durchführung',
  'Erfolgsprüfung', 'Gegenmaßnahmen', 'Abbruchkriterien', 'Verlaufskontrolle', 'Anmerkungen']
const CAT_ORDER = ['Zugänge', 'Atemwegsmanagement', 'CPAP / NIV', 'Defibrillation', 'Kardioversion', 'Schrittmacher', 'Blutstillung', 'Immobilisation', 'Medikamentengabe', 'Weitere Maßnahmen', 'Grundlagen']

function SaaGroups({ list }: { list: Saa[] }) {
  const groups = useMemo(() => {
    const m = new Map<string, Saa[]>()
    for (const s of list) m.set(s.category, [...(m.get(s.category) ?? []), s])
    return [...m.entries()].sort((a, b) => CAT_ORDER.indexOf(a[0]) - CAT_ORDER.indexOf(b[0]))
  }, [list])
  return (
    <>
      {groups.map(([cat, items]) => (
        <div key={cat}>
          <SectionTitle>{cat}</SectionTitle>
          <List>{items.map(s => <ListLink key={s.id} to={`/saa/${s.id}`} title={s.title} subtitle={`S. ${s.source.printedPage}`}
            right={<span className="flex flex-col items-end gap-1"><GeBadge ge={s.ge} small /></span>} />)}</List>
        </div>
      ))}
    </>
  )
}

function useFiltered(q: string) {
  const d = useData()
  return useMemo(() => {
    const n = normalize(q)
    if (n.length < 2) return d.saa
    return d.saa.filter(s => normalize([s.title, s.category, ...s.synonyms].join(' ')).includes(n))
  }, [d, q])
}

export function SaaList() {
  const [q, setQ] = useState('')
  const list = useFiltered(q)
  return (
    <>
      <PageHeader title="SAA & Behandlungspfade" subtitle="Standardarbeitsanweisungen invasive Maßnahmen" back={false} />
      <Page>
        <SearchField value={q} onChange={setQ} placeholder="Maßnahme filtern …" />
        <SaaGroups list={list} />
        <p className="text-xs muted">Medikamenten-SAA: Bereich „Medikamente“. Behandlungspfade (BPR): „Krankheitsbilder“ und „Reanimation“.</p>
      </Page>
    </>
  )
}

export function MassnahmenList() {
  const d = useData()
  const [q, setQ] = useState('')
  const list = useFiltered(q)
  const herang = d.topics.filter(t => t.category === 'Herangehensweise')
  return (
    <>
      <PageHeader title="Maßnahmen" subtitle="SAA invasive Maßnahmen und Herangehensweise" />
      <Page>
        <SearchField value={q} onChange={setQ} placeholder="Maßnahme filtern …" />
        <SaaGroups list={list} />
        <div>
          <SectionTitle>Herangehensweise (BPR)</SectionTitle>
          <List>{herang.map(t => <ListLink key={t.id} to={`/thema/${t.id}`} title={t.title} subtitle={`S. ${t.pages[0]}${t.pages.length > 1 ? '–' + t.pages[t.pages.length - 1] : ''}`} />)}</List>
        </div>
      </Page>
    </>
  )
}

export function SaaDetail() {
  const { id } = useParams()
  const d = useData()
  const s = d.saa.find(x => x.id === id)
  useRecent('saa', s?.id, s?.title)
  if (!s) return <NotFound what="Die SAA" />
  const sections = [...s.sections].sort((a, b) => (ORDER.indexOf(a.heading) + 100) % 100 - (ORDER.indexOf(b.heading) + 100) % 100)
  return (
    <>
      <PageHeader title={s.title} subtitle={`${s.category} · S. ${s.source.printedPage}`} right={<FavoriteButton kind="saa" id={s.id} title={s.title} />} />
      <Page>
        <div className="flex flex-wrap gap-2"><StatusBadge status={s.status} /><GeBadge ge={s.ge} /></div>

        <Card>
          <SectionTitle>Kompetenzstufe Gelsenkirchen</SectionTitle>
          {s.ge && s.ge.level ? (
            <>
              <div className="text-2xl font-extrabold">GE · {s.ge.level}</div>
              <p className="text-[14px] muted mt-1">Erforderliche Mindestqualifikation laut farbigem Gültigkeitsfeld (Textfassung).
                {s.ge.star ? ' ★ vorabdelegierte Maßnahme (§ 4 Abs. 2 Nr. 2c NotSanG).' : ' Kein ★ beim GE-Feld in der Textfassung (siehe offene Frage Q02).'}</p>
              {s.ge.rowText && <div className="pre muted mt-2">{s.ge.rowText}</div>}
            </>
          ) : <Banner kind="warn" title="GE-Gültigkeit noch zu prüfen">Für diesen Eintrag ist in der Textfassung kein GE-Feld vorhanden.</Banner>}
        </Card>

        {s.isFlowchart && <Banner kind="warn" title="Flussdiagramm">Diese Seite ist ein Ablaufdiagramm. Der Text ist ein maschineller Auszug; Reihenfolge und Verzweigungen sind nicht visuell geprüft.</Banner>}

        {sections.map(sec => (
          <Card key={sec.heading}>
            <SectionTitle>{sec.heading}</SectionTitle>
            <BulletList items={sec.items} />
          </Card>
        ))}

        {s.footnotes.length > 0 && <Card><SectionTitle>Fußnoten (andere Gebietskörperschaften)</SectionTitle><BulletList items={s.footnotes} /></Card>}

        <Collapsible title="Kompetenzzeilen aller Gebietskörperschaften">
          <div className="pre muted">{s.competenceRows.join('\n') || '–'}</div>
        </Collapsible>
        <Collapsible title="Originaltext (maschineller Auszug)">
          <div className="pre">{s.rawText}</div>
        </Collapsible>

        <IssueLinks ids={s.issues} />
        <SourceBox source={s.source} ge={s.ge} status={s.status} />
      </Page>
    </>
  )
}
