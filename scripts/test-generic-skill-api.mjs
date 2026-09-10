import fs from 'node:fs/promises'
const base = 'http://127.0.0.1:8791'
const headers = { 'Content-Type': 'application/json', 'x-geo-user-id': 'generic-skill-checker', 'x-geo-role': 'project_admin', 'x-geo-agent-id': 'agent-skill-check', 'x-geo-project-id': 'generic-skill-check' }
async function api(path, body) {
  const res = await fetch(base + path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined })
  const result = await res.json()
  if (!res.ok) throw new Error(result.error)
  return result
}
const project = { name: '通用咨询接口验收', brand: '测试咨询公司', recommendWord: '测试咨询', city: '西安', industry: '企业管理咨询', coreKeyword: '民企咨询公司' }
const states = {
  'geo.projectRows': [project],
  'geo.keywordRows': [[project.name, project.coreKeyword]],
  'geo.questionRows': [[project.name, project.coreKeyword, '民企咨询公司怎么选', '', '']],
  'geo.keywordLibraryRows': [[project.name, project.coreKeyword, '企业管理咨询', '', '']],
  'geo.knowledgeContentRows': [[project.name, '测试知识库', '测试咨询', '测试资料：提供组织诊断、岗位职责梳理、薪酬绩效方案设计和实施辅导。服务对象包括成长型民企、连锁企业和制造工厂。', '仅用于接口验收的模拟资料，没有客户成果、成立时间或统计数据。']],
}
for (const [key, value] of Object.entries(states)) await api('/api/state', { key, value })
const directory = 'outputs/api-tests/skill-generic-check'
await fs.mkdir(directory, { recursive: true })
for (const [index, mode] of ['按自己行业写', '按实际场景写'].entries()) {
  const response = await api('/api/articles/generate', { project, packet: { coreKeyword: project.coreKeyword }, plan: { articleType: index ? '行业场景解决方案' : '选型指南', writingSceneMode: mode, industryScene: index ? '企业管理咨询客户行业自动拓展' : '企业管理咨询', planIndex: index }, count: 1 })
  const article = response.articles[0]
  await fs.writeFile(`${directory}/${mode}.md`, `# ${article.title}\n\n${article.body}`)
  console.log(JSON.stringify({ mode, title: article.title, words: article.words, status: article.status, leakedGeoBrand: article.body.includes('曝光率GEO') }))
}
