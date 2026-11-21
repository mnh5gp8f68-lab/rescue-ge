// Verschlüsselung der Inhaltsdaten: PBKDF2-SHA256 -> AES-256-GCM (WebCrypto).
// Format von data.enc (JSON): { v, kdf, iter, salt, iv, ct } – Base64-Felder.
export interface EncBundle { v: 1; kdf: 'PBKDF2-SHA256'; iter: number; salt: string; iv: string; ct: string; createdAt?: string }

const b64d = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0))

export async function deriveKey(passphrase: string, bundle: EncBundle, extractable = false): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase.normalize('NFC')), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: b64d(bundle.salt), iterations: bundle.iter },
    base, { name: 'AES-GCM', length: 256 }, extractable, ['decrypt'])
}

export async function decryptBundle<T>(key: CryptoKey, bundle: EncBundle): Promise<T> {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(bundle.iv) }, key, b64d(bundle.ct))
  let bytes = new Uint8Array(plain)
  // gzip-komprimiert (Magic 1f 8b)
  if (bytes[0] === 0x1f && bytes[1] === 0x8b && 'DecompressionStream' in globalThis) {
    const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    bytes = new Uint8Array(await new Response(ds).arrayBuffer())
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as T
}
