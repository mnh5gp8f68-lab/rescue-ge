import type { SearchGroup } from '../lib/search'
import { hrefOf } from '../lib/store'
import { List, ListLink, SectionTitle } from './ui'

export function SearchResults({ groups, query }: { groups: SearchGroup[]; query: string }) {
  if (query.trim().length < 2) return null
  if (!groups.length) return <p className="muted px-1">Keine Treffer für „{query}“.</p>
  return (
    <div className="space-y-4">
      {groups.map(g => (
        <div key={g.kind}>
          <SectionTitle>{g.label}</SectionTitle>
          <List>{g.hits.map(h => <ListLink key={h.kind + h.id} to={hrefOf(h.kind, h.id)} title={h.title} subtitle={h.subtitle} />)}</List>
        </div>
      ))}
    </div>
  )
}
