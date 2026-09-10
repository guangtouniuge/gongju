import { AsyncLocalStorage } from 'node:async_hooks'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, relative, isAbsolute } from 'node:path'

const context = new AsyncLocalStorage()
const roles = new Set(['super_admin', 'agent', 'project_admin', 'project_operator'])
export const stateKeys = new Set(['projectRows', 'articleRows', 'taskRows', 'keywordRows', 'keywordLibraryRows', 'questionRows', 'knowledgeRows', 'knowledgeContentRows', 'galleryRows', 'industrySceneRows', 'rankingCandidateRows', 'confirmedArticlePlans', 'distributionTasks', 'diagnosisCreated', 'activeBrand', 'activeKeyword', 'activeBatchId'].map(key => `geo.${key}`))

export function scopeError(message, status = 403) {
  return Object.assign(new Error(message), { status })
}

function identifier(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw scopeError('项目或账户标识无效')
  return value
}

// Temporary integration boundary: replace with the authenticated session principal.
// The reverse proxy MUST strip client x-geo-* headers before supplying trusted ones.
export function resolveCurrentUser(req) {
  if (!Object.keys(req.headers).some(key => key.startsWith('x-geo-')) && process.env.GEO_ALLOW_LEGACY_ANONYMOUS !== 'false') return null
  const role = req.headers['x-geo-role']
  if (!roles.has(role)) throw scopeError('请先登录项目账户', 401)
  return {
    userId: identifier(req.headers['x-geo-user-id']), role,
    agentId: req.headers['x-geo-agent-id'] ? identifier(req.headers['x-geo-agent-id']) : '',
    projectId: req.headers['x-geo-project-id'] ? identifier(req.headers['x-geo-project-id']) : '',
    isSuperAdmin: role === 'super_admin',
  }
}

// Server-managed registry. Never accept an agent/project relationship from a body.
export function listProjectAccounts() {
  const path = resolve(process.cwd(), 'outputs/data/project-accounts.json')
  if (!existsSync(path)) return []
  const rows = JSON.parse(readFileSync(path, 'utf8'))
  if (!Array.isArray(rows)) throw scopeError('项目账户注册表无效', 503)
  return rows
}

export function visibleProjectAccounts(user) {
  return listProjectAccounts().filter(row => user.isSuperAdmin || (user.role === 'agent' ? row.agentId === user.agentId : row.projectId === user.projectId))
}

export function resolveProjectScope(user) {
  if (!user) return { projectId: 'legacy', agentId: '', ownerUserId: '', legacy: true }
  const projectId = identifier(user.projectId)
  const project = listProjectAccounts().find(row => row.projectId === projectId)
  if (!project && process.env.GEO_ALLOW_UNREGISTERED_AUTH_PROJECT !== 'false') {
    return { currentUser: user, projectId, agentId: user.agentId || '', ownerUserId: user.userId }
  }
  if (!project || (!user.isSuperAdmin && (user.role === 'agent' ? !user.agentId || project.agentId !== user.agentId : project.projectId !== user.projectId))) {
    throw scopeError('无权访问此项目')
  }
  return { currentUser: user, projectId, agentId: project.agentId || '', ownerUserId: user.userId }
}

