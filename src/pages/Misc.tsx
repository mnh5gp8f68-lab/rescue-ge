import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { hrefOf, useApp, useData } from '../lib/store'
import { Card, Disclaimer, EmptyNote, List, ListLink, Page, PageHeader, SectionTitle } from '../components/ui'
import { QUICK } from '../components/QuickTiles'
import { IconActivity, IconBook, IconCalc, IconClipboard, IconHeart, IconInfo, IconLayers, IconLock, IconQuestion, IconSettings, IconStar } from '../components/Icons'
import { KIND_LABEL } from './Start'
import type { Issue } from '../types'

export function More() {
  const d = useData()
  return (
    <>
      <PageHeader title="Mehr" back={false} />
      <Page>
        <List>
          <ListLink to="/krankheitsbilder" title="Krankheitsbilder & Leitsymptome" icon={<IconActivity size={22} />} />
          <ListLink to="/reanimation" title="Reanimation" icon={<IconHeart size={22} />} />
          <ListLink to="/rechner" title="Medikamentenrechner" icon={<IconCalc size={22} />} />
          <ListLink to="/massnahmen" title="Maßnahmen" icon={<IconClipboard size={22} />} />
          <ListLink to="/lokal" title="Lokales Wissen" icon={<IconBook size={22} />} />
          <ListLink to="/favoriten" title="Favoriten" icon={<IconStar size={22} />} />
        </List>
        <List>
          <ListLink to="/offene-fragen" title="Offene Fragen" subtitle={`${d.issues.length} Punkte zur Klärung`} icon={<IconQuestion size={22} />} />
          <ListLink to="/quellen" title="Quellen & Versionen" icon={<IconLayers size={22} />} />
          <ListLink to="/einstellungen" title="Einstellungen" icon={<IconSettings size={22} />} />
          <ListLink to="/ueber" title="Über RESCUE GE / Hinweise" icon={<IconInfo size={22} />} />
        </List>
      </Page>
    </>
  )
}

export function Favorites() {
  const { favorites, recents, clearRecents } = useApp()
  return (
    <>
      <PageHeader title="Favoriten" />
      <Page>
        {favorites.length ? <List>{favorites.map(f => <ListLink key={f.kind + f.id} to={hrefOf(f.kind, f.id)} title={f.title} subtitle={KIND_LABEL[f.kind]} icon={<IconStar size={20} filled />} />)}</List>
          : <EmptyNote text="Noch keine Favoriten. Tippe in einer Detailansicht auf den Stern." />}
        <div>
          <div className="flex items-center"><SectionTitle>Zuletzt geöffnet</SectionTitle><span className="flex-1" />{recents.length > 0 && <button onClick={clearRecents} className="text-[13px] accent font-semibold min-h-[40px] px-2">Leeren</button>}</div>
          {recents.length ? <List>{recents.map(f => <ListLink key={f.kind + f.id} to={hrefOf(f.kind, f.id)} title={f.title} subtitle={KIND_LABEL[f.kind]} />)}</List> : <EmptyNote text="Noch nichts geöffnet." />}
        </div>
      </Page>
    </>
  )
}

