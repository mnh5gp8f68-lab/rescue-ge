// Inline-SVG-Icons (offline, keine externen Bibliotheken)
import type { ReactNode } from 'react'

const S = ({ children, size = 24, className = '' }: { children: ReactNode; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}
    strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{children}</svg>
)
type P = { size?: number; className?: string }

export const IconHome = (p: P) => <S {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></S>
export const IconClipboard = (p: P) => <S {...p}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9z" /><path d="M9 12h6M9 16h4" /></S>
export const IconPill = (p: P) => <S {...p}><rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)" /><path d="m8.5 8.5 7 7" /></S>
export const IconHospital = (p: P) => <S {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M12 7v6M9 10h6" /><path d="M10 21v-4h4v4" /></S>
export const IconMore = (p: P) => <S {...p}><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></S>
export const IconSearch = (p: P) => <S {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></S>
export const IconBack = (p: P) => <S {...p}><path d="M15 5 8 12l7 7" /></S>
export const IconChevron = (p: P) => <S {...p}><path d="m9 5 7 7-7 7" /></S>
export const IconStar = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round" className={p.className} aria-hidden="true">
    <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.8z" />
  </svg>
)
export const IconHeart = (p: P) => <S {...p}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /><path d="M8 11h2l1-2 2 4 1-2h2" /></S>
export const IconCalc = (p: P) => <S {...p}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8" /><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" /></S>
export const IconBook = (p: P) => <S {...p}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5M8 7h7" /></S>
export const IconPin = (p: P) => <S {...p}><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" /><circle cx="12" cy="10" r="2.3" /></S>
export const IconPhone = (p: P) => <S {...p}><path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></S>
export const IconInfo = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></S>
export const IconWarn = (p: P) => <S {...p}><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17h.01" /></S>
export const IconLock = (p: P) => <S {...p}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></S>
export const IconSettings = (p: P) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></S>
export const IconQuestion = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01" /></S>
export const IconLayers = (p: P) => <S {...p}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></S>
export const IconActivity = (p: P) => <S {...p}><path d="M3 12h4l3-8 4 16 3-8h4" /></S>
export const IconMap = (p: P) => <S {...p}><path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></S>
export const IconClock = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>
export const IconBaby = (p: P) => <S {...p}><circle cx="12" cy="8" r="4" /><path d="M6 21a6 6 0 0 1 12 0" /></S>