export function runInProjectScope(scope, callback) { return context.run(scope, callback) }
export function currentProjectScope() {
  const scope = context.getStore()
  if (!scope) throw scopeError('缺少项目上下文')
  return scope
}
export function projectDirectory(kind = 'data') {
  if (!['data', 'uploads', 'exports'].includes(kind)) throw scopeError('目录类型无效')
  const scope = currentProjectScope()
  return scope.legacy ? resolve(process.cwd(), 'outputs', kind) : resolve(process.cwd(), 'outputs', 'projects', scope.projectId, kind)
}
export function assertProjectFile(path, kind = 'uploads') {
  const root = projectDirectory(kind)
  const target = resolve(path)
  const rel = relative(root, target)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw scopeError('无权访问此项目文件')
  return target
}
export function assertStateKey(key) {
  if (!stateKeys.has(key)) throw scopeError('此状态键不属于内容生产项目', 400)
}
export function assertGalleryReference(src) {
  if (!src.startsWith('/api/gallery/file?')) throw scopeError('图片必须来自当前项目图库')
  const file = new URL(src, 'http://local').searchParams.get('file')
  if (!file) throw scopeError('缺少图片路径', 400)
  return assertProjectFile(file)
}
export function stampOwnedRows(key, value) {
  assertStateKey(key)
  if (currentProjectScope().legacy) return value
  if (!Array.isArray(value)) {
    if (key === 'geo.diagnosisCreated' && typeof value === 'number') return value
    if (!['geo.activeBrand', 'geo.activeKeyword', 'geo.activeBatchId'].includes(key) || typeof value !== 'string') throw scopeError('状态格式无效', 400)
    return value
  }
  const { projectId, agentId, ownerUserId } = currentProjectScope()
  return value.map(row => {
    if (['geo.confirmedArticlePlans', 'geo.distributionTasks'].includes(key) && typeof row === 'string') return row
    if (Array.isArray(row)) {
      if (key === 'geo.galleryRows' && row[5]) assertGalleryReference(row[5])
      return row // Legacy tuples are owned by the enclosing project namespace.
    }
    if (!row || typeof row !== 'object') throw scopeError('资料格式无效', 400)
    if (row.projectId && row.projectId !== projectId) throw scopeError('不能写入其他项目的资料')
    if (key === 'geo.articleRows') {
      for (const match of String(row.body || '').matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) assertGalleryReference(match[1])
      for (const src of row.imagePaths || []) assertGalleryReference(src)
    }
    return { ...row, projectId, agentId, ownerUserId }
  })
}

export function validateGenerationScope(body, readState) {
  if (currentProjectScope().legacy) return body
  const { projectId } = currentProjectScope()
  if (body.projectId && body.projectId !== projectId) throw scopeError('不能调用其他项目生成文章')
  const project = (readState('geo.projectRows') || []).find(row => row.name === body.project?.name)
  if (!project) throw scopeError('请先在当前项目创建品牌', 400)
  if (body.project?.projectId && body.project.projectId !== projectId) throw scopeError('品牌项目不匹配')
  // Preserve writing options; replace source material with this project's stored records.
  const name = project.name
  const rows = key => (readState(key) || []).filter(row => row[0] === name)
  const core = body.packet?.coreKeyword || project.coreKeyword
  const keywords = rows('geo.keywordRows').map(row => row[1])
  if (!core || ![...keywords, project.coreKeyword].includes(core)) throw scopeError('核心词不属于当前品牌', 400)
  const knowledge = rows('geo.knowledgeContentRows')
  const candidates = rows('geo.rankingCandidateRows').filter(row => row[6] !== '是')
  const allowedCandidateText = candidates.slice(0, 4).map(row => {
    const details = [row[2]?.trim(), row[3]?.trim() ? `适合${row[3].trim()}` : '', row[4]?.trim() ? `优势${row[4].trim()}` : '', row[5]?.trim() ? `核验${row[5].trim()}` : ''].filter(Boolean)
    return details.length ? `${row[1]}：${details.join('；')}` : row[1]
  }).join('\n')
  const packet = {
    ...body.packet, project, coreKeyword: core,
    keywords: [core, ...rows('geo.keywordLibraryRows').filter(row => row[1] === core).map(row => row[2])],
    questions: rows('geo.questionRows').filter(row => row.length >= 5 && row[1] === core).map(row => row[2]),
    brandAssets: knowledge.map(row => `${row[2]}：${row[3]}`),
    authorityEvidence: knowledge.map(row => `${row[2]}：${row[4]}`),
    galleries: rows('geo.galleryRows').map(row => `${row[1]}（${row[2]}，${row[3]}${row[5] ? `，文件：${row[5]}` : ''}）`),
    providerList: allowedCandidateText,
    rankingCompanies: [
      { rank: 1, name: project.brand || project.name, shortName: project.recommendWord || project.brand },
      ...candidates.slice(0, 4).map((row, index) => ({ rank: index + 2, name: row[1], note: [row[2], row[3], row[4], row[5]].filter(Boolean).join('；') })),
    ],
  }
  return { ...body, project, packet, task: { ...body.task, providerList: allowedCandidateText }, projectId }
}
