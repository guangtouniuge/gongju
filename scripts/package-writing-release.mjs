import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { verifyWritingRelease } from '../server/writing-release.mjs'

const release = verifyWritingRelease()
const manifest = JSON.parse(fs.readFileSync('server/writing-release.json', 'utf8'))
const target = `deploy/writing-engine-${release.version}.zip`
const entries = [
  ...Object.keys(manifest.files).map(file => `server/${file}`),
  'server/writing-release.json', 'server/writing-engine.test.mjs', 'server/skill-editor.test.mjs',
  'server/batch-editor.test.mjs', 'server/article-format.mjs', 'server/article-format.test.mjs', 'server/job-journal.test.mjs',
  'scripts/seal-writing-release.mjs',
  'docs/writing-engine-release.md',
]
// Explicit allowlist excludes environment files, databases and private project facts.
const stage = `.tmp/writing-engine-package-${release.version}`
for (const entry of entries) {
  fs.mkdirSync(`${stage}/${entry.slice(0, entry.lastIndexOf('/'))}`, { recursive: true })
  fs.copyFileSync(entry, `${stage}/${entry}`)
}
fs.writeFileSync(`${stage}/package.json`, JSON.stringify({
  name: 'niuge-geo-writing-engine', version: release.version, private: true, type: 'module',
  engines: { node: '>=20' },
  scripts: { test: 'node --test server/*.test.mjs', verify: 'node --input-type=module -e "import(\'./server/writing-engine.mjs\').then(m=>console.log(m.writingRelease))"' },
  dependencies: { marked: '18.0.12', 'sanitize-html': '2.17.7' },
}, null, 2))
execFileSync('tar', ['-a', '-cf', target, '-C', stage, ...entries, 'package.json', ...(fs.existsSync(`${stage}/package-lock.json`) ? ['package-lock.json'] : [])], { stdio: 'inherit' })
console.log(target)
