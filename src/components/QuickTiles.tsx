import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { IconActivity, IconBook, IconCalc, IconClipboard, IconHeart, IconHospital, IconPill } from './Icons'

export const QUICK: Record<string, { label: string; to: string; icon: ReactNode; tone: string }> = {
  reanimation: { label: 'Reanimation', to: '/reanimation', icon: <IconHeart size={28} />, tone: 'text-red-400' },
  medikamente: { label: 'Medikamente', to: '/medikamente', icon: <IconPill size={28} />, tone: 'text-sky-400' },
  rechner: { label: 'Rechner', to: '/rechner', icon: <IconCalc size={28} />, tone: 'text-emerald-400' },
  krankheitsbilder: { label: 'Krankheitsbilder', to: '/krankheitsbilder', icon: <IconActivity size={28} />, tone: 'text-violet-400' },
  saa: { label: 'SAA / Maßnahmen', to: '/massnahmen', icon: <IconClipboard size={28} />, tone: 'text-amber-400' },
  kliniken: { label: 'Kliniken', to: '/kliniken', icon: <IconHospital size={28} />, tone: 'text-teal-400' },
  lokal: { label: 'Lokales Wissen', to: '/lokal', icon: <IconBook size={28} />, tone: 'text-pink-400' },
}

export function QuickTiles({ keys }: { keys: string[] }) {
  const list = keys.filter(k => QUICK[k])
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {list.map(k => {
        const q = QUICK[k]
        return (
          <Link key={k} to={q.to} className="card flex flex-col items-center justify-center gap-1.5 min-h-[92px] p-2 text-center active:opacity-70">
            <span className={q.tone}>{q.icon}</span>
            <span className="text-[13.5px] font-semibold leading-tight">{q.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
