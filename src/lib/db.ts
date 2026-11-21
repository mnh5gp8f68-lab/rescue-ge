// Kleine IndexedDB-Hülle: Schlüssel (nicht exportierbarer CryptoKey), Favoriten, Verlauf, Einstellungen.
const DB = 'rescue-ge'; const STORE = 'kv'
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
  })
}
export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await open()
  return new Promise((res, rej) => { const t = db.transaction(STORE).objectStore(STORE).get(key); t.onsuccess = () => res(t.result as T); t.onerror = () => rej(t.error) })
}
export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await open()
  return new Promise((res, rej) => { const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).put(value, key); t.oncomplete = () => res(); t.onerror = () => rej(t.error) })
}
export async function idbDel(key: string): Promise<void> {
  const db = await open()
  return new Promise((res, rej) => { const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).delete(key); t.oncomplete = () => res(); t.onerror = () => rej(t.error) })
}
