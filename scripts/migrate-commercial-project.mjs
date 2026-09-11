import fs from 'node:fs'
import path from 'node:path'
import { stateKeys } from '../server/project-scope.mjs'

const root = process.cwd()
const id = process.argv[2]
const owner = process.argv[3]
if (!/^[a-z0-9-]+$/.test(id || '') || !owner) throw new Error('Explicit project and owner required')
const source = path.join(root, 'outputs/data/app-state.json')
const target = path.join(root, 'outputs/projects', id)
const file = path.join(target, 'data/app-state.json')
if (fs.existsSync(file)) throw new Error('Target already exists; refusing to overwrite project data')
const original = JSON.parse(fs.readFileSync(source, 'utf8'))
const oldImages = path.join(root, 'outputs/uploads')
const newImages = path.join(target, 'uploads')
function rewrite(value) {
  if (typeof value === 'string') return value.split(oldImages).join(newImages).split(encodeURIComponent(oldImages)).join(encodeURIComponent(newImages))
  if (Array.isArray(value)) return value.map(rewrite)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, rewrite(val)]))
  return value
}
const migrated = {}
for (const [key, value] of Object.entries(original)) {
  if (!stateKeys.has(key)) continue
  migrated[key] = rewrite(value)
  if (Array.isArray(migrated[key])) migrated[key] = migrated[key].map(row => row && !Array.isArray(row) && typeof row === 'object' ? { ...row, projectId: id, agentId: '', ownerUserId: owner } : row)
}
fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
if (fs.existsSync(oldImages)) fs.cpSync(oldImages, newImages, { recursive: true })
const exports = path.join(root, 'outputs/exports')
if (fs.existsSync(exports)) fs.cpSync(exports, path.join(target, 'exports'), { recursive: true })
fs.writeFileSync(file, JSON.stringify(migrated, null, 2), { mode: 0o600 })
for (const key of ['geo.projectRows', 'geo.articleRows', 'geo.galleryRows', 'geo.knowledgeContentRows']) {
  if ((original[key] || []).length !== (migrated[key] || []).length) throw new Error(`Migration count mismatch: ${key}`)
}
console.log(JSON.stringify({ projectId: id, counts: Object.fromEntries(['geo.projectRows', 'geo.articleRows', 'geo.galleryRows', 'geo.knowledgeContentRows'].map(key => [key, (migrated[key] || []).length])) }))
