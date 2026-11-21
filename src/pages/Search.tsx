import { useSearchParams } from 'react-router-dom'
import { Page, PageHeader, SearchField } from '../components/ui'
import { SearchResults } from '../components/SearchResults'
import { useSearchResults } from '../lib/useSearch'

const EXAMPLES = ['ACS', 'Schlaganfall', 'Anaphylaxie', 'Midazolam', 'Esketamin', 'i.v.-Zugang', 'Reanimation Kind', 'Psychiatrie']

export default function SearchPage() {
  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') ?? ''
  const groups = useSearchResults(q, 15)
  return (
    <>
      <PageHeader title="Suche" subtitle="Alle Bereiche, offline" />
      <Page>
        <SearchField value={q} onChange={v => setSp(v ? { q: v } : {}, { replace: true })} placeholder="Krankheitsbild, Medikament, Maßnahme, Klinik …" autoFocus />
        {q.trim().length < 2 && (
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map(e => <button key={e} className="btn text-[14px] min-h-[40px]" onClick={() => setSp({ q: e }, { replace: true })}>{e}</button>)}
          </div>
        )}
        <SearchResults groups={groups} query={q} />
      </Page>
    </>
  )
}
