import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useData } from '../lib/store'
import { normalize } from '../lib/search'
import { Banner, Card, EmptyNote, FavoriteButton, List, ListLink, NO_DATA, NotFound, Page, PageHeader, SearchField, SectionTitle, SourceBox, StatusBadge, useRecent } from '../components/ui'
import { IconMap, IconPhone, IconPin } from '../components/Icons'

export const DEPARTMENTS = ['Innere Medizin', 'Kardiologie', 'Neurologie', 'Stroke Unit', 'Unfallchirurgie', 'Orthopädie', 'Allgemeinchirurgie', 'Viszeralchirurgie',
  'Gefäßchirurgie', 'Neurochirurgie', 'Pädiatrie', 'Geburtshilfe', 'Gynäkologie', 'Urologie', 'HNO', 'Augenheilkunde', 'Psychiatrie', 'Kinder- und Jugendpsychiatrie', 'Intensivmedizin']

const telHref = (p: string) => 'tel:' + p.replace(/[^\d+]/g, '')

export function HospitalList() {
  const d = useData()
  const [q, setQ] = useState('')
  const [dep, setDep] = useState<string | null>(null)
  const available = useMemo(() => new Set(d.hospitals.flatMap(h => [...h.departments, ...h.focus])), [d])
  const list = useMemo(() => {
    const n = normalize(q)
    return d.hospitals.filter(h => (n.length < 2 || normalize([h.name, h.city, h.address, ...h.departments, ...h.focus, ...h.assignments.map(a => a.text)].join(' ')).includes(n))
      && (!dep || h.departments.includes(dep) || h.focus.includes(dep)))
  }, [d, q, dep])
  return (
    <>
      <PageHeader title="Kliniken" subtitle="Krankenhausübersicht" back={false} />
      <Page>
        {d.hospitalNotes.map((n, i) => <Banner key={i} kind={i === 0 ? 'warn' : 'info'}>{n}</Banner>)}
        <SearchField value={q} onChange={setQ} placeholder="Klinik, Ort, Fachbereich …" />
        <div>
          <SectionTitle>Fachbereich</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {DEPARTMENTS.map(x => {
              const on = available.has(x)
              return <button key={x} disabled={!on} onClick={() => setDep(dep === x ? null : x)}
                className={`btn min-h-[40px] text-[13.5px] ${dep === x ? 'btn-primary' : ''} ${on ? '' : 'opacity-40'}`}>{x}</button>
            })}
          </div>
          {available.size === 0 && <p className="text-[13px] muted mt-2">Filter inaktiv: Für keine Klinik sind Fachabteilungen durch eine Quelle belegt.</p>}
        </div>
        <List>
          {list.map(h => <ListLink key={h.id} to={`/kliniken/${h.id}`} title={h.name} subtitle={`${h.city} · ${h.assignments[0]?.type ?? ''}`} right={<StatusBadge status={h.status} small />} />)}
          {!list.length && <div className="p-4"><EmptyNote text="Keine Klinik gefunden." /></div>}
        </List>
      </Page>
    </>
  )
}

const TYPE_STYLE: Record<string, string> = {
  'Dokumentierte lokale Zuweisungsregel': 'border-sky-500/60 text-sky-300',
  'Aufnahmehinweis': 'border-amber-500/60 text-amber-300',
  'Besonderer Versorgungsschwerpunkt': 'border-violet-500/60 text-violet-300',
  'Aktuell bestätigte Verfügbarkeit': 'border-green-500/60 text-green-300',
}

export function HospitalDetail() {
  const { id } = useParams()
  const d = useData()
  const h = d.hospitals.find(x => x.id === id)
  useRecent('hospital', h?.id, h?.name)
  if (!h) return <NotFound what="Die Klinik" />
  const q = encodeURIComponent(`${h.name}, ${h.address}`)
  return (
    <>
      <PageHeader title={h.name} subtitle={h.city} right={<FavoriteButton kind="hospital" id={h.id} title={h.name} />} />
      <Page>
        <div className="flex flex-wrap gap-2"><StatusBadge status={h.status} /></div>
        <Card>
          <div className="flex gap-2 items-start"><IconPin size={20} className="accent mt-0.5" /><div><div className="font-semibold">{h.name}</div><div>{h.address}</div></div></div>
          <div className="grid gap-2 mt-4">
            {h.phone ? <a href={telHref(h.phone)} className="btn btn-primary text-[17px]"><IconPhone size={20} /> Anrufen: {h.phone}</a> : <EmptyNote text={`Telefon: ${NO_DATA}`} />}
            {h.phoneEmergency && <a href={telHref(h.phoneEmergency)} className="btn text-[17px]"><IconPhone size={20} /> Notaufnahme: {h.phoneEmergency}</a>}
            <div className="grid grid-cols-2 gap-2">
              <a href={`https://maps.apple.com/?q=${q}`} target="_blank" rel="noopener" className="btn"><IconMap size={20} /> Apple Karten</a>
              <a href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noopener" className="btn"><IconMap size={20} /> Google Maps</a>
            </div>
          </div>
          <p className="text-xs muted mt-3">Navigation benötigt eine Internetverbindung. Telefonnummer: zentrale Nummer laut Quelle.</p>
        </Card>
        <Banner kind="info">Keine Angabe zur aktuellen Aufnahmefähigkeit. Die App zeigt keine Verfügbarkeit in Echtzeit.</Banner>
        <Card>
          <SectionTitle>Fachabteilungen</SectionTitle>
          {h.departments.length ? h.departments.join(', ') : <EmptyNote />}
          <div className="mt-3"><SectionTitle>Besondere Versorgungsschwerpunkte</SectionTitle>{h.focus.length ? h.focus.join(', ') : <EmptyNote />}</div>
        </Card>
        <Card>
          <SectionTitle>Zuweisung und Aufnahmehinweise</SectionTitle>
          {h.assignments.length ? <div className="space-y-2.5">{h.assignments.map((a, i) => (
            <div key={i} className="card2 p-3">
              <span className={`inline-block text-[11.5px] font-bold border rounded-full px-2 py-0.5 mb-1.5 ${TYPE_STYLE[a.type] ?? 'border-slate-500/50'}`}>{a.type}</span>
              <div className="text-[15px]">{a.text}</div>
              <div className="text-xs muted mt-1">Quelle: {d.sources.find(s => s.id === a.sourceId)?.title ?? a.sourceId}</div>
            </div>
          ))}</div> : <EmptyNote />}
        </Card>
        <SourceBox source={{ sourceId: h.sourceId, printedPage: null }} status={h.status} />
        <p className="text-xs muted">Stand der Information: {h.asOf}</p>
      </Page>
    </>
  )
}
