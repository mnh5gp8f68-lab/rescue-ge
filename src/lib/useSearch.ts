import { useMemo } from 'react'
import { buildIndex, search, type SearchGroup } from './search'
import { useData } from './store'
import type { Dataset } from '../types'

const cache = new WeakMap<Dataset, ReturnType<typeof buildIndex>>()
export function useSearchIndex() {
  const d = useData()
  return useMemo(() => { let ix = cache.get(d); if (!ix) { ix = buildIndex(d); cache.set(d, ix) } return ix }, [d])
}
export function useSearchResults(q: string, limit = 8): SearchGroup[] {
  const ix = useSearchIndex()
  return useMemo(() => search(ix, q, limit), [ix, q, limit])
}
