import { useParams } from 'react-router-dom'
import { useData } from '../lib/store'
import { Banner, Card, FavoriteButton, List, ListLink, NotFound, Page, PageHeader, SectionTitle, StatusBadge, useRecent } from '../components/ui'

const kindBadge = (c: string) => (
  <span className={`inline-flex text-xs font-bold border rounded-full px-2.5 py-1 ${c.startsWith('Offizielle') ? 'border-emerald-500/60 text-emerald-300 bg-emerald-500/10' : 'border-slate-500/60 muted'}`}>{c}</span>
)

export function LocalList() {
  const d = useData()
  return (
    <>
      <PageHeader title="Lokales Wissen" subtitle="Gelsenkirchen – organisatorische Informationen" />
      <Page>
        <Banner kind="info">Lokale Dokumente, getrennt von den medizinischen Inhalten des Kompendiums. Die Kennzeichnung zeigt, ob es sich um eine offizielle lokale Vorgabe oder eine ergänzende Information handelt.</Banner>
        <List>{d.local.map(l => <ListLink key={l.id} to={`/lokal/${l.id}`} title={l.title} subtitle={l.category} />)}</List>
      </Page>
    </>
  )
}

export function LocalDetail() {
  const { id } = useParams()
  const d = useData()
  const l = d.local.find(x => x.id === id)
  useRecent('local', l?.id, l?.title)
  if (!l) return <NotFound what="Der Eintrag" />
  const s = d.sources.find(x => x.id === l.source.sourceId)
  return (
    <>
      <PageHeader title={l.title} subtitle="Lokales Wissen" right={<FavoriteButton kind="local" id={l.id} title={l.title} />} />
      <Page>
        <div className="flex flex-wrap gap-2">{kindBadge(l.category)}<StatusBadge status={l.status} /></div>
        <Card><div className="pre text-[14px]">{l.text.trim()}</div></Card>
        <Card>
          <SectionTitle>Quelle</SectionTitle>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[14.5px]">
            <dt className="muted">Dokument</dt><dd className="break-words">{s?.document}</dd>
            <dt className="muted">Herausgeber</dt><dd>{s?.issuer}</dd>
            <dt className="muted">Version</dt><dd>{s?.version}</dd>
            <dt className="muted">Datum</dt><dd>{s?.date}</dd>
            <dt className="muted">Geltungsbereich</dt><dd>{s?.scope}</dd>
            <dt className="muted">Art</dt><dd>{s?.kind}</dd>
          </dl>
          <p className="text-xs muted mt-3">Text maschinell aus dem Originaldokument übernommen (Layout kann abweichen).</p>
        </Card>
      </Page>
    </>
  )
}
