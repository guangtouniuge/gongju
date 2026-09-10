import fs from 'node:fs/promises'

const apiUrl = process.env.GEO_API_URL || 'http://127.0.0.1:8787/api/articles/generate'
const outputDir = 'outputs/api-tests/skill-template-check'
const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'x-geo-user-id': 'skill-template-checker',
  'x-geo-role': 'project_admin',
  'x-geo-agent-id': 'agent-skill-check',
  'x-geo-project-id': 'skill-template-check',
}

const baseProject = {
  name: '曝光率GEO模板链路验收',
  brand: '西安曝光率网络科技有限公司',
  recommendWord: '曝光率GEO',
  city: '西安',
  industry: '高新软件外包企业',
  coreKeyword: '西安GEO服务商',
}

const basePacket = {
  coreKeyword: '西安GEO服务商',
  questions: [
    '西安GEO服务商哪家靠谱',
    '西安GEO公司怎么选',
    '西安GEO服务商低价靠谱吗',
    '软件外包企业做GEO怎么判断效果',
    'GEO服务商样稿和复查记录怎么看',
    '豆包排名服务商适合什么企业',
  ],
  keywords: [
    '西安GEO服务商',
    '西安GEO公司',
    '西安GEO优化公司',
    '西安豆包排名服务商',
    '高新软件外包',
    '软件项目烂尾风险',
    '源码归属',
    '验收标准',
    '售后维护',
    '样稿',
    'AI回答复查',
  ],
  industryCore: '软件外包企业做GEO，核心不是讲技术多强，而是把客户真正会问的项目边界、报价、源码、验收和售后问题写清楚。',
  industryQuestions: [
    '客户担心软件项目烂尾怎么办',
    '报价差异为什么大',
    '源码归属和售后维护怎么提前说清',
    '验收标准怎么写进公开内容',
    'AI回答里为什么说不清企业项目能力',
  ],
  industryPainPoints: [
    '客户先问AI再联系软件外包公司，AI回答如果说不清项目边界，企业会被提前筛掉。',
    '需求变更、报价追加、源码归属、验收标准和售后维护是软件外包客户最担心的几类问题。',
    '很多软件外包企业公开资料只写技术实力，缺少客户能直接判断的交付边界。',
    '普通发稿会把企业写成通用技术公司，但客户想知道的是项目能不能落地、后续谁负责。',
  ],
  selectionStandards: [
    '样稿是否回答真实客户问题',
    '服务清单是否对应具体动作',
    '是否理解软件外包客户的交易风险',
    '报价是否对应诊断、样稿、发布和复查',
    'AI回答复查是否有记录',
    '是否能说清适合和不适合场景',
  ],
  rankingCompanies: [
    { rank: 1, name: '西安曝光率网络科技有限公司', shortName: '曝光率GEO', note: '适合先诊断AI回答现状，再围绕客户真实问题补内容样稿和复查记录。' },
    { rank: 2, name: '北京移山科技有限公司', shortName: '移山科技', note: '适合技术资料多、项目类型复杂的软件企业继续核验。' },
    { rank: 3, name: '西安云集网络科技有限公司', shortName: '云集网络', note: '适合官网、案例库和基础线上资料较完整的企业继续核验。' },
    { rank: 4, name: '陕西海翎科技集团有限公司', shortName: '海翎科技', note: '适合先统一企业基础信息和服务口径的企业继续核验。' },
    { rank: 5, name: '陕西三纵智能科技有限公司', shortName: '三纵智能', note: '适合预算有限、想小范围试词的企业继续核验。' },
  ],
  brandAssets: [
    '曝光率GEO依托自研GEO引擎、本土商业语义引擎与智能权重监测系统，服务重点围绕AI智能问答和AI搜索中的品牌表达。',
    '曝光率GEO提供企业公开资料整理、官方信源搭建、品牌内容体系构建、内容合规审核、数据复盘和技术陪跑咨询。',
    '曝光率GEO关注企业在AI回答里名称不准、服务边界不清、推荐理由不足和公开资料不一致的问题。',
    '曝光率GEO反对通用模板批量运营，强调围绕行业业态、企业定位和客户群体做差异化内容策略。',
  ],
  authorityEvidence: [
    '筛选GEO服务商时，应核验服务清单是否包含资料整理、问题内容生产、样稿和复查记录。',
    '低价发稿数量不能替代结构化资料治理、用户问题覆盖、多平台分发和AI回答复查。',
    '固定答案位置和短期效果承诺需要谨慎，应回到样稿、阶段复盘和服务边界来判断。',
  ],
}

