import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Dataset, ItemRef } from '../types'
import { decryptBundle, deriveKey, type EncBundle } from './crypto'
import { idbDel, idbGet, idbSet } from './db'

export interface Settings { theme: 'dark' | 'light'; quickAccess: string[]; rememberDevice: boolean }
const DEFAULT_SETTINGS: Settings = { theme: 'dark', quickAccess: ['reanimation', 'medikamente', 'rechner', 'krankheitsbilder', 'saa', 'kliniken'], rememberDevice: true }

interface Ctx {
  data: Dataset | null
  locked: boolean; loading: boolean; error: string | null; bundleDate: string | null
  unlock: (pass: string, remember: boolean) => Promise<boolean>
  lock: (forget?: boolean) => Promise<void>
  favorites: ItemRef[]; isFavorite: (kind: string, id: string) => boolean; toggleFavorite: (r: ItemRef) => void
  recents: ItemRef[]; addRecent: (r: ItemRef) => void; clearRecents: () => void
  settings: Settings; setSettings: (s: Partial<Settings>) => void
}
const C = createContext<Ctx | null>(null)
export const useApp = () => { const c = useContext(C); if (!c) throw new Error('AppProvider fehlt'); return c }
export const useData = () => { const d = useApp().data; if (!d) throw new Error('Daten gesperrt'); return d }

async function fetchBundle(): Promise<EncBundle> {
  const r = await fetch('./data.enc', { cache: 'no-cache' }).catch(() => null) ?? await caches.match('./data.enc')
  if (!r || !r.ok) throw new Error('Datendatei nicht erreichbar')
  return r.json()
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Dataset | null>(null)
  const [bundle, setBundle] = useState<EncBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [favorites, setFav] = useState<ItemRef[]>([])
  const [recents, setRec] = useState<ItemRef[]>([])
  const [settings, setSet] = useState<Settings>(DEFAULT_SETTINGS)

  useEffect(() => { (async () => {
    try {
      const [b, f, r, s] = await Promise.all([fetchBundle(), idbGet<ItemRef[]>('favorites'), idbGet<ItemRef[]>('recents'), idbGet<Settings>('settings')])
      setBundle(b); setFav(f ?? []); setRec(r ?? []); if (s) setSet({ ...DEFAULT_SETTINGS, ...s })
      const key = await idbGet<CryptoKey>('key')
      if (key) { try { setData(await decryptBundle<Dataset>(key, b)) } catch { await idbDel('key') } }
    } catch (e) { setError(String((e as Error).message ?? e)) }
    setLoading(false)
  })() }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light', settings.theme === 'light')
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', settings.theme === 'light' ? '#f4f6fb' : '#0b1220')
  }, [settings.theme])

  const unlock = useCallback(async (pass: string, remember: boolean) => {
    if (!bundle) return false
    try {
      const key = await deriveKey(pass, bundle, false)
      const d = await decryptBundle<Dataset>(key, bundle)
      if (remember) await idbSet('key', key); else await idbDel('key')
      setData(d); setError(null); return true
    } catch { return false }
  }, [bundle])

  const lock = useCallback(async (forget = true) => { if (forget) await idbDel('key'); setData(null) }, [])
  const isFavorite = useCallback((kind: string, id: string) => favorites.some(f => f.kind === kind && f.id === id), [favorites])
  const toggleFavorite = useCallback((r: ItemRef) => setFav(prev => {
    const n = prev.some(f => f.kind === r.kind && f.id === r.id) ? prev.filter(f => !(f.kind === r.kind && f.id === r.id)) : [r, ...prev]
    idbSet('favorites', n); return n
  }), [])
  const addRecent = useCallback((r: ItemRef) => setRec(prev => {
    const n = [r, ...prev.filter(f => !(f.kind === r.kind && f.id === r.id))].slice(0, 15)
    idbSet('recents', n); return n
  }), [])
  const clearRecents = useCallback(() => { setRec([]); idbSet('recents', []) }, [])
  const setSettings = useCallback((s: Partial<Settings>) => setSet(prev => { const n = { ...prev, ...s }; idbSet('settings', n); return n }), [])

  const v = useMemo<Ctx>(() => ({ data, locked: !data, loading, error, bundleDate: bundle?.createdAt ?? null, unlock, lock, favorites, isFavorite, toggleFavorite, recents, addRecent, clearRecents, settings, setSettings }),
    [data, loading, error, bundle, unlock, lock, favorites, isFavorite, toggleFavorite, recents, addRecent, clearRecents, settings, setSettings])
  return <C.Provider value={v}>{children}</C.Provider>
}

/** Pfad zur Detailansicht eines Eintrags */
export function hrefOf(kind: string, id: string): string {
  switch (kind) {
    case 'saa': return `/saa/${id}`
    case 'medication': return `/medikamente/${id}`
    case 'topic': return `/thema/${id}`
    case 'local': return `/lokal/${id}`
    case 'hospital': return `/kliniken/${id}`
    case 'calc': return `/rechner/${id}`
    default: return '/'
  }
}
