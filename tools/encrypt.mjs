// Verschlüsselt data/dataset.json -> public/data.enc (gzip + PBKDF2-SHA256 + AES-256-GCM)
// Aufruf: RESCUE_GE_PASSPHRASE='...' node tools/encrypt.mjs   (oder: node tools/encrypt.mjs --ask)
import { readFileSync, writeFileSync } from 'node:fs'
import { webcrypto as crypto } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { createInterface } from 'node:readline/promises'

const ITER = 600_000
let pass = process.env.RESCUE_GE_PASSPHRASE
if (!pass && process.argv.includes('--ask')) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  pass = await rl.question('Passwort für RESCUE GE: '); rl.close()
}
if (!pass || pass.length < 12) { console.error('Passwort fehlt oder ist kürzer als 12 Zeichen (RESCUE_GE_PASSPHRASE).'); process.exit(1) }

const plain = gzipSync(readFileSync(new URL('../data/dataset.json', import.meta.url)), { level: 9 })
const salt = crypto.getRandomValues(new Uint8Array(16))
const iv = crypto.getRandomValues(new Uint8Array(12))
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass.normalize('NFC')), 'PBKDF2', false, ['deriveKey'])
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt'])
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain))
const b64 = u => Buffer.from(u).toString('base64')
const out = { v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct), createdAt: new Date().toISOString() }
writeFileSync(new URL('../public/data.enc', import.meta.url), JSON.stringify(out))
console.log(`public/data.enc geschrieben (${Math.round(JSON.stringify(out).length / 1024)} KB, ${ITER} Iterationen)`)
