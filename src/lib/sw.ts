// Registriert den Service Worker (nur im Produktions-Build). Neue Versionen werden beim nächsten Start aktiv.
export function registerSW(): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('rescue-ge-update', { detail: reg }))
          }
        })
      })
    }).catch(() => { /* offline ohne SW: App läuft trotzdem, nur nicht installierbar-offline */ })
  })
}
