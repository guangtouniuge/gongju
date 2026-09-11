import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const contentHash = text => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex')

export function verifyWritingRelease(root = new URL('./', import.meta.url)) {
  const manifest = JSON.parse(readFileSync(new URL('writing-release.json', root), 'utf8'))
  for (const [path, expected] of Object.entries(manifest.files)) {
    if (!/^[\w./-]+$/.test(path) || path.includes('..')) throw new Error('Invalid release file path')
    const actual = contentHash(readFileSync(new URL(path, root), 'utf8'))
    if (actual !== expected) throw new Error(`Writing release ${manifest.version} integrity mismatch: ${path}`)
  }
  return Object.freeze({ version: manifest.version, digest: contentHash(JSON.stringify(manifest.files)) })
}
