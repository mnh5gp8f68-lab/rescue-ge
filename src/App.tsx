import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useApp } from './lib/store'
import { IconClipboard, IconHome, IconHospital, IconMore, IconPill } from './components/Icons'
import LockScreen from './pages/Lock'
import Start from './pages/Start'
import SearchPage from './pages/Search'
import { MassnahmenList, SaaDetail, SaaList } from './pages/Saa'
import { MedDetail, MedList } from './pages/Medications'
import Calculator from './pages/Calculator'
import { KrankheitsbilderList, ReanimationHub, TopicDetail } from './pages/Topics'
import { HospitalDetail, HospitalList } from './pages/Hospitals'
import { LocalDetail, LocalList } from './pages/Local'
import { About, Favorites, Issues, More, SettingsPage, Sources } from './pages/Misc'

const TABS = [
  { to: '/', label: 'Start', icon: IconHome, end: true, match: (p: string) => p === '/' || p.startsWith('/suche') },
  { to: '/saa', label: 'SAA', icon: IconClipboard, match: (p: string) => p.startsWith('/saa') || p.startsWith('/massnahmen') },
  { to: '/medikamente', label: 'Medikamente', icon: IconPill, match: (p: string) => p.startsWith('/medikamente') || p.startsWith('/rechner') },
  { to: '/kliniken', label: 'Kliniken', icon: IconHospital, match: (p: string) => p.startsWith('/kliniken') },
  { to: '/mehr', label: 'Mehr', icon: IconMore, match: () => false },
]

function BottomNav() {
  const { pathname } = useLocation()
  const anyOther = !TABS.slice(0, 4).some(t => t.match(pathname))
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t hr safe-bottom" style={{ background: 'color-mix(in srgb, var(--bg) 92%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }} aria-label="Hauptnavigation">
      <div className="grid grid-cols-5 max-w-2xl mx-auto">
        {TABS.map(t => {
          const active = t.label === 'Mehr' ? anyOther : t.match(pathname)
          const I = t.icon
          return (
            <NavLink key={t.to} to={t.to} end={t.end} className={`flex flex-col items-center justify-center min-h-[60px] gap-0.5 text-[11px] font-semibold ${active ? 'accent' : 'muted'}`} aria-current={active ? 'page' : undefined}>
              <I size={25} /><span>{t.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function UpdateBanner() {
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null)
  useEffect(() => {
    const h = (e: Event) => setReg((e as CustomEvent<ServiceWorkerRegistration>).detail)
    window.addEventListener('rescue-ge-update', h); return () => window.removeEventListener('rescue-ge-update', h)
  }, [])
  if (!reg) return null
  const apply = () => {
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true })
    reg.waiting?.postMessage('skipWaiting')
  }
  return (
    <div className="fixed top-0 inset-x-0 z-40 safe-top">
      <div className="m-2 rounded-2xl p-3 flex items-center gap-3 text-sm" style={{ background: '#1d4ed8', color: '#fff' }}>
        <span className="flex-1">Neue Version / neue Daten verfügbar.</span>
        <button className="font-semibold underline min-h-[44px] px-2" onClick={apply}>Aktualisieren</button>
      </div>
    </div>
  )
}

export default function App() {
  const { locked } = useApp()
  if (locked) return <LockScreen />
  return (
    <>
      <ScrollTop />
      <UpdateBanner />
      <Routes>
        <Route path="/" element={<Start />} />
        <Route path="/suche" element={<SearchPage />} />
        <Route path="/saa" element={<SaaList />} />
        <Route path="/saa/:id" element={<SaaDetail />} />
        <Route path="/massnahmen" element={<MassnahmenList />} />
        <Route path="/medikamente" element={<MedList />} />
        <Route path="/medikamente/:id" element={<MedDetail />} />
        <Route path="/rechner" element={<Calculator />} />
        <Route path="/rechner/:id" element={<Calculator />} />
        <Route path="/krankheitsbilder" element={<KrankheitsbilderList />} />
        <Route path="/thema/:id" element={<TopicDetail />} />
        <Route path="/reanimation" element={<ReanimationHub />} />
        <Route path="/kliniken" element={<HospitalList />} />
        <Route path="/kliniken/:id" element={<HospitalDetail />} />
        <Route path="/lokal" element={<LocalList />} />
        <Route path="/lokal/:id" element={<LocalDetail />} />
        <Route path="/favoriten" element={<Favorites />} />
        <Route path="/einstellungen" element={<SettingsPage />} />
        <Route path="/offene-fragen" element={<Issues />} />
        <Route path="/quellen" element={<Sources />} />
        <Route path="/mehr" element={<More />} />
        <Route path="/ueber" element={<About />} />
        <Route path="*" element={<Start />} />
      </Routes>
      <BottomNav />
    </>
  )
}