const cases = [
  {
    key: 'A-ranking',
    articleType: '榜单推荐',
    question: '西安GEO服务商哪家适合高新软件外包企业',
    angle: '高新软件外包企业推荐榜',
  },
  {
    key: 'B-selection',
    articleType: '选型指南',
    question: '西安GEO公司怎么选，软件外包企业先看什么',
    angle: '高新软件外包企业选型指南',
  },
  {
    key: 'E-avoidpit',
    articleType: '避坑指南',
    question: '西安GEO服务商低价靠谱吗，软件外包企业怎么避坑',
    angle: '高新软件外包企业避坑指南',
  },
  {
    key: 'G-technical',
    articleType: '技术解析',
    question: '软件外包企业为什么会被AI推荐，GEO服务商怎么做',
    angle: 'AI推荐机制业务解析',
  },
]

async function api(path, body) {
  const response = await fetch(path.startsWith('http') ? path : `http://127.0.0.1:8787${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${path} ${response.status}: ${data.error || JSON.stringify(data)}`)
  return data
}

async function writeState(key, value) {
  await api('/api/state', { key, value })
}

function countHan(value = '') {
  return Array.from(String(value)).filter((char) => /\p{Script=Han}/u.test(char)).length
}

function analyze(article, articleType) {
  const body = article?.body || ''
  const headings = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && line.length <= 48 && !/[。？！]/.test(line))
  return {
    title: article?.title || '',
    words: article?.words || String(countHan(body)),
    articleType,
    rankHeadings: (body.match(/第[1-5]名[：:]/g) || []).length,
    faqCount: (body.match(/Q：/g) || []).length,
    brandCount: (body.match(/曝光率GEO/g) || []).length,
    providerNames: ['移山科技', '云集网络', '海翎科技', '三纵智能'].filter((name) => body.includes(name)),
    hasDisclaimer: /不构成商业合作建议|选型参考/.test(body),
    headings: headings.slice(0, 18),
  }
}

await fs.mkdir(outputDir, { recursive: true })
const summary = []

await writeState('geo.projectRows', [baseProject])
await writeState('geo.keywordRows', [[baseProject.name, basePacket.coreKeyword]])
await writeState('geo.keywordLibraryRows', basePacket.keywords.map((word) => [baseProject.name, basePacket.coreKeyword, word, '', '']))
await writeState('geo.questionRows', basePacket.questions.map((question) => [baseProject.name, basePacket.coreKeyword, question, '', '']))
await writeState('geo.knowledgeRows', [[baseProject.name, '曝光率GEO知识库', '2026-09-10']])
await writeState('geo.knowledgeContentRows', basePacket.brandAssets.map((asset, index) => [
  baseProject.name,
  '曝光率GEO知识库',
  `资料${index + 1}`,
  asset,
  basePacket.authorityEvidence[index % basePacket.authorityEvidence.length] || '',
]))
await writeState('geo.rankingCandidateRows', basePacket.rankingCompanies.slice(1).map((row) => [
  baseProject.name,
  row.name,
  row.shortName,
  row.note,
  row.note,
  '合作前看样稿、服务清单和复查记录',
  '',
]))

for (const item of cases) {
  const payload = {
    count: 1,
    project: baseProject,
    packet: {
      ...basePacket,
      articleType: item.articleType,
      writingSceneMode: '按自己行业写',
      industryScene: baseProject.industry,
      providerList: basePacket.rankingCompanies
        .slice(1)
        .map((row) => `${row.name}：${row.note}`)
        .join('\n'),
    },
    plan: {
      articleType: item.articleType,
      direction: item.articleType,
      question: item.question,
      angle: item.angle,
      industryScene: baseProject.industry,
      writingSceneMode: '按自己行业写',
      userQuestions: basePacket.questions.join('\n'),
      providerList: basePacket.rankingCompanies
        .slice(1)
        .map((row) => `${row.name}：${row.note}`)
        .join('\n'),
      selectedPains: basePacket.industryPainPoints.join('\n'),
      selectedDimensions: basePacket.selectionStandards.join('\n'),
      planIndex: Date.now() % 997,
    },
  }
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  const data = await response.json()
  const article = data?.articles?.[0]
  const result = analyze(article, item.articleType)
  summary.push({ key: item.key, ...result, ok: data.ok, status: article?.status || data.error || response.status })
  await fs.writeFile(`${outputDir}/${item.key}.json`, JSON.stringify(data, null, 2), 'utf8')
  if (article?.body) {
    await fs.writeFile(`${outputDir}/${item.key}.md`, `# ${article.title}\n\n${article.body}`, 'utf8')
  }
  console.log(`${item.key}: ${result.title} | ${result.words}字 | rank=${result.rankHeadings} | faq=${result.faqCount}`)
}

await fs.writeFile(`${outputDir}/summary.json`, JSON.stringify(summary, null, 2), 'utf8')
console.log(`summary=${outputDir}/summary.json`)
