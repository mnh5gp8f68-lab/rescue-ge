import { useEffect, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { GE, ItemKind, SourceRef, Status } from '../types'
import { useApp, useData } from '../lib/store'
import { IconBack, IconChevron, IconInfo, IconSearch, IconStar, IconWarn } from './Icons'

export const NO_DATA = 'Keine Angabe in den hinterlegten Quellen.'

const STATUS_STYLE: Record<Status, string> = {
  'Geprüft': 'bg-green-500/15 text-green-400 border-green-500/50',
  'Teilweise geprüft': 'bg-blue-500/15 text-blue-400 border-blue-500/50',
  'GE-Gültigkeit noch zu prüfen': 'bg-amber-500/15 text-amber-400 border-amber-500/60',
  'Unvollständige Quelle': 'bg-orange-500/15 text-orange-400 border-orange-500/60',
  'Widersprüchliche Quellen': 'bg-red-500/15 text-red-400 border-red-500/60',
  'Veraltet': 'bg-slate-500/15 text-slate-400 border-slate-500/50',
}
export function StatusBadge({ status, small }: { status: Status; small?: boolean }) {
  return <span className={`inline-flex items-center rounded-full border font-semibold whitespace-nowrap ${small ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'} ${STATUS_STYLE[status] ?? STATUS_STYLE['Veraltet']}`}>{status}</span>
}

/** GE-Kompetenzstufe als Badge */
export function GeBadge({ ge, small }: { ge: GE | null | undefined; small?: boolean }) {
  const cls = small ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
  if (!ge || !ge.level) return <span className={`inline-flex rounded-full border font-semibold whitespace-nowrap bg-amber-500/15 text-amber-400 border-amber-500/60 ${cls}`}>kein GE-Feld</span>
  return <span className={`inline-flex rounded-full border font-semibold whitespace-nowrap bg-sky-500/15 text-sky-300 border-sky-500/50 ${cls}`}>GE · {ge.level}{ge.star ? ' ★' : ''}{ge.mark ? ` ${ge.mark}` : ''}</span>
}

export function PageHeader({ title, subtitle, back = true, right }: { title: string; subtitle?: ReactNode; back?: boolean; right?: ReactNode }) {
  const nav = useNavigate()
  return (
    <header className="sticky top-0 z-20 safe-top" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-1 px-2 min-h-[56px] border-b hr">
        {back ? (
          <button onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))} className="w-12 h-12 flex items-center justify-center accent" aria-label="Zurück"><IconBack /></button>
        ) : <div className="w-3" />}
        <div className="flex-1 min-w-0 py-2">
          <h1 className="text-[18px] font-bold leading-tight truncate">{title}</h1>
          {subtitle && <div className="text-xs muted truncate">{subtitle}</div>}
        </div>
        {right}
        <Link to="/suche" className="w-12 h-12 flex items-center justify-center accent" aria-label="Suche"><IconSearch /></Link>
      </div>
    </header>
  )
}

