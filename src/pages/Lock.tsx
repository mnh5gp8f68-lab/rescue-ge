import { useState, type FormEvent } from 'react'
import { useApp } from '../lib/store'
import { IconLock } from '../components/Icons'
import { Disclaimer } from '../components/ui'

export default function LockScreen() {
  const { unlock, loading, error } = useApp()
  const [pass, setPass] = useState('')
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [wrong, setWrong] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!pass || busy) return
    setBusy(true); setWrong(false)
    const ok = await unlock(pass, remember)
    setBusy(false)
    if (!ok) { setWrong(true); setPass('') }
  }

  return (
    <main className="min-h-dvh flex flex-col justify-center px-6 safe-top safe-bottom max-w-md mx-auto">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          <IconLock size={40} />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">RESCUE GE</h1>
        <p className="muted mt-1">Rettungsdienst Gelsenkirchen · Nachschlagehilfe</p>
      </div>

      {loading ? (
        <p className="text-center muted">Daten werden geladen …</p>
      ) : error ? (
        <div className="danger p-4 text-[15px]" role="alert">
          <div className="font-bold mb-1">Datendatei nicht verfügbar</div>
          Die verschlüsselte Datendatei konnte nicht geladen werden ({error}). Bitte einmal mit Internetverbindung öffnen.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <input type="password" className="input text-center" placeholder="Passwort" autoComplete="current-password"
            value={pass} onChange={e => { setPass(e.target.value); setWrong(false) }} autoFocus aria-label="Passwort" />
          {wrong && <div className="danger p-3 text-center text-[15px]" role="alert">Passwort falsch. Bitte erneut versuchen.</div>}
          <label className="flex items-center gap-3 min-h-[48px] text-[15px]">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="w-5 h-5 accent-blue-500" />
            Auf diesem Gerät entsperrt bleiben
          </label>
          <button type="submit" className="btn btn-primary w-full text-[17px]" disabled={busy || !pass}>
            {busy ? 'Entschlüssele …' : 'Entsperren'}
          </button>
        </form>
      )}
      <div className="mt-10 text-center"><Disclaimer /></div>
    </main>
  )
}
