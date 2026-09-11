import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createHash, randomUUID } from 'node:crypto'

const hash = value => createHash('sha256').update(value).digest('hex')
export class JobJournal {
  constructor(root = process.env.GEO_JOB_DIR || path.join(os.homedir(), '.geoskill', 'jobs')) {
    this.root = root
    fs.mkdirSync(root, { recursive: true, mode: 0o700 })
  }
  file(id) {
    if (!/^JOB-[a-z0-9-]+$/i.test(id)) throw new Error('Invalid job identifier')
    return path.join(this.root, `${id}.json`)
  }
  save(record) {
    const file = this.file(record.job.id)
    const temporary = `${file}.${randomUUID()}.tmp`
    const fd = fs.openSync(temporary, 'wx', 0o600)
    try { fs.writeFileSync(fd, JSON.stringify(record)); fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
    fs.renameSync(temporary, file)
  }
  load(id) {
    if (!/^JOB-[a-z0-9-]+$/i.test(id)) return null
    const file = this.file(id)
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null
  }
  pending() {
    return fs.readdirSync(this.root).filter(name => /^JOB-.*\.json$/.test(name)).map(name => this.load(name.slice(0, -5))).filter(record => ['queued', 'running'].includes(record.job.status))
  }
  async exclusive(scope, action) {
    const lock = path.join(this.root, `${hash(scope)}.lock`)
    for (;;) {
      const claim = `${lock}.${randomUUID()}`
      try {
        fs.writeFileSync(claim, JSON.stringify({ pid: process.pid }), { flag: 'wx', mode: 0o600 })
        fs.linkSync(claim, lock)
        break
      } catch (error) {
        if (error.code !== 'EEXIST') throw error
        let owner
        try { owner = JSON.parse(fs.readFileSync(lock, 'utf8')) } catch (readError) {
          if (readError.code === 'ENOENT') continue
          // An owner may be between creating and filling the lock file.
          await new Promise(resolve => setTimeout(resolve, 100)); continue
        }
        try { process.kill(owner.pid, 0) } catch (probe) {
          if (probe.code === 'ESRCH') { try { fs.unlinkSync(lock) } catch {} ; continue }
        }
        await new Promise(resolve => setTimeout(resolve, 200))
      } finally { try { fs.unlinkSync(claim) } catch {} }
    }
    try { return await action() } finally { fs.unlinkSync(lock) }
  }
}