export function SettingsPage() {
  const d = useData()
  const { settings, setSettings, lock, clearRecents, bundleDate } = useApp()
  const nav = useNavigate()
  const toggleQuick = (k: string) => {
    const has = settings.quickAccess.includes(k)
    setSettings({ quickAccess: has ? settings.quickAccess.filter(x => x !== k) : [...settings.quickAccess, k] })
  }
  const move = (k: string, dir: -1 | 1) => {
    const a = [...settings.quickAccess]; const i = a.indexOf(k); const j = i + dir
    if (i < 0 || j < 0 || j >= a.length) return
    ;[a[i], a[j]] = [a[j], a[i]]; setSettings({ quickAccess: a })
  }
  return (
    <>
      <PageHeader title="Einstellungen" />
      <Page>
        <Card>
          <SectionTitle>Darstellung</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {(['dark', 'light'] as const).map(t => <button key={t} onClick={() => setSettings({ theme: t })} className={`btn ${settings.theme === t ? 'btn-primary' : ''}`}>{t === 'dark' ? 'Dunkel' : 'Hell'}</button>)}
          </div>
        </Card>
        <Card>
          <SectionTitle>Schnellzugriff auf der Startseite</SectionTitle>
          <div className="space-y-1.5">
            {[...settings.quickAccess.filter(k => QUICK[k]), ...Object.keys(QUICK).filter(k => !settings.quickAccess.includes(k))].map(k => {
              const on = settings.quickAccess.includes(k)
              return (
                <div key={k} className="flex items-center gap-2 card2 px-3 min-h-[52px]">
                  <label className="flex items-center gap-3 flex-1 min-h-[48px]">
                    <input type="checkbox" className="w-5 h-5 accent-blue-500" checked={on} onChange={() => toggleQuick(k)} />
                    <span className="font-semibold">{QUICK[k].label}</span>
                  </label>
                  {on && <>
                    <button className="w-10 h-10 muted" onClick={() => move(k, -1)} aria-label="nach oben">▲</button>
                    <button className="w-10 h-10 muted" onClick={() => move(k, 1)} aria-label="nach unten">▼</button>
                  </>}
                </div>
              )
            })}
          </div>
        </Card>
        <Card>
          <SectionTitle>Sicherheit</SectionTitle>
          <div className="grid gap-2">
            <button className="btn" onClick={async () => { await lock(false); nav('/') }}><IconLock size={20} /> Jetzt sperren</button>
            <button className="btn" onClick={async () => { await lock(true); nav('/') }}>Gerät vergessen (Passwort erneut erforderlich)</button>
            <button className="btn" onClick={clearRecents}>Verlauf „Zuletzt geöffnet“ löschen</button>
          </div>
          <p className="text-xs muted mt-3">„Jetzt sperren“ sperrt bis zum nächsten Entsperren; wurde „entsperrt bleiben“ gewählt, entsperrt die App beim nächsten Start automatisch. „Gerät vergessen“ löscht den gespeicherten Schlüssel.</p>
        </Card>
        <Card>
          <SectionTitle>Daten</SectionTitle>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[14.5px]">
            <dt className="muted">Kompendium</dt><dd>Version {d.meta.kompendiumVersion}</dd>
            <dt className="muted">Lokale Daten</dt><dd>Stand {d.meta.localDataDate}</dd>
            <dt className="muted">Datensatz</dt><dd>{d.meta.datasetVersion}</dd>
            <dt className="muted">Erstellt</dt><dd>{new Date(d.meta.generatedAt).toLocaleString('de-DE')}</dd>
            {bundleDate && <><dt className="muted">Verschlüsselt</dt><dd>{new Date(bundleDate).toLocaleString('de-DE')}</dd></>}
          </dl>
          <div className="mt-3 space-y-1.5">
            {d.sources.map(s => <div key={s.id} className="text-[13px]"><b>{s.title}</b><br /><span className="muted">SHA-256 {s.sha256.slice(0, 16)}…</span></div>)}
          </div>
        </Card>
      </Page>
    </>
  )
}

const PRIO: Record<Issue['prio'], number> = { hoch: 0, mittel: 1, niedrig: 2 }
const PRIO_STYLE: Record<Issue['prio'], string> = { hoch: 'bg-red-500/15 text-red-400 border-red-500/60', mittel: 'bg-amber-500/15 text-amber-400 border-amber-500/60', niedrig: 'bg-slate-500/15 text-slate-300 border-slate-500/50' }

export function Issues() {
  const d = useData()
  const { hash } = useLocation()
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }) }, [hash])
  const list = [...d.issues].sort((a, b) => PRIO[a.prio] - PRIO[b.prio] || a.id.localeCompare(b.id))
  return (
    <>
      <PageHeader title="Offene Fragen" subtitle={`${d.issues.length} Punkte zur Klärung mit der ÄLRD`} />
      <Page>
        {list.map(q => (
          <section key={q.id} id={q.id} className={`card p-4 scroll-mt-20 ${hash === '#' + q.id ? 'border-2 border-[var(--accent)]' : ''}`}>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-bold">{q.id}</span>
              <span className={`text-[11px] font-bold border rounded-full px-2 py-0.5 ${PRIO_STYLE[q.prio]}`}>Priorität {q.prio}</span>
              <span className="text-[11px] font-semibold border hr rounded-full px-2 py-0.5 muted">{q.type}</span>
            </div>
            <h2 className="font-bold text-[16px] leading-snug">{q.title}</h2>
            <p className="text-[15px] mt-1.5">{q.text}</p>
            <p className="text-[13px] muted mt-2">Benötigt: {q.need}{q.pages.length ? ` · Seiten ${q.pages.join(', ')}` : ''}</p>
          </section>
        ))}
      </Page>
    </>
  )
}

