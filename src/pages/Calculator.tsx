import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../lib/store'
import { calculate, fmt, parseWeight } from '../lib/calc'
import { Banner, Card, Collapsible, EmptyNote, FavoriteButton, GeBadge, NO_DATA, Page, PageHeader, SectionTitle, StatusBadge, useRecent } from '../components/ui'
import type { CalcRule } from '../types'

const DISCLAIMER = 'Technische Unterstützung, keine eigenständige medizinische Entscheidungsinstanz.'

function maxText(r: CalcRule): string {
  if (r.maxDoseLabel) return r.maxDoseLabel
  const parts: string[] = []
  if (r.maxDose != null) parts.push(`${fmt(r.maxDose)} ${r.unit ?? 'mg'}`)
  if (r.maxDosePerKg != null) parts.push(`${fmt(r.maxDosePerKg, 4)} ${r.unit ?? 'mg'}/kgKG`)
  return parts.length ? parts.join(' / ') : NO_DATA
}

export default function Calculator() {
  const { id } = useParams()
  const nav = useNavigate()
  const d = useData()
  const rule = d.calcRules.find(r => r.id === id)
  const medsWithRules = useMemo(() => {
    const ids = [...new Set(d.calcRules.map(r => r.med))]
    return ids.map(i => d.medications.find(m => m.id === i)).filter(Boolean).sort((a, b) => a!.name.localeCompare(b!.name, 'de')) as typeof d.medications
  }, [d])
  const [medId, setMedId] = useState<string>(rule?.med ?? '')
  const [weight, setWeight] = useState('')
  const [concIdx, setConcIdx] = useState<number | null>(null)

  useEffect(() => { if (rule) setMedId(rule.med) }, [rule])
  useEffect(() => { setConcIdx(rule && (rule.concentrations?.length ?? 0) === 1 ? 0 : null) }, [rule])
  const med = d.medications.find(m => m.id === medId)
  useRecent('calc', rule?.id, rule ? `Rechner: ${med?.name ?? ''} – ${rule.label}` : undefined)
  const rulesForMed = d.calcRules.filter(r => r.med === medId)

  const w = parseWeight(weight)
  const concs = rule?.concentrations ?? []
  const needConc = concs.length > 1 && concIdx == null
  const res = rule && weight.trim() !== '' && !needConc ? calculate(rule, w, concIdx ?? 0) : null
  const lockedRes = rule ? calculate(rule, null) : null   // prüft Sperre unabhängig vom Gewicht
  const blocked = lockedRes?.blocked ?? res?.blocked

  return (
    <>
      <PageHeader title="Medikamentenrechner" subtitle="Gewichtsabhängige Dosierung"
        right={rule ? <FavoriteButton kind="calc" id={rule.id} title={`Rechner: ${med?.name ?? ''} – ${rule.label}`} /> : undefined} />
      <Page>
        <Banner kind="info">{DISCLAIMER} Ersetzt weder die Prüfung der lokalen Vorgaben noch die fachliche Kontrolle.</Banner>

        <Card>
          <label className="block text-[13px] font-bold muted mb-1.5" htmlFor="med">1 · Medikament</label>
          <select id="med" className="input" value={medId} onChange={e => { setMedId(e.target.value); nav('/rechner', { replace: true }) }}>
            <option value="">Bitte wählen …</option>
            {medsWithRules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

          {medId && (
            <div className="mt-4">
              <div className="text-[13px] font-bold muted mb-1.5">2 · Patientengruppe / Applikationsweg</div>
              <div className="space-y-2">
                {rulesForMed.map(r => (
                  <button key={r.id} onClick={() => nav(`/rechner/${r.id}`, { replace: true })}
                    className={`w-full text-left card2 px-3 py-2.5 min-h-[56px] border-2 ${r.id === rule?.id ? 'border-[var(--accent)]' : 'border-transparent'}`}>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 font-semibold text-[15.5px] leading-snug">{r.label}</span>
                      {r.locked ? <span className="text-xs font-bold text-red-400 shrink-0">gesperrt</span> : <GeBadge ge={r.ge} small />}
                    </div>
                    <div className="text-[13px] muted">{r.population} · {r.route}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {rule && blocked && (
          <Banner kind="danger" title="Keine Berechnung">{blocked}</Banner>
        )}

        {rule && !lockedRes?.blocked && (
          <Card>
            <label className="block text-[13px] font-bold muted mb-1.5" htmlFor="w">3 · Körpergewicht{rule.weightLabel ? ` (${rule.weightLabel})` : ''}</label>
            <div className="relative">
              <input id="w" className="input text-[24px] font-bold pr-14" inputMode="decimal" placeholder="z. B. 20" value={weight}
                onChange={e => setWeight(e.target.value.replace(/[^\d.,]/g, ''))} autoComplete="off" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 muted font-semibold">kg</span>
            </div>
            {concs.length > 1 && (
              <div className="mt-4">
                <div className="text-[13px] font-bold muted mb-1.5">4 · Konzentration – unterschiedliche Konzentrationen verfügbar!</div>
                <div className="space-y-2">
                  {concs.map((c, i) => (
                    <button key={i} onClick={() => setConcIdx(i)} className={`w-full text-left card2 px-3 min-h-[52px] border-2 font-semibold ${concIdx === i ? 'border-[var(--accent)]' : 'border-transparent'}`}>
                      {concIdx === i ? '● ' : '○ '}{c.label}
                    </button>
                  ))}
                </div>
                {needConc && <p className="text-[14px] mt-2 text-amber-400 font-semibold">Bitte die verwendete Konzentration auswählen.</p>}
              </div>
            )}
            {concs.length === 1 && <p className="mt-3 text-[14px]"><span className="muted">Konzentration: </span><b>{concs[0].label}</b></p>}
            {concs.length === 0 && rule.unit !== 'ml' && <p className="mt-3 text-[14px] muted">Konzentration: {NO_DATA}</p>}
          </Card>
        )}

        {res && !blocked && res.errors.length > 0 && <Banner kind="danger" title="Eingabe prüfen">{res.errors.join(' ')}</Banner>}

        {res && res.ok && !blocked && rule && (
          <>
            <section className="card p-5 border-2" style={{ borderColor: 'var(--accent)' }} aria-live="polite">
              <div className="text-[13px] font-bold muted uppercase tracking-wide">{rule.resultLabel ?? (res.fixed ? 'Festdosis' : 'Einzeldosis')}</div>
              <div className="text-[52px] leading-none font-extrabold mt-1 tabular-nums">{fmt(res.dose!)} <span className="text-[28px]">{res.unit}</span></div>
              {res.volumeMl != null && res.unit !== 'ml' && (
                <div className="text-[36px] leading-tight font-extrabold accent mt-2 tabular-nums">{fmt(res.volumeMl)} <span className="text-[22px]">ml</span></div>
              )}
              {res.capped && <div className="danger p-2.5 mt-3 font-bold text-[15px]">Auf Maximaldosis begrenzt ({fmt(res.maxApplied!)} {res.unit}).</div>}
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[15px] mt-4 pt-4 border-t hr">
                <dt className="muted">Medikament</dt><dd className="font-semibold">{med?.name} – {rule.label}</dd>
                <dt className="muted">Gewicht</dt><dd className="font-semibold">{fmt(w!)} kg{rule.weightLabel ? ` (${rule.weightLabel})` : ''}</dd>
                <dt className="muted">Dosierung</dt><dd className="font-semibold">{res.fixed ? rule.aboveMaxWeight?.text : `${fmt(rule.dosePerKg!, 4)} ${res.unit}/kgKG`} · {rule.route}</dd>
                <dt className="muted">Konzentration</dt><dd className="font-semibold">{res.concentration ? res.concentration.label : (rule.unit === 'ml' ? 'entfällt (Volumendosierung)' : NO_DATA)}</dd>
                <dt className="muted">Volumen</dt><dd className="font-semibold">{res.volumeMl != null ? `${fmt(res.volumeMl)} ml` : NO_DATA}</dd>
                <dt className="muted">Maximaldosis</dt><dd className="font-semibold">{maxText(rule)}</dd>
                <dt className="muted">Kompetenz GE</dt><dd><GeBadge ge={rule.ge} small /> <span className="text-xs muted">S. {rule.competencePage ?? '–'}</span></dd>
                <dt className="muted">Prüfstatus</dt><dd><StatusBadge status={rule.status} small /></dd>
              </dl>
            </section>
            {res.warnings.length > 0 && <Banner kind="warn" title="Hinweise">{res.warnings.map((x, i) => <div key={i}>{x}</div>)}</Banner>}
            <Card>
              <SectionTitle>Rechenweg</SectionTitle>
              <ol className="space-y-1 text-[15px] tabular-nums">{res.steps.map((s, i) => <li key={i}>{i + 1}. {s}</li>)}</ol>
              <p className="text-xs muted mt-3">Rundung: {d.meta.rounding}</p>
            </Card>
          </>
        )}

        {rule && (
          <>
            {(rule.notes?.length || rule.dilutionNote) && (
              <Card>
                <SectionTitle>Hinweise zur Anwendung</SectionTitle>
                <ul className="space-y-1.5 text-[15px]">{[...(rule.notes ?? []), ...(rule.dilutionNote ? [rule.dilutionNote] : [])].map((x, i) => <li key={i}>• {x}</li>)}</ul>
              </Card>
            )}
            {blocked && rule.warnings && rule.warnings.length > 0 && <Banner kind="warn">{rule.warnings.join(' ')}</Banner>}
            <Collapsible title="Quellenbelege (wörtliche Zitate)">
              <ul className="space-y-2 text-[14.5px]">{rule.quotes.map((q, i) => <li key={i} className="card2 p-2.5">„{q}“</li>)}</ul>
              <p className="text-[13px] muted mt-3">Gemeinsames Kompendium Rettungsdienst 2026 · Seiten {rule.pages.map(p => `S. ${p}`).join(', ')} · Kompetenzzeile S. {rule.competencePage ?? '–'}</p>
              {rule.competenceBox.length > 0 && <div className="pre muted mt-2">{rule.competenceBox.join('\n')}</div>}
            </Collapsible>
            {med && <Link to={`/medikamente/${med.id}`} className="btn w-full">Zur Medikamentenseite {med.name}</Link>}
          </>
        )}

        {!rule && (
          <>
            <Card>
              <SectionTitle>Alle Rechenregeln</SectionTitle>
              <div className="space-y-2">
                {d.calcRules.map(r => {
                  const m = d.medications.find(x => x.id === r.med)
                  return (
                    <Link key={r.id} to={`/rechner/${r.id}`} className="flex items-center gap-2 card2 px-3 min-h-[52px]">
                      <span className="flex-1 min-w-0"><span className="block font-semibold text-[15px]">{m?.name}</span><span className="block text-[13px] muted">{r.label}</span></span>
                      {r.locked ? <span className="text-xs font-bold text-red-400">gesperrt</span> : <GeBadge ge={r.ge} small />}
                    </Link>
                  )
                })}
              </div>
            </Card>
            <Card>
              <SectionTitle>Nicht freigeschaltet (kein GE-Feld)</SectionTitle>
              {d.calcOhneGE.length ? <ul className="space-y-2 text-[14.5px]">{d.calcOhneGE.map((x, i) => <li key={i} className="warn p-2.5">{x.text}</li>)}</ul> : <EmptyNote />}
            </Card>
          </>
        )}
        <p className="text-xs muted text-center">{DISCLAIMER}</p>
      </Page>
    </>
  )
}
