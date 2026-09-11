import fs from 'node:fs'
import { contentHash } from '../server/writing-release.mjs'
const version = process.argv[2]
if (!/^\d+\.\d+\.\d+$/.test(version || '')) throw new Error('Pass an explicit release version')
const paths = ['writing-engine.mjs', 'writing-release.mjs', 'skill-editor.mjs', 'batch-editor.mjs', 'job-journal.mjs', 'skills/niuge-geo-skill/SKILL.md', ...fs.readdirSync('server/skills/niuge-geo-skill/references').filter(p => p.endsWith('.md')).sort().map(p => `skills/niuge-geo-skill/references/${p}`)]
const files = Object.fromEntries(paths.map(path => [path, contentHash(fs.readFileSync(`server/${path}`, 'utf8'))]))
const target = 'server/writing-release.json'
if (fs.existsSync(target)) {
  const old = JSON.parse(fs.readFileSync(target, 'utf8'))
  if (old.version === version && JSON.stringify(old.files) !== JSON.stringify(files)) throw new Error('Sealed version changed: use a new release version')
}
fs.writeFileSync(target, JSON.stringify({ version, files }, null, 2) + '\n')
console.log(`Sealed writing engine ${version}: ${paths.length} files`)