export function Sources() {
  const d = useData()
  return (
    <>
      <PageHeader title="Quellen & Versionen" />
      <Page>
        <Card>
          <SectionTitle>Quellenhierarchie</SectionTitle>
          <ol className="list-decimal pl-5 space-y-1 text-[15px]">
            <li>Aktuelle lokale Vorgaben und ausdrücklich für Gelsenkirchen gültige Dokumente</li>
            <li>Für Gelsenkirchen gültige Inhalte aus dem Gemeinsamen Kompendium 2026</li>
            <li>Weitere bereitgestellte Unterlagen</li>
            <li>Externe Informationen (nur ausdrücklich recherchiert und gekennzeichnet – derzeit keine)</li>
          </ol>
        </Card>
        {[...d.sources].sort((a, b) => a.priority - b.priority).map(s => (
          <Card key={s.id}>
            <div className="font-bold">{s.title}</div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[14px] mt-2">
              <dt className="muted">Dokument</dt><dd className="break-words">{s.document}</dd>
              <dt className="muted">Herausgeber</dt><dd>{s.issuer}</dd>
              <dt className="muted">Version</dt><dd>{s.version}</dd>
              <dt className="muted">Datum</dt><dd>{s.date}</dd>
              <dt className="muted">Geltung</dt><dd>{s.scope}</dd>
              <dt className="muted">Art</dt><dd>{s.kind}</dd>
              <dt className="muted">Priorität</dt><dd>{s.priority}</dd>
              <dt className="muted">SHA-256</dt><dd className="break-all text-[12px] muted">{s.sha256}</dd>
            </dl>
          </Card>
        ))}
        <p className="text-xs muted">Datensatz {d.meta.datasetVersion}, erstellt {new Date(d.meta.generatedAt).toLocaleString('de-DE')}</p>
      </Page>
    </>
  )
}

export function About() {
  const d = useData()
  return (
    <>
      <PageHeader title="Über RESCUE GE" />
      <Page>
        <Card>
          <div className="text-xl font-extrabold">RESCUE <span className="accent">GE</span></div>
          <p className="mt-2 text-[15px]">Digitale Nachschlage- und Arbeitshilfe für den Rettungsdienst Gelsenkirchen. Inhalte stammen ausschließlich aus den hinterlegten Quellen und sind mit Seitenverweis und Prüfstatus gekennzeichnet.</p>
        </Card>
        <Card>
          <SectionTitle>Wichtige Hinweise</SectionTitle>
          <ul className="space-y-2 text-[15px]">
            <li>• {d.meta.disclaimer}</li>
            <li>• Medizinische Inhalte müssen vor produktivem Einsatz durch die Ärztliche Leitung Rettungsdienst geprüft und freigegeben werden.</li>
            <li>• Das Kompendium wurde aus einer Textfassung übernommen. Farben, Sterne und Flussdiagramme sind nicht visuell geprüft.</li>
            <li>• Der Medikamentenrechner ist eine technische Unterstützung und keine eigenständige medizinische Entscheidungsinstanz.</li>
            <li>• Die Klinikübersicht zeigt keine Aufnahmefähigkeit in Echtzeit.</li>
            <li>• Laut Leitbild des Kompendiums ist ein vertraulicher Umgang mit den Unterlagen selbstverständlich; die Inhalte sind verschlüsselt gespeichert.</li>
          </ul>
        </Card>
        <Card>
          <SectionTitle>Prüfstatus</SectionTitle>
          <ul className="space-y-1.5 text-[14.5px]">
            <li><b>Geprüft</b> – durch die Verantwortlichen bestätigt (derzeit kein Eintrag)</li>
            <li><b>Teilweise geprüft</b> – GE-Kennzeichnung im Text vorhanden, visuelle Prüfung ausstehend</li>
            <li><b>GE-Gültigkeit noch zu prüfen</b> – keine eindeutige GE-Kennzeichnung</li>
            <li><b>Unvollständige Quelle</b> – Angaben fehlen oder nur als Grafik vorhanden</li>
            <li><b>Widersprüchliche Quellen</b> – Angaben widersprechen sich, Klärung erforderlich</li>
            <li><b>Veraltet</b> – durch neuere Version ersetzt</li>
          </ul>
        </Card>
        <Disclaimer />
      </Page>
    </>
  )
}
