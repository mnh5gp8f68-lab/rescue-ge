import { useState } from 'react'
import { Link } from 'react-router-dom'
import { hrefOf, useApp, useData } from '../lib/store'
import { useSearchResults } from '../lib/useSearch'
import { Disclaimer, List, ListLink, Page, SearchField, SectionTitle } from '../components/ui'
import { QuickTiles } from '../components/QuickTiles'
import { SearchResults } from '../components/SearchResults'
import { IconClock, IconQuestion, IconSettings, IconStar } from '../components/Icons'
import type { ItemKind } from '../types'

export const KIND_LABEL: Record<ItemKind, string> = { saa: 'SAA', medication: 'Medikament', topic: 'Thema', local: 'Lokal', hospital: 'Klinik', calc: 'Rechner' }

export default function Start() {
  const d = useData()
  const { favorites, recents, settings } = useApp()
  const [q, setQ] = useState('')
  const groups = useSearchResults(q, 5)
  const hi = d.issues.filter(i => i.prio === 'hoch').length

  return (
    <>
      <header className="safe-top px-4 pt-4 max-w-2xl mx-auto flex items-center">
        <div className="flex-1">
          <div className="text-[26px] font-extrabold tracking-tight leading-none">RESCUE <span className="accent">GE</span></div>
          <div className="text-xs muted mt-1">Rettungsdienst Gelsenkirchen</div>
        </div>
        <Link to="/einstellungen" className="w-12 h-12 flex items-center justify-center muted" aria-label="Einstellungen"><IconSettings /></Link>
      </header>
      <Page>
        <SearchField value={q} onChange={setQ} placeholder="Suche: ACS, Midazolam, i.v.-Zugang …" />
        {q.trim().length >= 2 ? (
          <>
            <SearchResults groups={groups} query={q} />
            <Link to={`/suche?q=${encodeURIComponent(q)}`} className="block text-center accent font-semibold py-2">Alle Treffer anzeigen</Link>
          </>
        ) : (
          <>
            <QuickTiles keys={settings.quickAccess} />

            {favorites.length > 0 && (
              <div>
                <SectionTitle>Favoriten</SectionTitle>
                <List>{favorites.slice(0, 8).map(f => <ListLink key={f.kind + f.id} to={hrefOf(f.kind, f.id)} title={f.title} subtitle={KIND_LABEL[f.kind]} icon={<IconStar size={20} filled />} />)}</List>
              </div>
            )}

            {recents.length > 0 && (
              <div>
                <SectionTitle>Zuletzt geöffnet</SectionTitle>
                <List>{recents.slice(0, 6).map(f => <ListLink key={f.kind + f.id} to={hrefOf(f.kind, f.id)} title={f.title} subtitle={KIND_LABEL[f.kind]} icon={<IconClock size={20} />} />)}</List>
              </div>
            )}

            <Link to="/offene-fragen" className="warn p-3 flex items-center gap-3">
              <IconQuestion size={22} />
              <span className="flex-1 text-[15px]"><b>{d.issues.length} offene Fragen</b>{hi ? `, davon ${hi} mit hoher Priorität` : ''}. Inhalte noch nicht durch die ÄLRD freigegeben.</span>
            </Link>

            <footer className="pt-2 space-y-1 text-xs muted">
              <div>Kompendium Rettungsdienst {d.meta.kompendiumVersion} · Lokale Daten {d.meta.localDataDate}</div>
              <div>Datenstand {d.meta.datasetVersion} · erstellt {new Date(d.meta.generatedAt).toLocaleString('de-DE')}</div>
              <Disclaimer />
            </footer>
          </>
        )}
      </Page>
    </>
  )
}