export function Page({ children }: { children: ReactNode }) {
  return <main className="px-4 pt-4 pb-nav max-w-2xl mx-auto space-y-4">{children}</main>
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card p-4 ${className}`}>{children}</section>
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[13px] font-bold uppercase tracking-wide muted mb-2">{children}</h2>
}

export function Collapsible({ title, children, open = false, className = '' }: { title: ReactNode; children: ReactNode; open?: boolean; className?: string }) {
  return (
    <details className={`card ${className}`} open={open}>
      <summary className="flex items-center gap-2 px-4 min-h-[52px] font-semibold">
        <IconChevron size={18} className="chev accent" /><span className="flex-1">{title}</span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  )
}

export function EmptyNote({ text = NO_DATA }: { text?: string }) {
  return <p className="muted italic text-[15px]">{text}</p>
}

export function Banner({ kind = 'warn', children, title }: { kind?: 'warn' | 'danger' | 'info'; children: ReactNode; title?: string }) {
  return (
    <div className={`${kind} p-3 flex gap-2.5 text-[15px]`} role={kind === 'danger' ? 'alert' : undefined}>
      <span className="shrink-0 mt-0.5">{kind === 'info' ? <IconInfo size={20} /> : <IconWarn size={20} />}</span>
      <div className="min-w-0">{title && <div className="font-bold mb-0.5">{title}</div>}{children}</div>
    </div>
  )
}

export function ListLink({ to, title, subtitle, right, icon }: { to: string; title: ReactNode; subtitle?: ReactNode; right?: ReactNode; icon?: ReactNode }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 min-h-[56px] py-2.5 border-b hr last:border-b-0 active:opacity-70">
      {icon && <span className="accent shrink-0">{icon}</span>}
      <span className="flex-1 min-w-0">
        <span className="block font-semibold leading-snug">{title}</span>
        {subtitle && <span className="block text-[13px] muted leading-snug truncate">{subtitle}</span>}
      </span>
      {right}
      <IconChevron size={18} className="muted shrink-0" />
    </Link>
  )
}

export function List({ children }: { children: ReactNode }) {
  return <div className="card overflow-hidden">{children}</div>
}

export function FavoriteButton({ kind, id, title }: { kind: ItemKind; id: string; title: string }) {
  const { isFavorite, toggleFavorite } = useApp()
  const fav = isFavorite(kind, id)
  return (
    <button onClick={() => toggleFavorite({ kind, id, title })} className={`w-12 h-12 flex items-center justify-center ${fav ? 'text-amber-400' : 'muted'}`}
      aria-label={fav ? 'Aus Favoriten entfernen' : 'Als Favorit speichern'} aria-pressed={fav}>
      <IconStar filled={fav} />
    </button>
  )
}

/** Erfasst den Eintrag unter "Zuletzt geöffnet" */
export function useRecent(kind: ItemKind, id: string | undefined, title: string | undefined) {
  const { addRecent } = useApp()
  useEffect(() => { if (id && title) addRecent({ kind, id, title }) }, [kind, id, title, addRecent])
}

export function BulletList({ items, empty = true }: { items: string[] | null | undefined; empty?: boolean }) {
  if (!items || items.length === 0) return empty ? <EmptyNote /> : null
  return (
    <ul className="space-y-1.5">
      {items.map((x, i) => <li key={i} className="flex gap-2"><span className="accent shrink-0">•</span><span className="min-w-0">{x}</span></li>)}
    </ul>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-3 border-b hr last:border-b-0">
      <div className="text-[13px] font-bold muted mb-1">{label}</div>
      <div className="text-[16px]">{children}</div>
    </div>
  )
}

export function SourceBox({ source, ge, status, extraPages }: { source: SourceRef; ge?: GE | null; status: Status; extraPages?: number[] }) {
  const d = useData()
  const s = d.sources.find(x => x.id === source.sourceId)
  const pages = [source.printedPage, ...(extraPages ?? [])].filter((x): x is number => x != null)
  const uniq = [...new Set(pages)]
  return (
    <Card>
      <SectionTitle>Quelle</SectionTitle>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[14.5px]">
        <dt className="muted">Quelle</dt><dd>{s?.title ?? source.sourceId}</dd>
        <dt className="muted">Dokument</dt><dd className="break-words">{s?.document ?? NO_DATA}</dd>
        <dt className="muted">Version</dt><dd>{s?.version ?? NO_DATA}{s?.date && s.date !== s.version ? ` · ${s.date}` : ''}</dd>
        {s?.issuer && <><dt className="muted">Herausgeber</dt><dd>{s.issuer}</dd></>}
        <dt className="muted">Originalseite</dt><dd>{uniq.length ? uniq.map(p => `S. ${p}`).join(', ') : '–'}</dd>
        {source.printedPage != null && <><dt className="muted">PDF-Seite</dt><dd>{source.pdfPage ?? source.printedPage}{source.pdfPageDerived ? ' (abgeleitet)' : ''}</dd></>}
        <dt className="muted">Gültigkeit</dt><dd>{ge === undefined ? (s?.scope === 'GE' ? 'GE' : 'GE-Gültigkeit noch zu prüfen') : ge && ge.level ? `GE · ${ge.level}${ge.star ? ' ★' : ''}` : 'GE-Gültigkeit noch zu prüfen'}</dd>
        <dt className="muted">Prüfstatus</dt><dd><StatusBadge status={status} small /></dd>
        {source.note && <><dt className="muted">Hinweis</dt><dd>{source.note}</dd></>}
      </dl>
      <p className="text-xs muted mt-3">Nicht durch die Ärztliche Leitung Rettungsdienst freigegeben.</p>
    </Card>
  )
}

export function IssueLinks({ ids }: { ids: string[] }) {
  const d = useData()
  const list = ids.map(id => d.issues.find(q => q.id === id)).filter(Boolean)
  if (!list.length) return null
  return (
    <Card>
      <SectionTitle>Offene Fragen zu diesem Eintrag</SectionTitle>
      <div className="space-y-2">
        {list.map(q => (
          <Link key={q!.id} to={`/offene-fragen#${q!.id}`} className="block warn p-3">
            <div className="font-semibold text-[15px]">{q!.id} · {q!.title}</div>
            <div className="text-[13.5px] mt-0.5 opacity-90 line-clamp-2">{q!.text}</div>
          </Link>
        ))}
      </div>
    </Card>
  )
}

export function SearchField({ value, onChange, placeholder = 'Suchen …', autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean }) {
  return (
    <label className="relative block">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 muted"><IconSearch size={20} /></span>
      <input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus}
        className="input pl-11" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} enterKeyHint="search" />
    </label>
  )
}

export function NotFound({ what = 'Eintrag' }: { what?: string }) {
  return (<><PageHeader title="Nicht gefunden" /><Page><EmptyNote text={`${what} wurde in den hinterlegten Daten nicht gefunden.`} /></Page></>)
}

export const Disclaimer = () => (
  <p className="text-xs muted leading-relaxed">Nachschlage- und Arbeitshilfe ohne offizielle Freigabe oder Zertifizierung. Medizinische Inhalte müssen vor produktivem Einsatz durch die Ärztliche Leitung Rettungsdienst geprüft und freigegeben werden.</p>
)
