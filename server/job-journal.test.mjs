import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { JobJournal } from './job-journal.mjs'

function setup(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'geo-journal-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  return new JobJournal(root)
}
test('journal survives reopening with plans, articles and checkpoint unchanged', t => {
  const journal = setup(t)
  const record = { version: '6', job: { id: 'JOB-test-1', status: 'running', completed: 1, articles: [{ id: 'saved' }] }, plans: [{ editorialBrief: { centralQuestion: 'original' } }] }
  journal.save(record)
  const reopened = new JobJournal(journal.root)
  assert.deepEqual(reopened.load(record.job.id), record)
  assert.equal(reopened.pending().length, 1)
  record.job.status = 'done'
  reopened.save(record)
  assert.equal(reopened.pending().length, 0)
  assert.equal(reopened.load(record.job.id).job.articles[0].id, 'saved')
  assert.equal(reopened.load('../../etc'), null)
})
test('same-project work is serialized, distinct projects remain independent', async t => {
  const journal = setup(t)
  const order = []
  const a = journal.exclusive('a', async () => { order.push('a1'); await new Promise(r => setTimeout(r, 50)); order.push('a2') })
  const b = journal.exclusive('a', async () => { order.push('a3') })
  const c = journal.exclusive('b', async () => { order.push('b') })
  await Promise.all([a, b, c])
  assert.ok(order.indexOf('a2') < order.indexOf('a3'))
  assert.ok(order.indexOf('b') < order.indexOf('a2'))
  assert.equal(fs.readdirSync(journal.root).length, 0)
})
test('exception releases project lock', async t => {
  const journal = setup(t)
  await assert.rejects(journal.exclusive('a', async () => { throw new Error('failed') }), /failed/)
  assert.equal(await journal.exclusive('a', async () => 42), 42)
})
