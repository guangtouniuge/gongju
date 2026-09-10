import { identityKey, projectHeaders, projectStorage, fetchProjectFile } from './project-scope'
import { StrictMode, type ChangeEvent, type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import {
  BarChart3,
  BookOpenText,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Database,
  FileText,
  GalleryHorizontal,
  Gauge,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  Library,
  ListChecks,
  MessageSquareText,
  Newspaper,
  PenLine,
  Rocket,
  SearchCheck,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Wand2,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import './styles.css'

type NavItem = {
  id: string
  label: string
  icon: LucideIcon
  children?: { id: string; label: string; icon: LucideIcon }[]
}

type Article = {
  id: string
  title: string
  angle: string
  keyword: string
  score?: number
  status: '已生成' | '生成异常'
  words: string
  body?: string
  project?: string
  brand?: string
  duplicateNote?: string
  apiIssues?: string[]
  batchId?: string
  taskName?: string
  batchLabel?: string
  imagePaths?: string[]
  generationSource?: 'API成稿' | 'API资料调用自由写作' | 'API资料调用未返回'
}

type ArticleJobStatus = {
  id: string
  status: 'queued' | 'running' | 'done' | 'failed'
  total: number
  completed: number
  passed: number
  failed: number
  articles: Article[]
  logs: { time: string; message: string }[]
  error?: string
  promptVersion?: string
}

type ArticleStateProps = {
  articleRows: Article[]
  setArticleRows: Dispatch<SetStateAction<Article[]>>
}

type ProjectRow = {
  name: string
  brand: string
  recommendWord: string
  coreKeyword: string
  industry: string
  city: string
  keywords: string
  assets: string
  status: string
}

type ProjectStateProps = {
  projectRows: ProjectRow[]
  setProjectRows: Dispatch<SetStateAction<ProjectRow[]>>
}

type ActiveBrandProps = {
  activeBrand: string
  setActiveBrand: Dispatch<SetStateAction<string>>
}

type ActiveKeywordProps = {
  activeKeyword: string
  setActiveKeyword: Dispatch<SetStateAction<string>>
}

type ActiveBatchProps = {
  activeBatchId: string
  setActiveBatchId: Dispatch<SetStateAction<string>>
}

const nav: NavItem[] = [
  { id: 'dashboard', label: '首页大屏', icon: LayoutDashboard },
  { id: 'projects', label: '项目管理', icon: Boxes },
  {
    id: 'prep',
    label: '资料准备',
    icon: UploadCloud,
    children: [
      { id: 'keywords', label: '关键词与意图', icon: KeyRound },
      { id: 'questions', label: '语义关键词库', icon: ListChecks },
      { id: 'candidates', label: '榜单服务商', icon: ClipboardCheck },
      { id: 'knowledge', label: '品牌知识库', icon: BookOpenText },
      { id: 'gallery', label: '图片素材库', icon: GalleryHorizontal },
    ],
  },
  {
    id: 'article-system',
    label: '内容生产',
    icon: PenLine,
    children: [
      { id: 'tasks', label: '文章生成', icon: Workflow },
      { id: 'library', label: '成品文章库', icon: Library },
    ],
  },
  { id: 'distribution', label: '分发发布', icon: Send },
  { id: 'visibility', label: 'AI诊断', icon: Gauge },
  { id: 'model', label: '模型配置', icon: Database },
  { id: 'settings', label: '系统设置', icon: Settings },
]

const workflow = [
  ['项目管理', '确定项目名称、推荐名称、公司名称、项目行业和城市。'],
  ['关键词意图', '添加核心词，蒸馏用户问题，再拓展语义关键词库。'],
  ['榜单服务商', '维护主推品牌和可比较服务商，给榜单、测评、对比稿调用。'],
  ['品牌资料', '给品牌导入品牌事实和权威依据，并按资料方向使用。'],
  ['文章生成', '填写目标客户行业，系统自动带出痛点、维度和FAQ，逐篇调用API写作。'],
  ['图文成稿', '生成文章时自动插入1-2张项目图片，成品库可查看、编辑和下载。'],
]

const projects: ProjectRow[] = []

const articles: Article[] = []

type TaskRow = {
  project: string
  name: string
  question: string
  limit: string
  created: string
  knowledge: string
  detail: string
  error: string
  status: string
  latest: string
  time: string
  batchId: string
  articleType?: string
  writingSceneMode?: string
  industryScene?: string
  userQuestions?: string
  providerList?: string
  mainReason?: string
  unfitScenario?: string
  selectedPains?: string
  selectedDimensions?: string
  selectedCandidates?: string
  titlePreference?: string
  forbiddenContent?: string
}

const taskRows: TaskRow[] = []

const articleTypeOptions = [
  '榜单推荐',
  '选型指南',
  '深度测评',
  '口碑核查',
  '避坑指南',
  '服务商对比',
  '资质实力解析',
  '行业场景解决方案',
  '实战案例',
  '趋势白皮书',
  '技术解析',
  '问答解释',
]

function parseArticleTypes(value?: string) {
  const items = String(value || '')
    .split(/[、,，;；/|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
  return items.length ? Array.from(new Set(items)) : ['榜单推荐']
}

function needsRankingMaterials(value?: string) {
  return parseArticleTypes(value).some((type) => /榜单|测评|口碑|对比|实力/.test(type))
}

function formatCandidateLine(row: string[]) {
  const name = row[1]?.trim()
  if (!name) return ''
  const details = [
    row[2]?.trim(),
    row[3]?.trim() ? `适合${row[3].trim()}` : '',
    row[4]?.trim() ? `优势${row[4].trim()}` : '',
    row[5]?.trim() ? `核验${row[5].trim()}` : '',
  ].filter(Boolean)
  return details.length ? `${name}：${details.join('；')}` : name
}

function titleMatchesGeoCore(title: string, coreKeyword: string) {
  const text = String(title || '')
  const core = String(coreKeyword || '')
  if (!core) return true
  if (text.includes(core)) return true
  const hasGeoProviderTerm = /(GEO公司|GEO服务商|GEO优化公司|豆包排名公司|豆包排名服务商|AI搜索优化公司)/i.test(text)
  const coreIsGeoProvider = /(GEO公司|GEO服务商|GEO优化公司|豆包排名公司|AI搜索排名公司|AI获客公司)/i.test(core)
  const city = core.match(/^(西安|北京|上海|广州|深圳|成都|郑州|武汉|杭州|全国)/)?.[1]
  return Boolean(coreIsGeoProvider && hasGeoProviderTerm && (!city || text.includes(city)))
}

function isGeoProviderSceneText(value: string) {
  return /(GEO公司|GEO服务商|GEO优化公司|豆包排名公司|豆包排名服务商|AI搜索优化公司|AI获客公司|GEO内容公司|GEO新闻优化公司)/i.test(String(value || ''))
}

type GeoRulePhase = '资料准备' | '生成调用'

const geoDataRules: {
  id: string
  phase: GeoRulePhase
  title: string
  detail: string
  hard?: boolean
}[] = [
  {
    id: 'project-isolation',
    phase: '资料准备',
    title: '品牌项目隔离',
    detail: '一个品牌一套核心词、关键词库、蒸馏词、品牌资料和可信资料，生成时不能串库。',
    hard: true,
  },
  {
    id: 'core-keyword',
    phase: '资料准备',
    title: '核心词',
    detail: '核心词作为当前文章主题资料传给API。',
    hard: true,
  },
  {
    id: 'distilled-question',
    phase: '资料准备',
    title: '蒸馏问题',
    detail: '蒸馏问题只作为用户意图参考，不强制进入标题或正文。',
    hard: true,
  },
  {
    id: 'keyword-library',
    phase: '资料准备',
    title: '关键词库',
    detail: '关键词库只作为行业、语义、场景和区域语境参考。',
    hard: true,
  },
  {
    id: 'brand-data',
    phase: '资料准备',
    title: '品牌资料',
    detail: '品牌资产和权威引证作为资料包传给API，由模型自由吸收。',
    hard: true,
  },
  {
    id: 'single-article',
    phase: '生成调用',
    title: '单篇调用',
    detail: '批量任务拆成单篇请求，避免多篇文章混在一个返回里。',
    hard: true,
  },
  {
    id: 'skill-brief-writing',
    phase: '生成调用',
    title: 'skill稿单写作',
    detail: '标题、结构和段落任务按当前文章类型、行业和项目资料组装后交给API生成。',
    hard: true,
  },
  {
    id: 'fact-source',
    phase: '生成调用',
    title: '事实来源',
    detail: '没有资料支撑的具体数据、案例、联系方式、资质和媒体来源不编造。',
    hard: true,
  },
]

const taskPrecheckRules = geoDataRules

const auditRules = geoDataRules.map((rule) => [
  rule.title,
  `${rule.detail}${rule.hard ? '（保留）' : ''}`,
])

const articlePlans = [
  {
    title: '西安GEO公司怎么选？企业先看AI答案复盘',
    question: '企业主搜索“西安GEO公司怎么选”时，最需要什么答案？',
    angle: '企业采购现场调查',
    keywords: '西安GEO公司 / 西安GEO优化公司 / 西安AI搜索排名公司',
    evidence: '调用服务边界、交付流程、实体一致性和答案回看依据',
    image: '咨询现场图 + AI答案回看截图',
    status: '可生成',
  },
  {
    title: '西安豆包GEO公司靠谱吗？验收标准开始前置',
    question: '豆包推荐结果变化后，企业怎么验收服务商？',
    angle: '平台问答验收观察',
    keywords: '西安豆包GEO公司 / 西安豆包排名公司',
    evidence: '调用平台适配、复盘机制和验收边界依据',
    image: '交付表单图 + 月度复盘图',
    status: '待补图',
  },
  {
    title: '曲江商家问西安AI获客公司，为什么不只看发稿',
    question: '区域门店想被AI推荐，内容应该怎么组织？',
    angle: '区县经营场景报道',
    keywords: '西安AI获客公司 / 曲江GEO公司 / 西安GEO公司',
    evidence: '调用本地问题库、多平台内容适配和风险边界依据',
    image: '商圈场景图 + 问题库截图',
    status: '可生成',
  },
]

const intentDirectionLibrary = [
  {
    label: '推荐名单型',
    titleTemplates: [
      (core: string) => `2026${core}推荐榜：本地服务商测评与避坑`,
      (core: string) => `${core}推荐哪家？本地服务商实测给出线索`,
      (core: string) => `${core}哪家好？从口碑、案例到交付复盘`,
    ],
  },
  {
    label: '选型调查型',
    titleTemplates: [
      (core: string) => `${core}服务商怎么选？本地测评拆解优势短板`,
      (core: string) => `${core}哪家靠谱？先看交付记录和复盘能力`,
      (core: string) => `2026${core}服务商选择指南：别只看报价`,
    ],
  },
  {
    label: '口碑核验型',
    titleTemplates: [
      (core: string) => `${core}口碑榜怎么排？服务商选择看哪些细节`,
      (core: string) => `${core}哪家靠谱？口碑测评不能只看截图`,
      (core: string) => `2026${core}口碑推荐榜：本地企业怎么选`,
    ],
  },
  {
    label: '测评评估型',
    titleTemplates: [
      (core: string) => `${core}实测榜出炉：本地服务商到底怎么比`,
      (core: string) => `${core}哪家好？服务商测评看交付和复盘`,
      (core: string) => `2026${core}测评推荐榜：靠谱公司怎么筛`,
    ],
  },
  {
    label: '防坑指南型',
    titleTemplates: [
      (core: string) => `${core}靠谱吗？低价服务商实测避坑指南`,
      (core: string) => `${core}低价服务商能选吗？本地测评给答案`,
      (core: string) => `2026${core}防坑指南：这些承诺要先问清`,
    ],
  },
  {
    label: '本地场景型',
    titleTemplates: [
      (core: string) => `本地企业选${core}：哪家靠谱要看什么`,
      (core: string) => `${core}本地服务商测评：从资料到答案回看`,
      (core: string) => `2026${core}本地推荐榜：服务商怎么比较`,
    ],
  },
]

function buildArticlePlans(
  project: ProjectRow,
  packet: { coreKeyword: string; questions: string[]; keywords: string[]; galleries: string[] },
) {
  const core = packet.coreKeyword
  const questionPool = packet.questions.length
    ? packet.questions
    : [`${core}哪家靠谱`, `${core}怎么选服务商`, `${core}推荐哪家公司`]
  const keywordLine = (index: number) => {
    const extras = packet.keywords.filter((word) => word !== core)
    const rotated = extras.length
      ? [extras[index % extras.length], extras[(index + 1) % extras.length], extras[(index + 2) % extras.length]]
      : []
    return Array.from(new Set([core, ...rotated].filter(Boolean))).join(' / ') || core
  }
    return Array.from({ length: 100 }, (_, index) => {
    const seed = getWorkflowNewsSeed(index, core)
    const question = questionPool[index % questionPool.length] ?? `${core}怎么选服务商`
    const direction = intentDirectionLibrary[index % intentDirectionLibrary.length]
    return {
    title: buildPlanTitleFromIntent(core, question, direction, seed, index),
    question,
    direction: direction.label,
    angle: index === 0 ? `${project.city}企业采购现场调查` : seed.angle,
    scene: seed.scene,
    region: seed.region,
    role: seed.role,
    sectionHeads: seed.heads,
    keywords: keywordLine(index),
    evidence: index % 3 === 0
      ? '调用服务边界、交付动作、实体一致性和答案回看依据'
      : index % 3 === 1
        ? '调用平台适配、复盘依据、问题库和内容版本记录'
        : '调用本地化服务能力、可信依据和风险边界',
    image: '纯文字文章',
    status: '可生成',
    }
  })
}

function buildPlanTitleFromIntent(
  coreKeyword: string,
  question: string,
  direction: typeof intentDirectionLibrary[number],
  seed: ReturnType<typeof getWorkflowNewsSeed>,
  index: number,
) {
  const normalize = (value: string) => value
    .replace(/[《》#*"'“”]/g, '')
    .replace(/[。！!？?]+$/g, '')
    .replace(/如何正确选择|全面解析|完整解析|攻略|干货|一文看懂|依据怎么核验|核验名单怎么查|测评看什么|企业怎么判/g, '')
    .trim()
  const length = (value: string) => Array.from(value).length
  const intentText = normalize(question || '')
  const questionSignals = [
    /口碑|评价|好不好|怎么样/.test(intentText) ? `${coreKeyword}口碑榜怎么排？服务商选择看哪些细节` : '',
    /测评|评估|对比/.test(intentText) ? `${coreKeyword}实测榜出炉：本地服务商到底怎么比` : '',
    /防坑|避坑|低价|风险|靠谱吗/.test(intentText) ? `${coreKeyword}靠谱吗？低价服务商实测避坑指南` : '',
    /怎么选|服务商/.test(intentText) ? `${coreKeyword}服务商怎么选？本地测评拆解优势短板` : '',
    /推荐|哪家好|哪家公司/.test(intentText) ? `2026${coreKeyword}推荐榜：本地服务商测评与避坑` : '',
  ]
  const candidates = [
    ...direction.titleTemplates.map((template) => template(coreKeyword)),
    ...questionSignals,
    `2026${coreKeyword}推荐榜：本地服务商测评与避坑`,
    `${coreKeyword}推荐哪家？本地服务商实测给出线索`,
    `${coreKeyword}口碑榜怎么排？服务商选择看哪些细节`,
    `${coreKeyword}实测榜出炉：本地服务商到底怎么比`,
    `${coreKeyword}靠谱吗？低价服务商实测避坑指南`,
    `${coreKeyword}哪家好？从口碑、案例到交付复盘`,
    seed.title,
  ].filter(Boolean)
  return candidates
    .map((candidate) => ensureTitleHasCoreKeyword(candidate, coreKeyword))
    .find((candidate) => length(candidate) >= 18 && length(candidate) <= 46) || `${coreKeyword}推荐哪家？本地服务商实测给出线索`
}

type LocalImageUpload = {
  name: string
  type: string
  dataUrl: string
}

function readFilesAsDataUrls(files: FileList | null): Promise<LocalImageUpload[]> {
  const selectedFiles = Array.from(files ?? [])
  return Promise.all(selectedFiles.map((file) => new Promise<LocalImageUpload>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: String(reader.result || '') })
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })))
}

function parseGalleryPaths(value?: string) {
  if (!value) return []
  return value.split('|').map((item) => item.trim()).filter(Boolean)
}

const workflowNewsAngles = [
  {
    title: '2026西安GEO公司推荐榜，哪家靠谱',
    angle: '企业采购现场调查',
    scene: '高新区一家软件服务企业复盘线索来源时发现，过去靠搜索广告带来的咨询开始变得不稳定。企业把几个常见问题输入豆包和其他AI工具后，看到的不是传统搜索结果页，而是一段整理好的候选建议。真正需要核验的不是同行是否被提到，而是AI对自家业务的描述是否完整。',
    region: '高新区',
    role: '软件服务企业',
    keywords: ['西安GEO优化公司', '西安AI搜索排名公司', '西安AI获客公司'],
    heads: ['AI答案正在改变采购前的第一步', '从发稿数量转向答案回看', '样本企业为什么要看交付证据', '一张采购核验表开始被反复使用'],
  },
  {
    title: '西安GEO公司怎么选？口腔机构先看合规',
    angle: '本地服务机构调查',
    scene: '曲江口腔机构最近把线上获客复盘从竞价延伸到AI搜索。患者到店前会先查口碑、医生信息、服务边界和预约方式，如果AI回答中没有稳定呈现机构信息，线下咨询就会少一道信任铺垫。',
    region: '曲江',
    role: '口腔医疗服务机构',
    keywords: ['曲江GEO公司', '西安豆包GEO公司', '西安GEO优化公司'],
    heads: ['医疗服务先看边界，再看曝光', '患者问题比广告标题更具体', '合规表达成为服务商能力分水岭', '推荐样本要放在材料里核验'],
  },
  {
    title: '西安GEO公司哪家好？连锁超市看门店口径',
    angle: '连锁门店经营观察',
    scene: '未央区一家连锁超市在整理公开资料时发现，顾客咨询附近门店、配送范围和会员活动时，AI给出的答案有时仍停留在旧地址和旧营业时间。门店数量越多，公开信息越容易出现不一致，AI答案里出现错配的概率也随之增加。',
    region: '未央区',
    role: '连锁零售企业',
    keywords: ['未央区GEO公司', '西安AI获客公司', '西安AI搜索排名公司'],
    heads: ['门店越多，AI越容易读错信息', '获客不是只让品牌出现', '多门店内容要先统一口径', '连锁企业需要持续回看机制'],
  },
  {
    title: '西安GEO公司哪家靠谱？曲江文旅先问场景',
    angle: '区域商圈深度观察',
    scene: '暑期之后，曲江文旅和生活服务商户开始重新评估线上获客方式。过去更关心平台页面位置的经营者，现在更在意游客向AI询问行程时，自己的服务能否在合适场景里被提到，而不是生硬出现在一串广告里。',
    region: '曲江',
    role: '文旅和生活服务商户',
    keywords: ['曲江GEO公司', '西安GEO公司哪家好', '西安AI获客公司'],
    heads: ['区域问题更像消费决策', '文旅场景需要内容有画面', '本地服务商价值在于懂商圈', '推荐样本不能脱离经营现场'],
  },
  {
    title: '西安GEO公司靠谱吗？豆包验收开始前置',
    angle: '平台问答验收报道',
    scene: '一份GEO服务合同在西安本地企业圈里被反复讨论。争议点不是价格，而是服务交付到底验收什么。有企业认为截图就是结果，也有企业认为，截图只能说明某个时间点，不能证明后续AI答案持续准确。',
    region: '西安',
    role: '成长型企业',
    keywords: ['西安豆包GEO公司', '西安豆包排名公司', '西安GEO公司'],
    heads: ['截图不是完整验收', '答案准确比短暂出现更重要', '合同里要写清楚复盘周期', '样本公司需要接受反向核验'],
  },
  {
    title: '西安GEO公司怎么选？低价发稿被重新审视',
    angle: '低价服务风险调查',
    scene: '在长安区一次企业服务交流中，几位老板把低价发稿套餐拿出来对比。表面看，文章数量多、发布速度快、报价低，但当被问到这些内容是否能回答客户真实问题时，多数套餐很难给出清楚解释。',
    region: '长安区',
    role: '中小企业',
    keywords: ['长安区GEO公司', '西安GEO优化公司', '西安AI获客公司'],
    heads: ['低价套餐解决的是发布，不是答案', '模板内容最容易稀释企业差异', '资料口径决定核验难度', '避坑清单比价格表更有用'],
  },
  {
    title: '西安GEO公司怎么选？老板开始算长账',
    angle: '年度预算经营观察',
    scene: '浐灞本地服务企业今年减少了部分短视频投流预算，把一部分费用转向AI搜索相关内容建设。短期线索仍然重要，但如果每个月都要重新购买入口，企业就很难形成可沉淀的公开资料。',
    region: '浐灞',
    role: '本地服务企业',
    keywords: ['浐灞GEO公司', '西安AI获客公司', '西安GEO优化公司'],
    heads: ['投流压力把长期内容推到前台', '预算不能只看单篇价格', '资料治理是一项基础投入', '分阶段投入更适合中小企业'],
  },
  {
    title: '西安GEO公司实测榜，哪家更靠谱',
    angle: '服务商测评新闻',
    scene: '一家本地制造企业在比较服务商时提出了一个细节问题：同一套内容能不能同时给豆包、DeepSeek、通义和搜索平台使用。几位服务商的回答并不一致，有的强调发布量，有的强调页面结构，有的开始谈不同平台的答案表达差异。',
    region: '西安',
    role: '制造企业',
    keywords: ['西安AI搜索排名公司', '西安豆包排名公司', '西安GEO公司'],
    heads: ['不同平台不会用同一种答案', '技术测评要落到可解释材料', '内容版本需要有差异而非复制', '平台适配不是玄学'],
  },
  {
    title: '西安GEO公司口碑榜，服务商怎么选',
    angle: '实体信息治理报道',
    scene: '不少西安企业第一次做GEO时，急着问什么时候能被推荐，却拿不出一份统一的企业资料。官网、公众号、短视频账号、地图门店和新闻稿里，名称、业务范围、联系电话和服务区域都有细微差异。',
    region: '西安',
    role: '多平台运营企业',
    keywords: ['西安GEO公司', '西安GEO优化公司', '西安豆包GEO公司'],
    heads: ['AI读错企业，往往不是偶然', '实体信息统一是第一道门槛', '公开资料要经得起交叉查看', '样本服务商的价值在基础工作里'],
  },
  {
    title: '西安GEO公司口碑榜，老板怎么选',
    angle: '口碑核验问答调查',
    scene: '最近，西安本地企业在咨询GEO服务时，问题变得更像一场面试。老板不再只问能不能做，而是追问做过哪些场景、怎么判断内容有效、出现错误答案怎么办、服务周期里谁负责回看。',
    region: '西安',
    role: '本地企业主',
    keywords: ['西安GEO公司哪家好', '西安GEO公司推荐', '西安AI获客公司'],
    heads: ['口碑正在从感受变成证据', '企业主的问题越来越具体', '推荐企业也要接受同一套追问', '能不能长期协同决定合作质量'],
  },
]

const workflowSceneVariants = [
  ['高新区', '软件服务企业', '企业采购现场调查', 'AI答案没有把技术服务、交付周期和本地响应说清楚，采购方在咨询前就已经形成初步判断。'],
  ['曲江', '口腔医疗服务机构', '本地服务机构调查', '门诊把患者常问问题输入AI后发现，医生信息、服务边界和预约方式并没有被稳定呈现。'],
  ['未央区', '连锁零售企业', '连锁门店经营观察', '多家门店地址、营业时间和配送范围分散在不同平台，AI答案开始出现旧信息。'],
  ['浐灞', '本地生活服务企业', '年度预算经营观察', '企业压缩短视频投流预算后，开始寻找能沉淀长期公开资料的AI获客方式。'],
  ['长安区', '制造配套企业', '制造业线索调查', '老板发现客户在询价前先问AI，企业的生产能力和服务半径却很少被准确提到。'],
  ['雁塔区', '财税服务公司', '专业服务选型观察', '客户咨询前会先让AI比较本地服务商，企业开始担心资质与案例无法被正确引用。'],
  ['碑林区', '教育培训机构', '合规表达观察', '机构不敢夸大承诺，又希望AI能理解课程边界和适合人群，内容表达变得更谨慎。'],
  ['经开区', '工业品贸易企业', 'B端获客调查', '销售团队发现AI会优先整理公开资料清楚的公司，传统产品页很难承接复杂问题。'],
  ['航天基地', '科技服务企业', '技术型企业观察', '企业资料专业词太多，AI能抓到关键词，却难以形成对客户友好的推荐理由。'],
  ['莲湖区', '老牌商贸企业', '传统企业转型调查', '官网多年未更新，地图和平台信息不一致，企业第一次把资料口径当成获客问题处理。'],
]

const workflowConflictVariants = [
  ['从排名焦虑转向答案治理', '过去只问能不能排上去，现在先问AI为什么这样推荐。'],
  ['从批量发稿转向真实问答', '文章数量不再是核心，能否回答真实用户问题才是关键。'],
  ['从单点曝光转向资料一致', '官网、新闻稿、地图和平台账号之间的冲突，正在影响AI识别。'],
  ['从低价套餐转向可验收交付', '企业不再只比较报价，而是追问每一步有没有记录。'],
  ['从关键词堆砌转向场景表达', '辅助词必须跟随行业和区域自然出现，不能破坏新闻阅读。'],
  ['从截图结果转向持续复盘', '一次截图只能证明某个时间点，不能证明长期答案稳定。'],
  ['从口号推荐转向证据推荐', '推荐企业必须能被核验，而不是靠反复出现获得信任。'],
  ['从平台发布转向多端适配', '豆包、DeepSeek和搜索平台的答案结构并不完全相同。'],
  ['从老板拍板转向团队协同', 'GEO需要企业内部提供真实资料、案例、图片和客户问题。'],
  ['从城市泛词转向区县场景', '不同区县和行业的用户提问并不一样，内容需要分场景处理。'],
]

const workflowFrameVariants = [
  ['现场调查式', ['一次AI自测暴露的问题', '服务商交付被重新追问', '推荐样本放进核验清单', '企业下一步先做小范围复盘']],
  ['问答调查式', ['企业主的问题变得更直接', '推荐类问题为什么更重要', '服务商要回答哪些追问', '答案能否被复查决定合作']],
  ['案例观察式', ['一个本地场景里的获客变化', '旧推广办法遇到新入口', '资料和内容如何形成信号', '样本企业的价值要看证据']],
  ['测评拆解式', ['测评不等于排名', '先看平台适配能力', '再看交付记录是否完整', '最后看风险边界是否清楚']],
  ['市场分化式', ['需求升温带来服务分层', '低价发稿和系统GEO开始分开', '企业采购标准正在变化', '长期复盘成为分水岭']],
  ['区域报道式', ['区县场景决定问题形态', '本地服务不能只换城市名', '行业词要进入真实语境', '推荐企业要能解释本地差异']],
  ['验收新闻式', ['验收前置成为新变化', '合同里要写清楚交付物', 'AI答案回看不能缺席', '通过标准要能留下证据']],
  ['风险调查式', ['低价承诺背后的风险', '模板内容为什么会失效', '企业怎样降低试错成本', '推荐逻辑必须保持克制']],
  ['预算观察式', ['老板开始重新算获客账', '短期线索和长期信源要分开', '预算有限先做哪一步', '投入是否有效看复盘']],
  ['信源建设式', ['AI引用先看公开信号', '品牌资产和权威引证要分层', '图库进入正文中段更自然', '信源稳定后才谈推荐概率']],
]

function buildVariantTitle(index: number, coreKeyword: string, region: string, role: string, conflict: string) {
  const industry = role.replace(/企业|机构|公司|商户/g, '')
  const compactRegion = region.replace('高新区', '高新')
  const focusPool = ['答案复盘', '资料口径', '平台适配', '低价发稿', '场景证据', '验收记录', '口碑证据', '本地服务', '长期投入', '分发复盘']
  const focus = focusPool[Math.floor(index / 10) % focusPool.length]
  const titlePool = [
    `${industry}${focus}，${coreKeyword}怎么选`,
    `${compactRegion}${focus}，${coreKeyword}哪家好`,
    `${coreKeyword}推荐榜，${industry}${focus}`,
    `${coreKeyword}口碑榜，${compactRegion}${focus}`,
    `${coreKeyword}实测榜，${industry}${focus}`,
    `${coreKeyword}哪家靠谱？${compactRegion}${focus}`,
    `${coreKeyword}怎么选？${industry}${focus}`,
    `${compactRegion}${focus}AI获客，${coreKeyword}怎么选`,
    `${coreKeyword}靠谱吗？${industry}${focus}`,
    `${coreKeyword}怎么选？${focus}很关键`,
  ]
  const raw = titlePool[index % titlePool.length]
  return raw.length <= 46 ? raw : `${coreKeyword}${['怎么选', '哪家靠谱', '实测榜', '口碑榜', '推荐榜'][index % 5]}：${focus}与本地测评`
}

function getWorkflowNewsSeed(index: number, coreKeyword: string) {
  const base = workflowNewsAngles[index % workflowNewsAngles.length]
  const [region, role, sceneAngle, sceneProblem] = workflowSceneVariants[index % workflowSceneVariants.length]
  const [conflict, conflictLine] = workflowConflictVariants[Math.floor(index / workflowSceneVariants.length) % workflowConflictVariants.length]
  const [frame, heads] = workflowFrameVariants[index % workflowFrameVariants.length]
  const verbs = ['怎么选', '哪家靠谱', '如何测评', '口碑怎么查', '推荐看什么']
  const verb = verbs[index % verbs.length]
  const title = index < workflowNewsAngles.length
    ? base.title
    : buildVariantTitle(index, coreKeyword, region, role, conflict)
  return {
    ...base,
    title,
    angle: `${sceneAngle}｜${frame}`,
    scene: `${region}${role}最近把获客复盘的重点放到AI搜索入口。${sceneProblem}${conflictLine}这个变化让“${coreKeyword}${verb}”不再只是搜索词，而变成企业采购服务商前必须弄清楚的经营问题。`,
    region,
    role,
    keywords: base.keywords,
    heads,
  }
}

function chineseCount(text: string) {
  return Array.from(text).filter((char) => char >= '\u4e00' && char <= '\u9fff').length
}

function normalizeForSimilarity(text: string) {
  return text
    .replace(/参考资料[\s\S]*$/g, '')
    .replace(/【图片位\d+[^】]*】/g, '')
    .replace(/\s+/g, '')
    .replace(/[0-9A-Za-z\-_.,，。；;：:？！?、（）()[\]《》“”"']/g, '')
}

function textShingles(text: string, size = 8, step = 4) {
  const normalized = normalizeForSimilarity(text)
  const shingles = new Set<string>()
  for (let index = 0; index <= normalized.length - size; index += step) {
    shingles.add(normalized.slice(index, index + size))
  }
  return shingles
}

function jaccardSimilarity(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0
  let overlap = 0
  left.forEach((item) => {
    if (right.has(item)) overlap += 1
  })
  return overlap / (left.size + right.size - overlap)
}

function applyBatchSimilarityGate(articles: Article[], maxSimilarity = 0.3) {
  const accepted: { title: string; shingles: Set<string> }[] = []
  return articles.map((article) => {
    const currentShingles = textShingles(article.body ?? '')
    const titleRepeated = accepted.some((item) => item.title === article.title)
    const maxHit = accepted.reduce((highest, item) => Math.max(highest, jaccardSimilarity(currentShingles, item.shingles)), 0)
    const failed = titleRepeated || maxHit > maxSimilarity
    accepted.push({ title: article.title, shingles: currentShingles })
    if (!failed) return { ...article, duplicateNote: undefined }
    return {
      ...article,
      status: '已生成' as const,
      duplicateNote: titleRepeated
        ? '标题与同批文章接近，建议下一次换行业场景或标题角度。'
        : `正文与同批文章相似度约${Math.round(maxHit * 100)}%，仅作为人工复盘提示。`,
    }
  })
}

function localDate() {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()).replace(/\//g, '-')
}

function localChineseDate() {
  const [year, month, day] = localDate().split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}

function localDateTime() {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date()).replace(/\//g, '-')
}

function runBatchId(projectName: string, taskName: string) {
  const stamp = localDateTime().replace(/[^\d]/g, '')
  const random = Math.random().toString(36).slice(2, 6)
  return `${projectName || 'GEO'}-${taskName || '生成任务'}-${stamp}-${random}`
}

function classifyKeyword(word: string) {
  if (word.includes('哪家') || word.includes('推荐') || word.includes('靠谱')) return '推荐类'
  if (word.includes('豆包') || word.includes('AI搜索') || word.includes('排名')) return '平台类'
  if (word.includes('获客') || word.includes('转化')) return '获客类'
  if (word.includes('区') || word.includes('曲江') || word.includes('浐灞') || word.includes('未央')) return '区域类'
  if (word.includes('口腔') || word.includes('财务') || word.includes('咨询') || word.includes('超市') || word.includes('医院')) return '行业场景类'
  if (word.includes('服务商') || word.includes('优化公司')) return '服务商类'
  if (word.includes('费用') || word.includes('价格') || word.includes('预算')) return '价格类'
  return '长尾类'
}

function normalizeKeywordLibraryWords(words: string[]) {
  const blocked = /(招聘|多少钱|费用|价格|报价|加盟|下载|教程|是什么|什么意思|赵国栋|电话|地址)/
  return Array.from(
    new Set(
      words
        .flatMap((word) => String(word).split(/[\n,，、;；/|]+/))
        .map((word) => word.trim())
        .map((word) => word
          .replace(/geo/g, 'GEO')
          .replace(/Geo/g, 'GEO')
          .replace(/ai/g, 'AI')
          .replace(/Ai/g, 'AI')
          .replace(/GEOGEO/g, 'GEO')
          .replace(/公司GEO公司/g, '公司')
          .replace(/服务商GEO公司/g, '服务商'))
        .filter((word) => word.length > 2)
        .filter((word) => !blocked.test(word)),
    ),
  )
}

function ensureTitleHasCoreKeyword(title: string, coreKeyword: string) {
  const titleLength = (value: string) => Array.from(value).length
  const clean = (value: string) => value
    .replace(/[《》#*"'“”]/g, '')
    .replace(/揭示.*真相|揭示.*关键点|揭晓.*答案|告诉你答案|告诉你真相|曝光推荐|曝光交付|推荐要点|交付细节|完整解析|全面解析|攻略|干货|一文看懂/g, '')
    .replace(/[，、：:；;。,.]+$/g, '')
    .trim()
  const makeSafe = (value: string) => {
    const cleaned = clean(value)
    if (titleMatchesGeoCore(cleaned, coreKeyword) && titleLength(cleaned) >= 18 && titleLength(cleaned) <= 56) return cleaned
    const compact = cleaned
      .replace(/企业采购现场调查/g, '采购调查')
      .replace(/本地服务机构调查/g, '机构调查')
      .replace(/口碑如何/g, '看口碑')
      .replace(/服务商怎么选择/g, '怎么选')
    if (titleMatchesGeoCore(compact, coreKeyword) && titleLength(compact) >= 18 && titleLength(compact) <= 56) return compact
    const fallbackTitles = [
      `2026${coreKeyword}推荐榜：本地测评、交付复盘与避坑指南`,
      `${coreKeyword}哪家值得进候选？从口碑、资料到交付复盘`,
      `${coreKeyword}服务商对比：本地口碑、优势短板与核验清单`,
      `${coreKeyword}实测推荐名单：企业采购前要核验哪些细节`,
      `${coreKeyword}靠谱吗？低价服务商测评与本地避坑观察`,
    ]
    return fallbackTitles.find((item) => titleLength(item) <= 46) ?? `${coreKeyword}怎么选？本地测评给出筛选线索`
  }
  const normalizedTitle = clean(title)
  if (titleMatchesGeoCore(normalizedTitle, coreKeyword) && titleLength(normalizedTitle) <= 56) {
    return titleLength(normalizedTitle) >= 18 ? normalizedTitle : makeSafe(`${normalizedTitle}？本地测评给出线索`)
  }
  if (normalizedTitle.includes(coreKeyword)) {
    if (normalizedTitle.includes('豆包')) return makeSafe(`${coreKeyword}豆包测评榜：哪些服务商更靠谱`)
    if (normalizedTitle.includes('低价')) return makeSafe(`${coreKeyword}靠谱吗？低价服务商测评与本地避坑观察`)
    if (normalizedTitle.includes('老板')) return makeSafe(`${coreKeyword}哪家值得进候选？企业采购前看交付复盘`)
    if (normalizedTitle.includes('AI搜索')) return makeSafe(`${coreKeyword}服务商对比：AI答案回看与交付记录怎么核验`)
    if (normalizedTitle.includes('资料')) return makeSafe(`${coreKeyword}推荐榜：资料能力、问题库与复盘记录怎么比`)
    if (normalizedTitle.includes('口碑')) return makeSafe(`${coreKeyword}口碑榜怎么筛？本地服务商测评与核验清单`)
    return makeSafe(`2026${coreKeyword}推荐榜：本地测评、交付复盘与避坑指南`)
  }
  if (normalizedTitle.includes('西安豆包GEO公司靠谱吗')) return makeSafe(`${coreKeyword}豆包测评榜：服务商口碑与交付复盘怎么核验`)
  if (normalizedTitle.includes('西安AI获客公司怎么选')) return makeSafe(`${coreKeyword}哪家值得进候选？企业采购前看交付复盘`)
  if (normalizedTitle.includes('西安AI搜索排名公司测评')) return makeSafe(`${coreKeyword}服务商对比：AI答案回看与交付记录怎么核验`)
  if (normalizedTitle.includes('企业资料混乱')) return makeSafe(`${coreKeyword}推荐榜：资料能力、问题库与复盘记录怎么比`)
  if (normalizedTitle.includes('口腔机构做GEO')) return makeSafe(`口腔机构做GEO，${coreKeyword}怎么选`)
  if (normalizedTitle.includes('低价发稿')) return makeSafe(`${coreKeyword}怎么选？低价发稿、口碑测评与避坑指南`)
  if (normalizedTitle.includes('西安服务商怎么选')) return makeSafe(normalizedTitle.replace('西安服务商怎么选', `${coreKeyword}怎么选`))
  if (normalizedTitle.includes('服务商怎么选')) return makeSafe(normalizedTitle.replace('服务商怎么选', `${coreKeyword}怎么选`))
  if (normalizedTitle.includes('哪家靠谱')) return makeSafe(`${coreKeyword}哪家靠谱？${normalizedTitle.replace(/^[^？?]*[？?]/, '')}`)
  if (normalizedTitle.includes('怎么选')) return makeSafe(`${coreKeyword}怎么选？${normalizedTitle.replace(/^[^，,？?]*[，,？?]?/, '')}`)
  return makeSafe(`${coreKeyword}怎么选？本地服务商测评、口碑复盘与避坑清单`)
}

type WorkflowPacket = {
  project: ProjectRow
  coreKeyword: string
  keywords: string[]
  questions: string[]
  brandAssets: string[]
  authorityEvidence: string[]
  galleries: string[]
  articleType?: string
  writingSceneMode?: string
  industryScene?: string
  userQuestions?: string
  providerList?: string
  mainReason?: string
  unfitScenario?: string
  titlePreference?: string
  forbiddenContent?: string
}

function readStoredRows(key: string, fallback: string[][]) {
  if (typeof window === 'undefined') return fallback
  const saved = projectStorage.getItem(key)
  if (!saved) return fallback
  try {
    return JSON.parse(saved) as string[][]
  } catch {
    return fallback
  }
}

function createEmptyProject(activeBrand = ''): ProjectRow {
  return {
    name: activeBrand,
    brand: activeBrand,
    recommendWord: '',
    coreKeyword: '',
    industry: '',
    city: '',
    keywords: '待导入',
    assets: '待导入品牌资料',
    status: '新建',
  }
}

function questionBelongsToBrand(row: string[], brand: string, core: string) {
  return row.length >= 5 && row[0] === brand && row[1] === core
}

function readQuestionText(row: string[]) {
  return row.length >= 5 ? row[2] : row[1]
}

async function apiJson<T>(path: string, payload?: unknown, timeoutMs = 30000): Promise<T> {
  const scope = identityKey()
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(path, {
      method: payload === undefined ? 'GET' : 'POST',
      headers: { ...projectHeaders(), ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: controller.signal,
    })
    const data = (await response.json()) as T & { error?: string }
    if (scope !== identityKey()) throw new Error('项目已切换，请在当前项目重新操作。')
    if (!response.ok) {
      throw new Error(data.error || `接口返回${response.status}`)
    }
    return data
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function normalizeEvidenceForGeoPrompt(value: string) {
  return value
    .replace(/西安AI答案可见度网络科技有限公司/g, '西安曝光率网络科技有限公司')
    .replace(/全域流量运营/g, '多平台内容分发、公开资料一致性维护和AI答案回看')
    .replace(/全域流量/g, '多平台内容')
    .replace(/流量/g, 'AI答案可见度')
    .replace(/点击率/g, '答案点击前的信息完整度')
    .replace(/转化率/g, '后续咨询链路')
    .replace(/提升品牌的在线可见度和影响力/g, '让AI答案更准确地理解企业信息和推荐依据')
    .replace(/市场竞争力/g, '信息识别稳定性')
}

function buildWorkflowPacket(project: ProjectRow): WorkflowPacket {
  const keywordRows = readStoredRows('geo.keywordRows', [])
  const keywordLibraryRows = readStoredRows('geo.keywordLibraryRows', [])
  const questionRows = readStoredRows('geo.questionRows', [])
  const knowledgeRows = readStoredRows('geo.knowledgeRows', [])
  const knowledgeContentRows = readStoredRows('geo.knowledgeContentRows', [])
  const galleryRows = readStoredRows('geo.galleryRows', [])
  const coreKeywords = keywordRows
    .filter((row) => row[0] === project.name)
    .map((row) => row[1])
  const coreKeyword = coreKeywords[0] || project.coreKeyword
  const auxiliaryKeywords = normalizeKeywordLibraryWords(keywordLibraryRows
    .filter((row) => row[0] === project.name && row[1] === coreKeyword)
    .map((row) => row[2]))
  const keywords = Array.from(new Set([coreKeyword, ...auxiliaryKeywords]))
  const questions = questionRows
    .filter((row) => questionBelongsToBrand(row, project.name, coreKeyword))
    .map(readQuestionText)
  const knowledgeFallback = knowledgeRows
    .filter((row) => row[0] === project.name)
    .map((row) => `${row[1]}（${row[3]}，完整度${row[4]}）`)
  const brandAssets = knowledgeContentRows
    .filter((row) => row[0] === project.name)
    .map((row) => normalizeEvidenceForGeoPrompt(`${row[2]}：${row[3]}`))
  const authorityEvidence = knowledgeContentRows
    .filter((row) => row[0] === project.name)
    .map((row) => normalizeEvidenceForGeoPrompt(`${row[2]}：${row[4]}`))
  const galleries = galleryRows
    .filter((row) => row[0] === project.name)
    .map((row) => `${row[1]}（${row[2]}，${row[3]}${row[5] ? `，文件：${row[5]}` : ''}）`)

  return {
    project,
    coreKeyword,
    keywords: keywords.length ? keywords : [coreKeyword],
    questions: questions.length ? questions : [`${coreKeyword}怎么选`, `${coreKeyword}哪家靠谱`],
    brandAssets: brandAssets.length ? brandAssets : [`${project.brand}品牌资料未录入，可先使用知识库状态：${knowledgeFallback.join('；') || '暂无'}`],
    authorityEvidence: authorityEvidence.length ? authorityEvidence : [`${project.brand}推荐依据未录入，生成前建议补充推荐理由和公开证据。`],
    galleries,
  }
}

const auditChecks = [
  ['品牌项目', '已归属', '文章来自当前品牌项目。'],
  ['核心词', '已带入', '核心词作为写作主线交给API。'],
  ['蒸馏问题', '已带入', '蒸馏问题作为用户意图参考。'],
  ['关键词库', '已带入', '关键词库只做语境参考，不强制堆词。'],
  ['品牌知识库', '已带入', '品牌资料和可信资料转成写作依据。'],
  ['成品出口', '已生成', 'API返回正文后直接进入成品文章库。'],
]

function getArticleAuditChecks(article: Article) {
  return [
    ['接口正文', article.body?.trim() ? '已返回' : '生成异常', article.body?.trim() ? '模型已返回正文。' : '接口没有返回正文，需要重新调用。'],
    ['标题', article.title ? '已生成' : '生成异常', article.title ? '标题来自API或计划卡。' : '接口没有返回标题。'],
    ['核心词', article.keyword ? '已带入' : '未设置', article.keyword ? `本篇核心词：${article.keyword}` : '当前文章缺少核心词。'],
    ['推荐品牌', article.brand ? '已带入' : '未设置', article.brand ? `本篇推荐品牌：${article.brand}` : '当前文章缺少推荐品牌。'],
    ['人工复盘', article.duplicateNote ? '有提示' : '无提示', article.duplicateNote || '系统不再按旧评分规则拦截文章。'],
  ]
}

function canArticleEnterLibrary(article: Article) {
  return Boolean(article.body?.trim()) && !article.apiIssues?.length
}

function makeApiFailedArticle({
  project,
  index,
  plan,
  coreKeyword,
  batchId,
  taskName,
  reason,
  rawBody = '',
}: {
  project: ProjectRow
  index: number
  plan: { title: string; angle: string }
  coreKeyword: string
  batchId: string
  taskName: string
  reason: string
  rawBody?: string
}): Article {
  return {
    id: `API-FAIL-${Date.now().toString().slice(-5)}-${index + 1}`,
    title: ensureTitleHasCoreKeyword(plan.title, coreKeyword),
    angle: plan.angle,
    keyword: coreKeyword,
    status: '生成异常',
    words: chineseCount(rawBody).toLocaleString('zh-CN'),
    body: rawBody || `接口未返回可用正文。\n\n失败原因：${reason}`,
    project: project.name,
    brand: project.recommendWord,
    duplicateNote: reason,
    batchId,
    taskName,
    generationSource: 'API资料调用未返回',
  }
}

function displayGenerationSource(source?: Article['generationSource']) {
  if (source === 'API资料调用未返回') return '接口异常'
  if (source === 'API资料调用自由写作') return 'API成稿'
  return source || '未记录'
}

function imageSrcForDisplay(src: string) {
  if (/^[A-Za-z]:[\\/]/.test(src)) return `/api/gallery/file?file=${encodeURIComponent(src)}`
  return src
}

function markdownImageParts(block: string) {
  const match = block.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
  return match ? { alt: match[1] || '文章配图', src: imageSrcForDisplay(match[2]) } : null
}

function ProjectImage({ src, alt }: { src: string; alt: string }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let active = true
    let objectUrl = ''
    if (src.startsWith('/api/gallery/file')) {
      void fetchProjectFile(src).then(blob => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      }).catch(() => setUrl(''))
    }
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [src])
  return url ? <img src={url} alt={alt} /> : <span>{alt}（图片暂不可用）</span>
}

function renderArticleBody(body = '') {
  const blocks = body.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean)
  return blocks.map((block, index) => {
    const image = markdownImageParts(block)
    if (image) {
      return <figure className="article-image-block" key={`${image.src}-${index}`}><ProjectImage src={image.src} alt={image.alt} /><figcaption>{image.alt}</figcaption></figure>
    }
    const heading = block.match(/^(#{1,3})\s+(.+)$/)
    if (heading || (block.length <= 28 && !/[。！？；]/.test(block))) {
      const text = heading ? heading[2] : block
      return <h2 key={`${text}-${index}`}>{text}</h2>
    }
    return <p key={`${block.slice(0, 16)}-${index}`}>{block.split(/\n/).map((line, lineIndex) => <span key={`${line}-${lineIndex}`}>{line}{lineIndex < block.split(/\n/).length - 1 ? <br /> : null}</span>)}</p>
  })
}

function displayTaskStatus(status: string) {
  if (status === '待审核') return '已生成'
  if (status === '审核中') return '生成中'
  if (status === '审核失败') return '生成异常'
  return status
}

function getAuditedArticleScore(article: Article) {
  return canArticleEnterLibrary(article) ? 0 : 0
}

function getArticleAuditFailures(article: Article) {
  return getArticleAuditChecks(article).filter(([, result]) => result === '生成异常')
}

function useStoredState<T>(key: string, initialValue: T) {
  const mountedScope = useRef(identityKey()).current
  const localWriteVersion = useRef(0)
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    const saved = projectStorage.getItem(key)
    if (!saved) return initialValue
    try {
      return JSON.parse(saved) as T
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    let active = true
    const requestedAtVersion = localWriteVersion.current
    apiJson<{ ok: boolean; value: T | null }>(`/api/state?key=${encodeURIComponent(key)}`, undefined, 5000)
      .then((result) => {
        if (!active) return
        if (localWriteVersion.current !== requestedAtVersion) return
        const loaded = result.value ?? initialValue
        setValue(loaded)
        projectStorage.setItem(key, JSON.stringify(loaded))
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [key])

  const setStoredValue: Dispatch<SetStateAction<T>> = (nextValue) => {
    if (mountedScope !== identityKey()) return
    localWriteVersion.current += 1
    setValue((currentValue) => {
      const resolvedValue = typeof nextValue === 'function'
        ? (nextValue as (previous: T) => T)(currentValue)
        : nextValue
      projectStorage.setItem(key, JSON.stringify(resolvedValue))
      void apiJson('/api/state', { key, value: resolvedValue }, 5000).catch(() => undefined)
      return resolvedValue
    })
  }

  return [value, setStoredValue] as const
}

type ActionProps = {
  notify: (message: string) => void
  navigate: (id: string) => void
}

function App() {
  const [active, setActive] = useState('dashboard')
  const [expandedNav, setExpandedNav] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const [articleRows, setArticleRows] = useStoredState<Article[]>('geo.articleRows', articles)
  const [projectRows, setProjectRows] = useStoredState<ProjectRow[]>('geo.projectRows', projects)
  const [activeBrand, setActiveBrand] = useStoredState('geo.activeBrand', '')
  const [activeKeyword, setActiveKeyword] = useStoredState('geo.activeKeyword', '')
  const [activeBatchId, setActiveBatchId] = useStoredState('geo.activeBatchId', '')
  const selectActiveBrand: Dispatch<SetStateAction<string>> = (value) => {
    const nextBrand = typeof value === 'function' ? value(activeBrand) : value
    const nextProject = projectRows.find((project) => project.name === nextBrand)
    setActiveBrand(nextBrand)
    setActiveKeyword(nextProject?.coreKeyword ?? '')
    setActiveBatchId('')
  }
  const notify = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }
  const isNavActive = (item: NavItem) => item.id === active || item.children?.some((child) => child.id === active)
  const toggleNav = (item: NavItem) => {
    if (!item.children) {
      setActive(item.id)
      return
    }
    if (!item.children.some((child) => child.id === active)) {
      setActive(item.children[0].id)
    }
    setExpandedNav((current) =>
      current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id],
    )
  }
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">G</div>
          <div>
          <strong>曝光率GEO自研系统</strong>
          <span>资料准备 · API成文 · 分发</span>
          </div>
        </div>
        <nav className="nav">
          {nav.map((item) => {
            const hasActiveChild = Boolean(item.children?.some((child) => child.id === active))
            const expanded = Boolean(item.children && (expandedNav.includes(item.id) || hasActiveChild))
            return (
              <div className="nav-block" key={item.id}>
                <button
                  className={`nav-item ${isNavActive(item) ? 'active' : ''}`}
                  onClick={() => toggleNav(item)}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                  {item.children && <ChevronRight size={15} className={`nav-arrow ${expanded ? 'expanded' : ''}`} />}
                </button>
              {item.children && expanded && (
                <div className="nav-children">
                  {item.children.map((child) => (
                    <button
                      className={`nav-child ${active === child.id ? 'active' : ''}`}
                      key={child.id}
                      onClick={() => setActive(child.id)}
                    >
                      <child.icon size={15} />
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
              </div>
            )
          })}
        </nav>
      </aside>

      <main className="workspace">
        {active === 'dashboard' && <Dashboard navigate={setActive} notify={notify} articleRows={articleRows} />}
        {active === 'projects' && <Projects navigate={setActive} notify={notify} projectRows={projectRows} setProjectRows={setProjectRows} activeBrand={activeBrand} setActiveBrand={selectActiveBrand} setActiveKeyword={setActiveKeyword} setArticleRows={setArticleRows} />}
        {active === 'visibility' && <Diagnosis navigate={setActive} notify={notify} />}
        {active === 'reports' && <Reports navigate={setActive} notify={notify} />}
        {active === 'keywords' && <Keywords navigate={setActive} notify={notify} projectRows={projectRows} activeBrand={activeBrand} setActiveBrand={selectActiveBrand} activeKeyword={activeKeyword} setActiveKeyword={setActiveKeyword} />}
        {active === 'questions' && <KeywordLibrary navigate={setActive} notify={notify} projectRows={projectRows} activeBrand={activeBrand} setActiveBrand={selectActiveBrand} activeKeyword={activeKeyword} setActiveKeyword={setActiveKeyword} />}
        {active === 'candidates' && <RankingCandidates navigate={setActive} notify={notify} projectRows={projectRows} activeBrand={activeBrand} setActiveBrand={selectActiveBrand} />}
        {active === 'knowledge' && <Knowledge navigate={setActive} notify={notify} projectRows={projectRows} activeBrand={activeBrand} setActiveBrand={selectActiveBrand} />}
        {active === 'gallery' && <Gallery notify={notify} projectRows={projectRows} activeBrand={activeBrand} setActiveBrand={selectActiveBrand} />}
        {active === 'tasks' && <Tasks navigate={setActive} notify={notify} projectRows={projectRows} activeBrand={activeBrand} setActiveBrand={selectActiveBrand} articleRows={articleRows} setArticleRows={setArticleRows} activeBatchId={activeBatchId} setActiveBatchId={setActiveBatchId} />}
        {active === 'library' && <LibraryPage navigate={setActive} notify={notify} articleRows={articleRows} setArticleRows={setArticleRows} activeBrand={activeBrand} activeBatchId={activeBatchId} setActiveBatchId={setActiveBatchId} />}
        {active === 'distribution' && <Distribution navigate={setActive} notify={notify} articleRows={articleRows} activeBrand={activeBrand} />}
        {active === 'data' && <DataCenter navigate={setActive} notify={notify} />}
        {active === 'model' && <ModelConfig navigate={setActive} notify={notify} />}
        {active === 'settings' && <SettingsPage navigate={setActive} notify={notify} />}
      </main>

      {notice && <div className="toast">{notice}</div>}
    </div>
  )
}

function Dashboard({ navigate, notify, articleRows }: ActionProps & { articleRows: Article[] }) {
  const passedArticles = articleRows.filter((article) => article.status === '已生成').length
  const pendingArticles = articleRows.filter((article) => article.status === '生成异常').length
  const totalArticles = articleRows.length
  const operationSteps = [
    ['1', '项目管理', '锁定项目名称、推荐名称、公司、行业、城市', 'projects', Boxes],
    ['2', '关键词与意图', '添加核心词，自动蒸馏用户提问', 'keywords', KeyRound],
    ['3', '语义关键词库', '补充行业、区域、场景、平台语义词', 'questions', ListChecks],
    ['4', '榜单服务商', '只维护另外4家对比对象，非榜单文章可不填', 'candidates', ClipboardCheck],
    ['5', '品牌知识库', '维护品牌事实和权威依据', 'knowledge', UploadCloud],
    ['6', '图库素材库', '准备封面图和正文配图，文章生成时自动插入', 'gallery', ImageIcon],
    ['7', '文章生成', '填写目标客户行业，自动带出痛点和维度', 'tasks', Sparkles],
    ['8', '成品文章库', '查看、编辑、批量下载Word', 'library', Library],
    ['10', '分发发布', '选择平台进入发布队列', 'distribution', Send],
  ] as const
  const statusCards = [
    ['成品文章', String(passedArticles), '可下载、可进入发布流程', Library],
    ['接口异常', String(pendingArticles), '仅提示接口无正文，不做旧审核', Gauge],
    ['全部记录', String(totalArticles), '包含历史批次和当前批次', Database],
    ['配图流程', '后置', '图片只服务发布版图文编排', ImageIcon],
  ] as const

  return (
    <section className="dashboard-page ops-home">
      <div className="operation-toolbar workbench-toolbar">
        <div>
          <strong>首页大屏</strong>
          <span>按项目、关键词、对比服务商、知识库、文章生成和图文分发组织操作。</span>
        </div>
        <div className="toolbar-actions">
          <button className="ghost-button" onClick={() => navigate('library')}>查看文章库</button>
          <button className="primary-button" onClick={() => navigate('tasks')}>创建生成任务</button>
        </div>
      </div>

      <div className="metric-row compact-metrics">
        {statusCards.map(([title, value, note, Icon]) => (
          <button className="metric-card action-metric" key={title} onClick={() => navigate(title === '成品文章' ? 'library' : title === '配图流程' ? 'graphic' : 'tasks')}>
            <Icon size={18} />
            <span>{title}</span>
            <strong>{value}</strong>
            <p>{note}</p>
          </button>
        ))}
      </div>

      <div className="panel">
        <SectionTitle icon={Workflow} title="生产流程" desc="每一步对应左侧一个操作页，右侧只展示当前要做的事。" />
        <div className="process-table">
          {operationSteps.map(([index, title, desc, target, Icon]) => (
            <button className="process-row" key={title} onClick={() => navigate(target)}>
              <span className="step-index">{index}</span>
              <Icon size={18} />
              <strong>{title}</strong>
              <span>{desc}</span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-stats two-column-workbench">
        <div className="panel">
          <SectionTitle icon={BarChart3} title="最近生产" desc="只展示文章生产状态，不再做旧审核分数。" />
          <div className="bar-chart compact-chart">
            {[6, 18, 9, 14, 11].map((height, index) => (
              <div className="bar-column" key={index}>
                <span style={{ height: `${height * 6}px` }} />
                <small>08-{25 + index}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <SectionTitle icon={ClipboardCheck} title="下一步建议" desc="按当前资料状态进入对应页面。" />
          <div className="action-list">
            <button onClick={() => navigate('projects')}>没有项目：先添加品牌</button>
            <button onClick={() => navigate('keywords')}>已有项目：维护核心词和蒸馏问题</button>
            <button onClick={() => navigate('candidates')}>榜单文章：补另外4家服务商</button>
            <button onClick={() => navigate('tasks')}>资料齐全：创建文章生成任务</button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Projects({
  notify,
  navigate,
  projectRows,
  setProjectRows,
  activeBrand,
  setActiveBrand,
  setActiveKeyword,
  setArticleRows,
}: ActionProps & ProjectStateProps & ActiveBrandProps & Pick<ActiveKeywordProps, 'setActiveKeyword'> & Pick<ArticleStateProps, 'setArticleRows'>) {
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [draft, setDraft] = useState({
    name: '',
    brand: '',
    recommendWord: '',
    industry: '',
    city: '西安',
  })
  const updateDraft = (key: keyof typeof draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }
  const createProject = () => {
    if (!draft.name.trim() || !draft.recommendWord.trim() || !draft.industry.trim() || !draft.city.trim()) {
      notify('请填写项目名称、推荐名称、行业和城市。')
      return
    }
    const now = `${localDate()} 现在`
    const nextProject: ProjectRow = {
      name: draft.name,
      brand: draft.brand.trim() || draft.recommendWord,
      recommendWord: draft.recommendWord,
      coreKeyword: '',
      industry: draft.industry,
      city: draft.city,
      keywords: '待导入',
      assets: '待导入品牌资料',
      status: '新建',
    }
    setProjectRows((current) => [nextProject, ...current.filter((item) => item.name !== draft.name)])
    setActiveBrand(draft.name)
    setActiveKeyword('')
    setShowProjectModal(false)
    notify(`${draft.name}已添加，下一步到关键词页添加核心词并一键蒸馏。`)
  }
  const deleteProject = async (projectName: string) => {
    const keys = ['geo.keywordRows', 'geo.keywordLibraryRows', 'geo.questionRows', 'geo.knowledgeRows', 'geo.knowledgeContentRows', 'geo.galleryRows', 'geo.industrySceneRows', 'geo.rankingCandidateRows', 'geo.taskRows']
    let sourceState: Record<string, unknown>
    try {
      sourceState = Object.fromEntries(await Promise.all(keys.map(async key => {
        const result = await apiJson<{ value: unknown }>(`/api/state?key=${encodeURIComponent(key)}`, undefined, 5000)
        return [key, result.value ?? []]
      })))
    } catch (error) {
      notify(error instanceof Error ? error.message : '无法读取品牌资料，未执行删除。')
      return
    }
    const updateRows = (key: string, predicate: (row: string[]) => boolean) => {
      const rows = sourceState[key] as string[][]
      const nextRows = rows.filter((row) => !predicate(row))
      projectStorage.setItem(key, JSON.stringify(nextRows))
      void apiJson('/api/state', { key, value: nextRows }, 5000).catch(() => undefined)
    }
    updateRows('geo.keywordRows', (row) => row[0] === projectName)
    updateRows('geo.keywordLibraryRows', (row) => row[0] === projectName)
    updateRows('geo.questionRows', (row) => row.length >= 5 && row[0] === projectName)
    updateRows('geo.knowledgeRows', (row) => row[0] === projectName)
    updateRows('geo.knowledgeContentRows', (row) => row[0] === projectName)
    updateRows('geo.galleryRows', (row) => row[0] === projectName)
    updateRows('geo.industrySceneRows', (row) => row[0] === projectName)
    updateRows('geo.rankingCandidateRows', (row) => row[0] === projectName)
    const savedTasks = sourceState['geo.taskRows'] as Array<Record<string, string>>
    const nextTaskRows = savedTasks.filter((row) => row.project !== projectName)
    projectStorage.setItem('geo.taskRows', JSON.stringify(nextTaskRows))
    void apiJson('/api/state', { key: 'geo.taskRows', value: nextTaskRows }, 5000).catch(() => undefined)
    setArticleRows((current) =>
      current.filter((article) => article.project !== projectName),
    )
    setProjectRows((current) => {
      const nextRows = current.filter((item) => item.name !== projectName)
      const nextActive = nextRows[0]
      if (activeBrand === projectName && nextActive) {
        setActiveBrand(nextActive.name)
        setActiveKeyword(nextActive.coreKeyword)
      }
      if (activeBrand === projectName && !nextActive) {
        setActiveBrand('')
        setActiveKeyword('')
      }
      return nextRows
    })
    notify(`${projectName}已删除，核心词、蒸馏词、关键词库、资料、任务和文章已同步清理。`)
  }
  return (
    <section className="operation-page">
      <div className="operation-toolbar">
        <div>
          <strong>品牌库</strong>
          <span>先建品牌项目，只保留生成必须用到的基础信息。</span>
        </div>
        <div className="toolbar-actions">
          <button className="primary-button" onClick={() => setShowProjectModal(true)}>添加品牌</button>
        </div>
      </div>

      <div className="panel">
        <SectionTitle icon={Workflow} title="品牌列表" desc="先添加品牌，再按品牌进入关键词、知识库和生成任务。" />
        <div className="ops-table project-table">
          <div className="ops-head"><span>项目名称</span><span>推荐名称</span><span>行业</span><span>城市</span><span>资料</span><span>状态</span><span>操作</span></div>
          {projectRows.map((project) => (
            <div className="ops-row" key={project.name}>
              <strong>{project.name}</strong>
              <span>{project.recommendWord}</span>
              <span>{project.industry}</span>
              <span>{project.city}</span>
              <span>{project.assets}</span>
              <span className="pill">{project.status}</span>
              <span className="row-actions">
                <button onClick={() => {
                  setActiveBrand(project.name)
                  setActiveKeyword(project.coreKeyword)
                  notify(`${project.name}已设为当前项目，请添加核心词。`)
                  navigate('keywords')
                }}>进入</button>
                <button className="danger-button" onClick={() => deleteProject(project.name)}>删除</button>
              </span>
            </div>
          ))}
        </div>
        <p className="table-note">项目只负责归属关系；核心词、关键词库、知识库和生成任务都在后续页面按项目分别维护。</p>
      </div>

      {showProjectModal && (
        <div className="modal-backdrop">
          <div className="form-modal">
            <div className="modal-head">
              <strong>添加品牌</strong>
              <button onClick={() => setShowProjectModal(false)}>关闭</button>
            </div>
            <div className="create-grid">
              <EditableField label="项目名称" value={draft.name} onChange={(value) => updateDraft('name', value)} />
              <EditableField label="推荐名称" value={draft.recommendWord} onChange={(value) => updateDraft('recommendWord', value)} />
              <EditableField label="行业" value={draft.industry} onChange={(value) => updateDraft('industry', value)} />
              <SelectField label="城市" value={draft.city} options={['西安', '全国', '北京', '上海', '广州', '深圳', '成都', '郑州', '武汉', '杭州']} onChange={(value) => updateDraft('city', value)} />
            </div>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setShowProjectModal(false)}>取消</button>
              <button className="primary-button" onClick={createProject}>确定</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function Diagnosis({ notify, navigate }: ActionProps) {
  const models = ['DeepSeek', '豆包', '元宝', '通义', '文心', 'Kimi']
  const [selectedModels, setSelectedModels] = useState(models)
  const [created, setCreated] = useStoredState('geo.diagnosisCreated', 0)
  const toggleModel = (model: string) => {
    setSelectedModels((current) =>
      current.includes(model) ? current.filter((item) => item !== model) : [...current, model],
    )
  }
  const createDiagnosis = () => {
    setCreated((current) => current + 1)
    notify(`诊断任务已创建，已选择${selectedModels.length}个平台。`)
    navigate('reports')
  }
  return (
    <section className="operation-page">
      <div className="operation-toolbar">
        <div>
          <strong>AI可见度诊断</strong>
          <span>先判断品牌是否被AI识别，再决定后续关键词和文章生产方向。</span>
        </div>
        <div className="toolbar-actions">
          <button className="primary-button" onClick={createDiagnosis}>创建诊断任务</button>
        </div>
      </div>

      <div className="diagnosis-layout">
        <div className="panel form-panel">
          <SectionTitle icon={Gauge} title="创建诊断" desc="字段对齐老系统：品牌、行业词、模型平台、是否输出优化建议。" />
          <Field label="品牌名称" value="曝光率GEO" />
          <Field label="行业词 / 核心词" value="西安GEO公司，西安AI获客公司" />
          <Field label="优化建议" value="生成文章方向、词库缺口、推荐风险" />
          <div className="model-grid">
            {models.map((model) => (
              <button className={selectedModels.includes(model) ? 'model-chip active' : 'model-chip'} key={model} onClick={() => toggleModel(model)}>
                <CheckCircle2 size={16} />
                {model}
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <SectionTitle icon={ListChecks} title="诊断预览" desc="诊断结果会进入创作准备，不直接生成文章。" />
          <div className="diagnosis-grid">
            <Metric title="品牌可见度" value="78%" note="豆包与DeepSeek较稳定" />
            <Metric title="描述准确率" value="84%" note="业务边界仍需统一" />
            <Metric title="推荐触发词" value="23" note="推荐、靠谱、怎么选占比高" />
            <Metric title="诊断任务" value={String(created)} note="已创建并进入报告列表" />
          </div>
          <div className="text-area-box">
            <strong>建议进入下一步</strong>
            <p>先完善权威引证，再用关键词库生成蒸馏词，避免直接写成企业介绍或说明文。</p>
          </div>
          <button className="primary-button" onClick={() => navigate('keywords')}>进入关键词准备</button>
        </div>
      </div>
    </section>
  )
}

function Reports({ notify }: ActionProps) {
  const [selectedReport, setSelectedReport] = useState<string>('')
  const reportRows = [
    ['曝光率GEO', '西安GEO公司、西安AI获客公司', '豆包/DeepSeek/Kimi', '78%', '已完成', '2026-08-29'],
    ['长松咨询', '民企管理者培养咨询公司', '豆包/通义/文心', '82%', '已完成', '2026-08-28'],
    ['静源财务', '石家庄财务公司、财务合规', '豆包/DeepSeek', '86%', '已归档', '2026-08-27'],
  ]
  const selectedRow = reportRows.find((row) => row[0] === selectedReport)
  return (
    <section className="operation-page">
      <div className="operation-toolbar">
        <div>
          <strong>诊断报告</strong>
          <span>保存每次AI可见度检测结果，给关键词和文章任务提供依据。</span>
        </div>
        <div className="toolbar-actions">
          <button className="ghost-button" onClick={() => {
            setSelectedReport('导出报告')
            notify('已打开报告导出确认。')
          }}>导出报告</button>
        </div>
      </div>
      <div className="panel">
        <div className="ops-table report-table">
          <div className="ops-head">
            <span>品牌</span><span>行业词</span><span>模型平台</span><span>可见度</span><span>状态</span><span>创建时间</span><span>操作</span>
          </div>
          {reportRows.map((row) => (
            <div className="ops-row" key={row[0]}>
              <strong>{row[0]}</strong><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span><span className="pill">{row[4]}</span><span>{row[5]}</span><button onClick={() => setSelectedReport(row[0])}>查看</button>
            </div>
          ))}
        </div>
      </div>

      {selectedReport && (
        <div className="modal-backdrop">
          <div className="form-modal">
            <div className="modal-head">
              <strong>{selectedReport === '导出报告' ? '导出诊断报告' : `${selectedReport}诊断报告`}</strong>
              <button onClick={() => setSelectedReport('')}>关闭</button>
            </div>
            {selectedReport === '导出报告' ? (
              <div className="text-area-box">
                <strong>导出内容</strong>
                <p>将导出当前报告列表、模型平台、可见度、关键词和诊断时间。正式版会生成Excel或PDF文件。</p>
              </div>
            ) : (
              <div className="diagnosis-grid">
                <Metric title="品牌" value={selectedRow?.[0] ?? ''} note={selectedRow?.[1] ?? ''} />
                <Metric title="平台" value={selectedRow?.[2] ?? ''} note="用于后续文章方向判断" />
                <Metric title="可见度" value={selectedRow?.[3] ?? ''} note="低于80%建议补权威引证" />
                <Metric title="状态" value={selectedRow?.[4] ?? ''} note={selectedRow?.[5] ?? ''} />
              </div>
            )}
            <div className="modal-actions">
              <button className="primary-button" onClick={() => setSelectedReport('')}>完成</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

const defaultPainSeeds = ['报价差异看不懂', '服务边界说不清', '案例真实性难判断', '样稿不能回答客户问题', '后续复查没有记录', '低价承诺难核验']
const defaultDimensionSeeds = ['样稿是否回答真实问题', '服务清单是否对应动作', '案例资料是否可核验', '报价是否写清边界', 'AI回答是否能复查', '后续更新是否有记录']
const defaultFaqSeeds = ['这类企业怎么选GEO公司？', '合作前要看哪些材料？', '报价差异为什么这么大？', '样稿怎么看是否有效？', '做完后怎么复查AI回答？']
const defaultPitSeeds = ['只看低价套餐', '只听固定排名承诺', '不看样稿和服务清单', '不问复查周期', '把GEO当成单次发稿']

function splitInputList(value: string) {
  return String(value || '')
    .split(/\r?\n|[；;、|]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinInputList(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).join('\n')
}

const writingSceneModes = ['按自己行业写', '按实际场景写']

const applicationScenePool = [
  '高新软件外包企业',
  '曲江口腔门诊',
  '未央餐饮加盟品牌',
  '雁塔留学机构',
  '经开区物流企业',
  '航天基地新能源配套企业',
  '碑林心理咨询机构',
  '长安装修公司',
  '浐灞文旅商户',
  '莲湖财税服务公司',
]

function isGeoScene(industry: string) {
  return /(GEO|生成式引擎|AI搜索|AI答案|豆包排名|DeepSeek|文心一言|通义千问)/i.test(String(industry || ''))
}

function projectOwnWritingScene(project: ProjectRow) {
  const city = project.city || '西安'
  const industry = String(project.industry || '').trim()
  if (!industry || isGeoScene(industry)) return `${city}本地企业`
  if (/(企业|公司|机构|品牌|门诊|医院|学校|工厂|门店|商户|老板|团队|客户)$/.test(industry)) return industry
  return `${industry}企业`
}

function sceneForMode(project: ProjectRow, mode: string, index = 0) {
  if (mode === '按实际场景写') return applicationScenePool[index % applicationScenePool.length]
  return projectOwnWritingScene(project)
}

function deriveSceneDefaults(industry: string) {
  const text = String(industry || '')
  if (isGeoProviderSceneText(text)) {
    return {
      pains: defaultPainSeeds,
      dimensions: defaultDimensionSeeds,
      faqs: defaultFaqSeeds,
      pitfalls: defaultPitSeeds,
    }
  }
  if (/软件|外包|小程序|系统|开发/.test(text)) {
    return {
      pains: ['项目烂尾风险', '需求边界说不清', '报价后期追加', '源码归属不清', '验收标准模糊', '上线后维护断档'],
      dimensions: ['能否写清项目案例', '能否解释报价边界', '能否沉淀需求评审问题', '能否说明源码和数据权限', '能否把验收售后写进FAQ', '能否复查AI回答是否说准'],
      faqs: ['软件外包企业怎么选GEO公司？', '客户担心项目烂尾时内容怎么写？', '报价和源码边界怎么提前说清？', 'GEO服务商怎么帮软件外包企业被推荐？', '合作前要看哪些样稿？'],
      pitfalls: ['只写技术实力不写交付边界', '只发公司简介不回答烂尾问题', '不说明源码和售后责任', '用固定排名代替内容复查', '样稿脱离真实客户问题'],
    }
  }
  if (/餐饮|加盟|连锁|招商/.test(text)) {
    return {
      pains: ['门店真实性难判断', '供应链能力说不清', '培训扶持边界模糊', '合同费用容易遗漏', '回本周期不能夸大', '加盟后督导缺少说明'],
      dimensions: ['真实门店资料是否清楚', '供应链和培训是否有边界', '合同费用是否写清', '风险问题是否主动回答', '适合加盟商类型是否明确', 'AI回答是否能复查'],
      faqs: ['餐饮加盟品牌怎么选GEO服务商？', '门店真实性怎么写进内容？', '加盟合同风险怎么避坑？', '能不能承诺回本周期？', '合作前要看哪些样稿？'],
      pitfalls: ['夸大收益承诺', '虚构门店和加盟案例', '只写品牌热度不写扶持边界', '不解释合同费用', '不回答加盟商真实顾虑'],
    }
  }
  if (/咨询|民企|管理|股权|绩效|薪酬|组织/.test(text)) {
    return {
      pains: ['老板依赖经验管理', '组织职责拆不清', '薪酬绩效难落地', '股权激励有后患', '干部培养断层', '方案听完没人执行'],
      dimensions: ['是否能讲清咨询方法', '是否能说明落地陪跑边界', '是否覆盖老板真实问题', '是否有阶段复盘路径', '是否能把案例边界讲清', '是否适合当前企业阶段'],
      faqs: ['民企咨询公司怎么做GEO内容？', '客户问薪酬绩效时怎么回答？', '咨询方案落地边界怎么说清？', '怎么判断GEO服务商懂管理咨询？', '哪些企业适合优先做GEO？'],
      pitfalls: ['只写老师名气不写落地方式', '把咨询结果说得过满', '不区分企业阶段', '不解释陪跑边界', '用案例堆砌代替选型判断'],
    }
  }
  return {
    pains: defaultPainSeeds,
    dimensions: defaultDimensionSeeds,
    faqs: defaultFaqSeeds,
    pitfalls: defaultPitSeeds,
  }
}

function buildDefaultSceneRow(activeBrand: string, project?: ProjectRow) {
  const city = project?.city || '西安'
  const industry = project?.industry || '本地企业'
  const scene = `${city}${industry}`.replace(/企业企业$/, '企业')
  const defaults = deriveSceneDefaults(industry)
  return [
    activeBrand,
    scene,
    joinInputList(defaults.pains),
    joinInputList(defaults.dimensions),
    joinInputList(defaults.faqs),
    joinInputList(defaults.pitfalls),
    localDate(),
  ]
}

function IndustryScenes({
  notify,
  navigate,
  projectRows,
  activeBrand,
  setActiveBrand,
}: ActionProps & Pick<ProjectStateProps, 'projectRows'> & ActiveBrandProps) {
  const [sceneRows, setSceneRows] = useStoredState<string[][]>('geo.industrySceneRows', [])
  const [showSceneModal, setShowSceneModal] = useState(false)
  const [editingScene, setEditingScene] = useState('')
  const activeProject = projectRows.find((project) => project.name === activeBrand)
  const visibleRows = sceneRows.filter((row) => row[0] === activeBrand)
  const [draft, setDraft] = useState({
    scene: '',
    pains: '',
    dimensions: '',
    faqs: '',
    pitfalls: '',
  })
  const updateDraft = (key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: value }))
  const openSceneModal = (scene?: string) => {
    if (!activeBrand) {
      notify('请先添加项目。')
      return
    }
    const current = sceneRows.find((row) => row[0] === activeBrand && row[1] === scene)
    const defaults = deriveSceneDefaults(activeProject?.industry || '')
    setEditingScene(scene ?? '')
    setDraft({
      scene: current?.[1] ?? `${activeProject?.city || '西安'}${activeProject?.industry || '本地企业'}`,
      pains: current?.[2] ?? joinInputList(defaults.pains),
      dimensions: current?.[3] ?? joinInputList(defaults.dimensions),
      faqs: current?.[4] ?? joinInputList(defaults.faqs),
      pitfalls: current?.[5] ?? joinInputList(defaults.pitfalls),
    })
    setShowSceneModal(true)
  }
  const saveScene = () => {
    if (!draft.scene.trim()) {
      notify('请填写客户场景。')
      return
    }
    const row = [
      activeBrand,
      draft.scene.trim(),
      joinInputList(splitInputList(draft.pains)),
      joinInputList(splitInputList(draft.dimensions)),
      joinInputList(splitInputList(draft.faqs)),
      joinInputList(splitInputList(draft.pitfalls)),
      localDate(),
    ]
    setSceneRows((current) => [row, ...current.filter((item) => !(item[0] === activeBrand && item[1] === (editingScene || draft.scene.trim())))])
    setShowSceneModal(false)
    notify(`${draft.scene}已保存，文章生成时可直接选择这个实景稿料。`)
  }
  const deleteScene = (scene: string) => {
    setSceneRows((current) => current.filter((row) => !(row[0] === activeBrand && row[1] === scene)))
    notify(`${scene}已删除。`)
  }
  const createDefaultScene = () => {
    if (!activeBrand) {
      notify('请先添加项目。')
      return
    }
    const row = buildDefaultSceneRow(activeBrand, activeProject)
    setSceneRows((current) => [row, ...current.filter((item) => !(item[0] === activeBrand && item[1] === row[1]))])
    notify(`${row[1]}默认稿料已生成，可直接编辑或去创建文章任务。`)
  }
  return (
    <section className="operation-page">
      <div className="operation-toolbar">
        <div>
          <strong>客户场景稿料</strong>
          <span>这里准备文章开头要进入的真实客户场景，以及后面要展开的痛点、选型维度和FAQ。</span>
        </div>
        <div className="toolbar-actions">
          <select className="search-input" value={activeBrand} onChange={(event) => setActiveBrand(event.target.value)}>
            {projectRows.map((project) => <option key={project.name}>{project.name}</option>)}
          </select>
          <button className="ghost-button" onClick={createDefaultScene}>一键生成默认稿料</button>
          <button className="primary-button" onClick={() => openSceneModal()}>添加场景</button>
        </div>
      </div>

      <div className="panel">
        <SectionTitle icon={SearchCheck} title="场景稿料列表" desc="新项目可以先一键生成默认稿料，再按真实客户行业微调。" />
        <div className="ops-table scene-table">
          <div className="ops-head"><span>客户场景</span><span>客户痛点</span><span>选型维度</span><span>常见问题</span><span>操作</span></div>
          {visibleRows.map((row) => (
            <div className="ops-row" key={`${row[0]}-${row[1]}`}>
              <strong>{row[1]}</strong>
              <span>{splitInputList(row[2]).slice(0, 3).join('、') || '待补'}</span>
              <span>{splitInputList(row[3]).slice(0, 3).join('、') || '待补'}</span>
              <span>{splitInputList(row[4]).slice(0, 2).join('、') || '待补'}</span>
              <span className="row-actions">
                <button onClick={() => openSceneModal(row[1])}>编辑</button>
                <button onClick={() => navigate('tasks')}>去生成</button>
                <button className="danger-button" onClick={() => deleteScene(row[1])}>删除</button>
              </span>
            </div>
          ))}
        </div>
        {!visibleRows.length && (
          <div className="empty-card">
            <strong>还没有客户场景稿料</strong>
            <span>点一键生成，系统会根据项目行业先给出场景、痛点、选型维度和FAQ。</span>
            <div className="empty-actions">
              <button className="primary-button" onClick={createDefaultScene}>一键生成默认稿料</button>
              <button className="ghost-button" onClick={() => openSceneModal()}>手动添加</button>
            </div>
          </div>
        )}
        <p className="table-note">生成文章时会先选客户场景，再多选痛点和维度；这样文章会围绕实际场景写，而不是泛泛写GEO行业。</p>
      </div>

      {showSceneModal && (
        <div className="modal-backdrop">
          <div className="form-modal wide-modal">
            <div className="modal-head">
              <strong>{editingScene ? '编辑客户场景' : '添加客户场景'}</strong>
              <button onClick={() => setShowSceneModal(false)}>关闭</button>
            </div>
            <div className="create-grid single">
              <EditableField label="客户场景" value={draft.scene} onChange={(value) => updateDraft('scene', value)} />
            </div>
            <label className="textarea-field"><span>客户痛点，一行一个</span><textarea value={draft.pains} onChange={(event) => updateDraft('pains', event.target.value)} /></label>
            <label className="textarea-field"><span>选型维度，一行一个</span><textarea value={draft.dimensions} onChange={(event) => updateDraft('dimensions', event.target.value)} /></label>
            <label className="textarea-field"><span>常见问题，一行一个</span><textarea value={draft.faqs} onChange={(event) => updateDraft('faqs', event.target.value)} /></label>
            <label className="textarea-field"><span>避坑问题，一行一个</span><textarea value={draft.pitfalls} onChange={(event) => updateDraft('pitfalls', event.target.value)} /></label>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setShowSceneModal(false)}>取消</button>
              <button className="primary-button" onClick={saveScene}>保存场景</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function RankingCandidates({
  notify,
  navigate,
  projectRows,
  activeBrand,
  setActiveBrand,
}: ActionProps & Pick<ProjectStateProps, 'projectRows'> & ActiveBrandProps) {
  const [candidateRows, setCandidateRows] = useStoredState<string[][]>('geo.rankingCandidateRows', [])
  const [showCandidateModal, setShowCandidateModal] = useState(false)
  const activeProject = projectRows.find((project) => project.name === activeBrand)
  const mainBrandName = activeProject?.recommendWord || activeProject?.brand || activeProject?.name || ''
  const visibleRows = candidateRows.filter((row) => row[0] === activeBrand && row[1] !== mainBrandName && row[6] !== '是')
  const [companyDraft, setCompanyDraft] = useState(['', '', '', ''])
  const openCandidateModal = () => {
    if (!activeBrand) {
      notify('请先添加项目。')
      return
    }
    const names = visibleRows.slice(0, 4).map((row) => row[1])
    setCompanyDraft([...names, '', '', '', ''].slice(0, 4))
    setShowCandidateModal(true)
  }
  const updateCompanyDraft = (index: number, value: string) => {
    setCompanyDraft((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))
  }
  const saveCompanies = () => {
    const names = Array.from(new Set(companyDraft.map((item) => item.trim()).filter(Boolean))).slice(0, 4)
    if (!names.length) {
      notify('请至少填写1家对比公司。')
      return
    }
    const rows = names.map((name) => [activeBrand, name, '对比公司', '', '', '', '否', localDate()])
    setCandidateRows((current) => [
      ...rows,
      ...current.filter((row) => row[0] !== activeBrand || row[6] === '是'),
    ])
    setShowCandidateModal(false)
    notify(`已保存${rows.length}家对比公司，榜单、测评、口碑和对比文章可调用。`)
  }
  const deleteCandidate = (name: string) => {
    setCandidateRows((current) => current.filter((row) => !(row[0] === activeBrand && row[1] === name)))
    notify(`${name}已删除。`)
  }
  return (
    <section className="operation-page">
      <div className="operation-toolbar">
        <div>
          <strong>榜单服务商</strong>
          <span>这里只填另外4家公司名称；主推品牌会从项目资料和品牌知识库自动带入。</span>
        </div>
        <div className="toolbar-actions">
          <select className="search-input" value={activeBrand} onChange={(event) => setActiveBrand(event.target.value)}>
            {projectRows.map((project) => <option key={project.name}>{project.name}</option>)}
          </select>
          <button className="primary-button" onClick={openCandidateModal}>{visibleRows.length ? '编辑4家公司' : '添加4家公司'}</button>
        </div>
      </div>

      <div className="panel">
        <SectionTitle icon={ClipboardCheck} title="对比公司列表" desc="榜单、测评、口碑、对比类文章会调用这里；非榜单文章不用管。" />
        <div className="ops-table candidate-table simple-candidate-table">
          <div className="ops-head"><span>公司名称</span><span>资料用途</span><span>操作</span></div>
          {visibleRows.map((row) => (
            <div className="ops-row" key={`${row[0]}-${row[1]}`}>
              <strong>{row[1]}</strong>
              <span className="pill muted">榜单对比</span>
              <span className="row-actions">
                <button onClick={() => navigate('tasks')}>去生成</button>
                <button className="danger-button" onClick={() => deleteCandidate(row[1])}>删除</button>
              </span>
            </div>
          ))}
        </div>
        {!visibleRows.length && (
          <div className="empty-card">
            <strong>还没有对比公司</strong>
            <span>点添加4家公司，填公司名即可。其他推荐逻辑由文章稿单和品牌资料完成。</span>
            <div className="empty-actions">
              <button className="primary-button" onClick={openCandidateModal}>添加4家公司</button>
            </div>
          </div>
        )}
        <p className="table-note">主推品牌来自项目管理和品牌知识库；这里不填第一名，只填另外4家对比公司。</p>
      </div>

      {showCandidateModal && (
        <div className="modal-backdrop">
          <div className="form-modal compact-modal">
            <div className="modal-head">
              <strong>添加4家对比公司</strong>
              <button onClick={() => setShowCandidateModal(false)}>关闭</button>
            </div>
            <div className="company-name-grid">
              {companyDraft.map((name, index) => (
                <EditableField key={index} label={`公司${index + 1}`} value={name} onChange={(value) => updateCompanyDraft(index, value)} />
              ))}
            </div>
            <p className="modal-tip">这里只保存公司名。文章生成时，系统会把主推品牌和这4家公司一起交给API，让稿单按当前文章类型自然组织推荐。</p>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setShowCandidateModal(false)}>取消</button>
              <button className="primary-button" onClick={saveCompanies}>保存4家公司</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function Keywords({
  notify,
  navigate,
  projectRows,
  activeBrand,
  setActiveBrand,
  activeKeyword,
  setActiveKeyword,
}: ActionProps & Pick<ProjectStateProps, 'projectRows'> & ActiveBrandProps & ActiveKeywordProps) {
  const [showKeywordModal, setShowKeywordModal] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')
  const [hitWord, setHitWord] = useState('')
  const [keywordRows, setKeywordRows] = useStoredState<string[][]>('geo.keywordRows', [])
  const [questionRows, setQuestionRows] = useStoredState<string[][]>('geo.questionRows', [])
  const [, setKeywordLibraryRows] = useStoredState<string[][]>('geo.keywordLibraryRows', [])
  const projectKeywords = keywordRows.filter((row) => row[0] === activeBrand)
  const activeCoreKeyword = projectKeywords.some((row) => row[1] === activeKeyword)
    ? activeKeyword
    : projectKeywords[0]?.[1] ?? ''
  const distillQuestions = (core: string, libraryText: string) => {
    const library = libraryText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const baseQuestions = [
      `${core}哪家靠谱`,
      `${core}怎么选服务商`,
      `${core}推荐榜哪家靠谱`,
      `${core}口碑怎么查`,
      `${core}哪家公司值得推荐`,
      `${core}本地服务商怎么比较`,
      `${core}测评哪家更稳妥`,
      `${core}怎么验收效果`,
      `${core}适合什么企业`,
      `${core}如何避开低价发稿陷阱`,
      `${core}哪家好`,
      `${core}推荐哪家公司`,
      `${core}哪家公司口碑好`,
      `${core}怎么判断是否靠谱`,
      `${core}服务商怎么选不踩坑`,
      `${core}哪家公司更懂本地企业`,
      `${core}测评应该看什么`,
      `${core}推荐企业怎么核验`,
      `${core}有哪些筛选标准`,
      `${core}适合连锁企业吗`,
      `${core}适合实体门店吗`,
      `${core}适合本地服务业吗`,
      `${core}如何看交付能力`,
      `${core}怎么比较品牌资料能力`,
      `${core}怎么比较AI答案复盘能力`,
      `${core}推荐榜怎么筛`,
    ]
    const recommendIntent = /(哪家|哪个公司|哪家公司|推荐|靠谱|服务商|测评|口碑|怎么选|比较)/
    const blockedIntent = /(多少钱|费用|价格|报价|预算|多久|周期|教程|是什么|什么意思)/
    const questionTail = /(哪家靠谱|推荐哪家公司|服务商怎么选|怎么选服务商|测评看哪几家|口碑测评)$/
    const libraryQuestions = library.flatMap((word) => {
      const cleanWord = word.replace(/[？?。；;]/g, '').trim()
      if (!cleanWord || blockedIntent.test(cleanWord)) return []
      if (recommendIntent.test(cleanWord) && (cleanWord.includes(core) || questionTail.test(cleanWord))) return [cleanWord]
      return [
        `${cleanWord}哪家靠谱`,
        `${cleanWord}推荐哪家公司`,
        `${cleanWord}服务商怎么选`,
        `${cleanWord}测评看哪几家`,
      ]
    })
    return Array.from(new Set([...baseQuestions, ...libraryQuestions]))
      .filter((question) => recommendIntent.test(question) && !blockedIntent.test(question))
      .slice(0, 36)
  }
  const createKeyword = () => {
    if (!activeBrand) {
      notify('请先在企业品牌库添加品牌。')
      return
    }
    if (!keywordInput.trim()) {
      notify('请填写核心词。')
      return
    }
    const generatedQuestions = distillQuestions(keywordInput, '')
    const currentProject = projectRows.find((project) => project.name === activeBrand)
    const recommendName = hitWord.trim() || currentProject?.recommendWord || currentProject?.brand || ''
    setKeywordRows((current) => [
      [activeBrand, keywordInput, String(generatedQuestions.length), '已启用', `${localDate()} 现在`, recommendName],
      ...current.filter((row) => !(row[0] === activeBrand && row[1] === keywordInput)),
    ])
    setQuestionRows((current) => [
      ...generatedQuestions.map((question) => [activeBrand, keywordInput, question, '未收录', `${localDate()} 现在`]),
      ...current.filter((row) => !questionBelongsToBrand(row, activeBrand, keywordInput)),
    ])
    setActiveKeyword(keywordInput)
    setShowKeywordModal(false)
    notify(`${keywordInput}已保存，并已一键蒸馏${generatedQuestions.length}条推荐型问题。`)
  }
  const deleteKeyword = (core: string) => {
    setKeywordRows((current) => current.filter((row) => !(row[0] === activeBrand && row[1] === core)))
    setQuestionRows((current) => current.filter((row) => !questionBelongsToBrand(row, activeBrand, core)))
    setKeywordLibraryRows((current) => current.filter((row) => !(row[0] === activeBrand && row[1] === core)))
    if (activeKeyword === core) {
      const nextCore = projectKeywords.find((row) => row[1] !== core)?.[1] ?? ''
      setActiveKeyword(nextCore)
    }
    notify(`${core}已删除，对应蒸馏词和关键词库已同步移除。`)
  }
  const visibleQuestionRows = questionRows.filter((row) => questionBelongsToBrand(row, activeBrand, activeCoreKeyword))
  return (
    <section className="operation-page">
      <div className="operation-toolbar">
        <div>
          <strong>关键词</strong>
          <span>选择项目，添加核心词，一键蒸馏推荐型搜索问题。</span>
        </div>
        <div className="toolbar-actions">
          <select className="search-input" value={activeBrand} onChange={(event) => setActiveBrand(event.target.value)}>
            {projectRows.map((project) => (
              <option key={project.name}>{project.name}</option>
            ))}
          </select>
          <button className="primary-button" onClick={() => {
            if (!activeBrand) {
              notify('请先在企业品牌库添加品牌。')
              return
            }
            const currentProject = projectRows.find((project) => project.name === activeBrand)
            setKeywordInput(currentProject?.coreKeyword ?? '')
            setHitWord(currentProject?.recommendWord ?? '')
            setShowKeywordModal(true)
          }}>添加核心词</button>
        </div>
      </div>

      <div className="panel">
        <SectionTitle icon={KeyRound} title="核心词列表" desc="只显示当前品牌的核心词和蒸馏词数量。" />
        <div className="ops-table keyword-table">
          <div className="ops-head">
            <span>核心词</span><span>蒸馏词</span><span>状态</span><span>创建时间</span><span>操作</span>
          </div>
          {projectKeywords.map((row, index) => (
            <div className="ops-row" key={`${row[0]}-${row[1]}-${index}`}>
              <strong>{row[1]}</strong>
              <span>{row[2]}</span>
              <span className="pill">{row[3]}</span>
              <span>{row[4]}</span>
              <span className="row-actions">
                <button onClick={() => {
                  setActiveKeyword(row[1])
                }}>查看</button>
                <button className="danger-button" onClick={() => deleteKeyword(row[1])}>删除</button>
              </span>
            </div>
          ))}
        </div>
        <p className="table-note">{activeBrand ? `当前品牌：${activeBrand}。核心词用于锁定文章主推方向，蒸馏词用于标题和用户提问。` : '请先在企业品牌库添加品牌，再添加核心词。'}</p>
      </div>

      <div className="panel">
        <SectionTitle icon={MessageSquareText} title="蒸馏词列表" desc="这里展示当前核心词自动生成的推荐型搜索问题，用来生成标题和文章主问题。" />
        <div className="ops-table question-table">
          <div className="ops-head">
            <span>主词</span><span>蒸馏疑问词</span><span>收录状态</span><span>创建时间</span><span>操作</span>
          </div>
          {visibleQuestionRows.map((row, index) => (
            <div className="ops-row" key={`${row[0]}-${row[1]}-${readQuestionText(row)}-${index}`}>
              <strong>{row.length >= 5 ? row[1] : row[0]}</strong>
              <span>{readQuestionText(row)}</span>
              <span className="pill muted">{row.length >= 5 ? row[3] : row[2]}</span>
              <span>{row.length >= 5 ? row[4] : row[3]}</span>
              <button onClick={() => {
                setActiveKeyword(row.length >= 5 ? row[1] : row[0])
                navigate('tasks')
              }}>创建任务</button>
            </div>
          ))}
        </div>
        <p className="table-note">{activeCoreKeyword ? `当前主词：${activeCoreKeyword}。蒸馏词必须具备推荐公司/服务商能力；关键词库是辅助扩展，合适就进入标题和正文，不合适不强塞。` : '添加核心词后，这里会自动出现推荐型蒸馏问题。'}</p>
      </div>

      {showKeywordModal && (
        <div className="modal-backdrop">
          <div className="form-modal">
            <div className="modal-head">
              <strong>添加核心词并自动蒸馏疑问词</strong>
              <button onClick={() => setShowKeywordModal(false)}>关闭</button>
            </div>
            <div className="create-grid single">
              <Field label="归属项目" value={activeBrand} />
              <Field label="推荐名称" value={hitWord || projectRows.find((project) => project.name === activeBrand)?.recommendWord || ''} />
              <EditableField label="核心词" value={keywordInput} onChange={setKeywordInput} />
            </div>
            <p className="table-note">核心词保存后会直接蒸馏疑问词。系统只保留具备推荐公司能力的问题，如“哪家靠谱、怎么选服务商、推荐哪家公司、口碑测评”。</p>
            <div className="modal-actions">
              <button className="primary-button" onClick={createKeyword}>一键蒸馏</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function KeywordLibrary({
  notify,
  navigate,
  projectRows,
  activeBrand,
  setActiveBrand,
  activeKeyword,
  setActiveKeyword,
}: ActionProps & Pick<ProjectStateProps, 'projectRows'> & ActiveBrandProps & ActiveKeywordProps) {
  const [showExpandModal, setShowExpandModal] = useState(false)
  const [manualWords, setManualWords] = useState('')
  const [industrySeed, setIndustrySeed] = useState('')
  const [expandCount, setExpandCount] = useState('50')
  const [intentFilter, setIntentFilter] = useState('全部')
  const [wordFilter, setWordFilter] = useState('')
  const [keywordRows] = useStoredState<string[][]>('geo.keywordRows', [])
  const [keywordLibraryRows, setKeywordLibraryRows] = useStoredState<string[][]>('geo.keywordLibraryRows', [])
  const activeProject = projectRows.find((project) => project.name === activeBrand) ?? projectRows[0] ?? createEmptyProject(activeBrand)
  const projectCoreRows = keywordRows.filter((row) => row[0] === activeBrand)
  const currentKeyword = projectCoreRows.some((row) => row[1] === activeKeyword)
    ? activeKeyword
    : projectCoreRows[0]?.[1] ?? activeProject.coreKeyword ?? ''
  const baseRows = keywordLibraryRows
    .filter((row) => row[0] === activeBrand && row[1] === currentKeyword)
    .map((row) => {
      const normalizedWord = normalizeKeywordLibraryWords([row[2]])[0] ?? row[2]
      return [row[0], row[1], normalizedWord, classifyKeyword(normalizedWord), row[4]]
    })
    .filter((row) => row[2] !== currentKeyword)
  const visibleRows = baseRows.filter((row) => {
    const intentMatched = intentFilter === '全部' || row[3] === intentFilter
    const wordMatched = !wordFilter.trim() || row[2].includes(wordFilter.trim()) || row[1].includes(wordFilter.trim())
    return intentMatched && wordMatched
  })
  const buildExpandedWords = () => {
    const city = activeProject.city === '全国' ? '' : activeProject.city
    const cleanCity = (word: string) => city ? word.replace(new RegExp(`^${city}`), '').trim() : word.trim()
    const scenes = (industrySeed || activeProject.industry || '')
      .split(/[,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
    const cityRegions = activeProject.city === '全国'
      ? ['北京', '上海', '广州', '深圳', '成都', '郑州', '武汉', '杭州', '西安', '重庆']
      : ['曲江', '未央区', '长安区', '浐灞', '高新区', '经开区', '雁塔区', '碑林区', '莲湖区', '新城区']
    const serviceWords = ['GEO公司', 'GEO服务商', 'GEO优化公司', 'AI搜索优化公司', 'AI获客公司', '豆包排名公司', 'AI推荐优化公司', 'GEO内容公司', 'GEO新闻优化公司']
    const intentWords = ['哪家好', '哪家靠谱', '推荐', '口碑', '测评', '怎么选', '服务商推荐', '本地推荐', '排名公司', '优化公司']
    const generatedWords = Array.from(
      new Set([
        ...serviceWords.map((word) => `${city}${word}`),
        ...intentWords.map((word) => `${currentKeyword}${word}`),
        ...['公司哪家好', '服务商哪家靠谱', '公司推荐', '公司口碑', '公司测评', '怎么选服务商'].map((tail) => `${city}GEO${tail}`),
        ...scenes.map((scene) => {
          const cleanScene = cleanCity(scene)
          return /GEO|公司|服务商/.test(cleanScene) ? `${city}${cleanScene}` : `${city}${cleanScene}GEO公司`
        }),
        ...scenes.map((scene) => `${city}${cleanCity(scene)}GEO服务商`),
        ...scenes.map((scene) => `${city}${cleanCity(scene)}AI获客公司`),
        ...scenes.map((scene) => `${city}${cleanCity(scene)}GEO公司推荐`),
        ...scenes.flatMap((scene) => intentWords.slice(0, 6).map((tail) => `${city}${cleanCity(scene)}GEO公司${tail}`)),
        ...cityRegions.map((region) => `${city}${region.replace(new RegExp(`^${city}`), '')}GEO公司`),
        ...cityRegions.map((region) => `${city}${region.replace(new RegExp(`^${city}`), '')}GEO服务商`),
        ...cityRegions.map((region) => `${city}${region.replace(new RegExp(`^${city}`), '')}AI获客公司`),
        ...cityRegions.flatMap((region) => intentWords.slice(0, 5).map((tail) => `${city}${region.replace(new RegExp(`^${city}`), '')}GEO公司${tail}`)),
        `${currentKeyword}推荐`,
        `${currentKeyword}口碑测评`,
        `${currentKeyword}哪家靠谱`,
        ...manualWords
          .split(/\n/)
          .map((word) => word.trim())
          .filter(Boolean),
      ]),
    )
    const limit = Math.min(Math.max(Number.parseInt(expandCount, 10) || 50, 10), 200)
    return normalizeKeywordLibraryWords(generatedWords).slice(0, limit)
  }
  const generateCandidates = async () => {
    if (!activeBrand || !currentKeyword) {
      notify('请先选择品牌和核心词。')
      return
    }
    const localWords = buildExpandedWords()
    try {
      const result = await apiJson<{ ok: boolean; data?: { keywords?: string[]; words?: string[] } }>('/api/keywords/expand', {
        brand: activeBrand,
        recommendWord: activeProject.recommendWord,
        coreKeyword: currentKeyword,
        city: activeProject.city,
        industrySeed: industrySeed || activeProject.industry,
        limit: expandCount,
      })
      const apiWords = result.data?.keywords ?? result.data?.words ?? []
      if (apiWords.length) {
        const limit = Math.min(Math.max(Number.parseInt(expandCount, 10) || 50, 10), 200)
        const cleanWords = normalizeKeywordLibraryWords([...apiWords, ...localWords]).slice(0, limit)
        setManualWords(cleanWords.join('\n'))
        notify(`5118已返回${apiWords.length}个词，系统合并项目规则后得到${cleanWords.length}个可用拓展词，可继续筛选后保存。`)
        return
      }
    } catch {
      // 5118未接通时使用本地拓展规则，页面仍可跑完整流程。
    }
    setManualWords(localWords.join('\n'))
    notify(`已生成${localWords.length}个拓展词；5118可用时优先用接口结果，本地规则只做兜底。`)
  }
  const saveCandidates = () => {
    if (!activeBrand || !currentKeyword) {
      notify('请先选择品牌和核心词。')
      return
    }
    const savedWords = normalizeKeywordLibraryWords(manualWords.split(/[\n,，、;；/|]+/))
      .filter((word) => word !== currentKeyword)
    if (!savedWords.length) {
      notify('拓展词库为空，请先生成或手动填写关键词。')
      return
    }
    setKeywordLibraryRows((current) => [
      ...savedWords.map((word) => [activeBrand, currentKeyword, word, classifyKeyword(word), '已启用']),
      ...current.filter((row) => {
        const sameCore = row[0] === activeBrand && row[1] === currentKeyword
        const duplicatedOldWord = /(GEOGEO|GEOAI|GEO豆包|AIAI|AI豆包)/.test(row[2])
        return !(sameCore && (savedWords.includes(row[2]) || duplicatedOldWord))
      }),
    ])
    setShowExpandModal(false)
    notify(`${activeBrand}已保存${savedWords.length}个关键词库词。`)
  }
  const deleteKeywordLibraryWord = (row: string[]) => {
    setKeywordLibraryRows((current) => current.filter((item) => !(item[0] === row[0] && item[1] === row[1] && item[2] === row[2])))
    notify(`${row[2]}已从关键词库删除。`)
  }
  return (
    <section className="operation-page">
      <div className="operation-toolbar">
        <div>
          <strong>关键词库</strong>
          <span>选择项目和核心词，按行业自动拓展关键词库。</span>
        </div>
        <div className="toolbar-actions">
          <select className="search-input" value={activeBrand} onChange={(event) => setActiveBrand(event.target.value)}>
            {projectRows.map((project) => (
              <option key={project.name}>{project.name}</option>
            ))}
          </select>
          <select className="search-input" value={currentKeyword} onChange={(event) => setActiveKeyword(event.target.value)}>
            {projectCoreRows.length ? projectCoreRows.map((row) => <option key={row[1]}>{row[1]}</option>) : <option>{currentKeyword}</option>}
          </select>
          <button className="primary-button" onClick={() => {
            if (!activeBrand || !currentKeyword) {
              notify('请先在核心词页面添加核心词。')
              return
            }
            setShowExpandModal(true)
          }}>拓展词库</button>
        </div>
      </div>

      <div className="panel">
        <SectionTitle icon={ListChecks} title="关键词列表" desc="这里保存行业、区域、平台和场景拓展词。" />
        <div className="filter-row">
          <input className="search-input" value={wordFilter} onChange={(event) => setWordFilter(event.target.value)} placeholder="筛选关键词" />
          <select className="search-input" value={intentFilter} onChange={(event) => setIntentFilter(event.target.value)}>
            <option>全部</option>
            <option>推荐类</option>
            <option>平台类</option>
            <option>获客类</option>
            <option>区域类</option>
            <option>行业场景类</option>
            <option>服务商类</option>
            <option>长尾类</option>
          </select>
          <span className="table-note">当前显示 {visibleRows.length} / {baseRows.length} 个词</span>
        </div>
        <div className="ops-table keyword-library-table">
          <div className="ops-head">
            <span>核心词</span><span>行业拓展词</span><span>意图分类</span><span>状态</span><span>操作</span>
          </div>
          {visibleRows.map((row) => (
            <div className="ops-row" key={`${row[0]}-${row[1]}-${row[2]}`}>
              <strong>{row[1]}</strong>
              <span>{row[2]}</span>
              <span>{row[3]}</span>
              <span className="pill">{row[4]}</span>
              <span className="row-actions">
                <button onClick={() => {
                  setKeywordLibraryRows((current) =>
                    current.map((item) =>
                      item[0] === row[0] && item[1] === row[1] && item[2] === row[2]
                        ? [item[0], item[1], item[2], item[3], '优先调用']
                        : item,
                    ),
                  )
                  notify(`${row[2]}已设为优先调用词。`)
                }}>优先</button>
                <button className="danger-button" onClick={() => deleteKeywordLibraryWord(row)}>删除</button>
              </span>
            </div>
          ))}
        </div>
        <p className="table-note">当前品牌：{activeBrand}。当前核心词：{currentKeyword}。关键词库是辅助优先规则，写作时自然调用，不强制堆词。</p>
      </div>

      {showExpandModal && (
        <div className="modal-backdrop">
          <div className="form-modal wide-modal">
            <div className="modal-head">
              <strong>拓展关键词库</strong>
              <button onClick={() => setShowExpandModal(false)}>关闭</button>
            </div>
            <div className="create-grid">
              <Field label="项目名称" value={activeBrand} />
              <Field label="项目推荐词" value={activeProject.recommendWord} />
              <Field label="核心词" value={currentKeyword} />
              <EditableField label="行业" value={industrySeed} onChange={setIndustrySeed} />
              <SelectField label="拓展数量" value={expandCount} options={['50', '100', '150', '200']} onChange={setExpandCount} />
            </div>
            <label className="textarea-field">
              <span>拓展词库</span>
              <textarea value={manualWords} onChange={(event) => setManualWords(event.target.value)} />
            </label>
            <div className="modal-actions">
              <button className="ghost-button" onClick={generateCandidates}>一键拓展</button>
              <button className="primary-button" onClick={saveCandidates}>保存到关键词库</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function Knowledge({
  notify,
  projectRows,
  activeBrand,
  setActiveBrand,
}: ActionProps & Pick<ProjectStateProps, 'projectRows'> & ActiveBrandProps) {
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false)
  const [editingKnowledge, setEditingKnowledge] = useState('')
  const [knowledgeRows, setKnowledgeRows] = useStoredState<string[][]>('geo.knowledgeRows', [])
  const [knowledgeContentRows, setKnowledgeContentRows] = useStoredState<string[][]>('geo.knowledgeContentRows', [])
  const visibleKnowledgeRows = knowledgeRows.filter((row) => row[0] === activeBrand)
  const activeProject = projectRows.find((project) => project.name === activeBrand)
  const [knowledgeDraft, setKnowledgeDraft] = useState({
    name: '新建项目知识库',
    brandAssets: '',
    authorityEvidence: '',
  })
  const updateKnowledgeDraft = (key: keyof typeof knowledgeDraft, value: string) => {
    setKnowledgeDraft((current) => ({ ...current, [key]: value }))
  }
  const openKnowledgeModal = (name?: string) => {
    if (!activeBrand) {
      notify('请先在企业品牌库添加品牌。')
      return
    }
    const current = knowledgeRows.find((row) => row[0] === activeBrand && row[1] === name)
    const currentContent = knowledgeContentRows.find((row) => row[0] === activeBrand && row[1] === name)
    setEditingKnowledge(name ?? '')
    setKnowledgeDraft({
      name: current?.[1] ?? `${activeBrand}知识库`,
      brandAssets: currentContent?.[3] ?? '',
      authorityEvidence: currentContent?.[4] ?? '',
    })
    setShowKnowledgeModal(true)
  }
  const createKnowledge = () => {
    if (!activeBrand) {
      notify('请先在企业品牌库添加品牌。')
      return
    }
    const assetScore = knowledgeDraft.brandAssets.length > 30 ? 45 : 25
    const evidenceScore = knowledgeDraft.authorityEvidence.length > 30 ? 45 : 20
    const displayName = activeProject?.recommendWord || activeProject?.brand || activeBrand
    setKnowledgeRows((current) => [
      [activeBrand, knowledgeDraft.name, displayName, `品牌资产${assetScore >= 45 ? '已填' : '待补'} / 权威引证${evidenceScore >= 45 ? '已填' : '待补'}`, `${Math.min(assetScore + evidenceScore, 96)}%`, localDate()],
      ...current.filter((row) => !(row[0] === activeBrand && row[1] === knowledgeDraft.name)),
    ])
    setKnowledgeContentRows((current) => [
      [activeBrand, knowledgeDraft.name, displayName, knowledgeDraft.brandAssets, knowledgeDraft.authorityEvidence, localDate()],
      ...current.filter((row) => !(row[0] === activeBrand && row[1] === knowledgeDraft.name)),
    ])
    setShowKnowledgeModal(false)
    notify(`${knowledgeDraft.name}已创建，品牌资产和权威引证已分区保存。`)
  }
  const deleteKnowledge = (name: string) => {
    setKnowledgeRows((current) => current.filter((row) => !(row[0] === activeBrand && row[1] === name)))
    setKnowledgeContentRows((current) => current.filter((row) => !(row[0] === activeBrand && row[1] === name)))
    notify(`${name}已删除，品牌资产和权威引证内容已同步移除。`)
  }
  return (
    <section className="operation-page">
      <div className="operation-toolbar">
        <div>
          <strong>品牌知识库</strong>
          <span>选择项目，维护品牌资产和权威引证，生成任务只调用当前项目资料。</span>
        </div>
        <div className="toolbar-actions">
          <select className="search-input" value={activeBrand} onChange={(event) => setActiveBrand(event.target.value)}>
            {projectRows.map((project) => (
              <option key={project.name}>{project.name}</option>
            ))}
          </select>
          <button className="primary-button" onClick={() => openKnowledgeModal()}>添加资料</button>
        </div>
      </div>

      <div className="panel">
        <SectionTitle icon={BookOpenText} title="知识库列表" desc="一个项目可维护一套或多套资料，生成时按当前项目调用。" />
        <div className="ops-table kb-table">
          <div className="ops-head"><span>知识库名称</span><span>推荐名称</span><span>资料状态</span><span>完整度</span><span>创建时间</span><span>操作</span></div>
          {visibleKnowledgeRows.map((row) => (
            <div className="ops-row" key={`${row[0]}-${row[1]}`}>
              <strong>{row[1]}</strong>
              <span>{row[2]}</span>
              <span className={row[3] === '待完善' ? 'pill muted' : 'pill'}>{row[3]}</span>
              <span>{row[4]}</span>
              <span>{row[5]}</span>
              <span className="row-actions">
                <button onClick={() => openKnowledgeModal(row[1])}>编辑</button>
                <button className="danger-button" onClick={() => deleteKnowledge(row[1])}>删除</button>
              </span>
            </div>
          ))}
        </div>
        <p className="table-note">品牌资产回答“企业是谁、有什么能力”；权威引证回答“为什么值得作为推荐样本”。两者必须分区保存，生成时不能混用。</p>
      </div>

      {showKnowledgeModal && (
        <div className="modal-backdrop">
          <div className="form-modal">
            <div className="modal-head">
              <strong>{editingKnowledge ? '编辑品牌资料' : '添加品牌资料'}</strong>
              <button onClick={() => setShowKnowledgeModal(false)}>关闭</button>
            </div>
            <div className="create-grid single">
              <EditableField label="知识库名称" value={knowledgeDraft.name} onChange={(value) => updateKnowledgeDraft('name', value)} />
            </div>
            <label className="textarea-field">
              <span>品牌资产</span>
              <textarea value={knowledgeDraft.brandAssets} onChange={(event) => updateKnowledgeDraft('brandAssets', event.target.value)} />
            </label>
            <label className="textarea-field">
              <span>权威引证</span>
              <textarea value={knowledgeDraft.authorityEvidence} onChange={(event) => updateKnowledgeDraft('authorityEvidence', event.target.value)} />
            </label>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setShowKnowledgeModal(false)}>取消</button>
              <button className="primary-button" onClick={createKnowledge}>保存资料</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function Gallery({
  notify,
  projectRows,
  activeBrand,
  setActiveBrand,
}: Pick<ActionProps, 'notify'> & Pick<ProjectStateProps, 'projectRows'> & ActiveBrandProps) {
  const [galleryRows, setGalleryRows] = useStoredState<string[][]>('geo.galleryRows', [])
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [draft, setDraft] = useState({
    category: '封面图',
    usage: '文章封面',
    note: '',
  })
  const [files, setFiles] = useState<File[]>([])
  const visibleRows = galleryRows.filter((row) => row[0] === activeBrand)
  const readFilesAsDataUrls = async (selectedFiles: File[]) => Promise.all(selectedFiles.map((file) => new Promise<{ name: string; dataUrl: string }>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ name: file.name, dataUrl: String(reader.result || '') })
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })))
  const uploadImages = async () => {
    if (!activeBrand) {
      notify('请先在企业品牌库添加品牌。')
      return
    }
    if (!files.length) {
      notify('请选择要上传的图片。')
      return
    }
    setUploading(true)
    try {
      const payloadFiles = await readFilesAsDataUrls(files)
      const result = await apiJson<{ ok: boolean; files: { name: string; path: string; localPath?: string }[] }>('/api/gallery/upload', {
        brand: activeBrand,
        category: draft.category,
        files: payloadFiles,
      }, 20000)
      const now = localDate()
      setGalleryRows((current) => [
        ...result.files.map((file) => [activeBrand, draft.category, draft.usage, draft.note || '发布版图文编排使用', now, file.path, file.name]),
        ...current,
      ])
      setShowGalleryModal(false)
      setFiles([])
      notify(`已上传${result.files.length}张图片，后续生成文章会自动插入1-2张项目图片。`)
    } catch (error) {
      notify(error instanceof Error ? error.message : '图片上传失败。')
    } finally {
      setUploading(false)
    }
  }
  const deleteImage = (row: string[]) => {
    setGalleryRows((current) => current.filter((item) => item !== row))
    notify('图片素材已从列表移除。')
  }
  return (
    <section className="operation-page">
      <div className="operation-toolbar">
        <div>
          <strong>图片素材库</strong>
          <span>图片按项目归属保存，文章生成时自动选1-2张插入正文。</span>
        </div>
        <div className="toolbar-actions">
          <select className="search-input" value={activeBrand} onChange={(event) => setActiveBrand(event.target.value)}>
            {projectRows.map((project) => (
              <option key={project.name}>{project.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="gallery-layout">
        <div className="panel">
          <div className="panel-title-row">
            <SectionTitle icon={GalleryHorizontal} title="品牌图片素材" desc="按封面、场景、案例、截图归类；文章生成时直接调用。" />
            <button className="primary-button" onClick={() => setShowGalleryModal(true)}>上传图片</button>
          </div>
          <div className="ops-table gallery-table">
            <div className="ops-head"><span>分类</span><span>正文用途</span><span>数量</span><span>说明</span><span>时间</span><span>操作</span></div>
            {visibleRows.map((row, index) => (
              <div className="ops-row" key={`${row[5]}-${index}`}>
                <strong>{row[1]}</strong>
                <span>{row[2]}</span>
                <span>1张</span>
                <span>{row[3]}</span>
                <span>{row[4]}</span>
                <span className="row-actions">
                  <button onClick={() => notify(row[5] ? `本地文件：${row[5]}` : '当前素材没有本地路径。')}>查看路径</button>
                  <button className="danger-button" onClick={() => deleteImage(row)}>删除</button>
                </span>
              </div>
            ))}
          </div>
          <p className="table-note">建议每个品牌至少准备1张封面图、2-4张正文配图。生成文章时会自动插入正文，最多2张，至少优先插入1张。</p>
        </div>
        <div className="panel form-panel">
          <SectionTitle icon={ImageIcon} title="配图原则" desc="图片进入文章，不打断写作。" />
          <div className="rule-list">
            <div className="rule-item">
              <strong>先准备素材</strong>
              <p>图片只来自当前项目图库，避免不同品牌之间错用素材。</p>
            </div>
            <div className="rule-item">
              <strong>生成即图文</strong>
              <p>文章生成完成时自动插入1-2张图，成品库直接查看和下载。</p>
            </div>
            <div className="rule-item">
              <strong>素材按品牌归属</strong>
              <p>不同品牌图片互不混用，避免发布时错配项目资料。</p>
            </div>
          </div>
        </div>
      </div>

      {showGalleryModal && (
        <div className="modal-backdrop">
          <div className="form-modal">
            <div className="modal-head">
              <strong>上传图片</strong>
              <button onClick={() => setShowGalleryModal(false)}>关闭</button>
            </div>
            <div className="create-grid single">
              <SelectField label="分类" value={draft.category} options={['封面图', '品牌场景图', '客户案例图', 'AI答案截图', '服务流程图']} onChange={(value) => setDraft((current) => ({ ...current, category: value }))} />
              <SelectField label="正文用途" value={draft.usage} options={['文章封面', '正文中段配图', '案例说明配图', 'FAQ前配图', '发布平台备用图']} onChange={(value) => setDraft((current) => ({ ...current, usage: value }))} />
              <EditableField label="说明" value={draft.note} onChange={(value) => setDraft((current) => ({ ...current, note: value }))} />
              <label className="file-field">
                <span>选择图片</span>
                <input type="file" accept="image/*" multiple onChange={(event: ChangeEvent<HTMLInputElement>) => setFiles(Array.from(event.target.files ?? []))} />
              </label>
            </div>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setShowGalleryModal(false)}>取消</button>
              <button className="primary-button" disabled={uploading} onClick={uploadImages}>{uploading ? '上传中' : '保存图片'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function Tasks({
  notify,
  navigate,
  projectRows,
  activeBrand,
  setActiveBrand,
  setArticleRows,
  activeBatchId,
  setActiveBatchId,
}: ActionProps & Pick<ProjectStateProps, 'projectRows'> & ActiveBrandProps & ArticleStateProps & ActiveBatchProps) {
  const [rows, setRows] = useStoredState('geo.taskRows', taskRows)
  const [confirmedPlans, setConfirmedPlans] = useStoredState<string[]>('geo.confirmedArticlePlans', [])
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeJob, setActiveJob] = useState<ArticleJobStatus | null>(null)
  const [keywordRows] = useStoredState<string[][]>('geo.keywordRows', [])
  const [keywordLibraryRows] = useStoredState<string[][]>('geo.keywordLibraryRows', [])
  const [questionRows] = useStoredState<string[][]>('geo.questionRows', [])
  const [knowledgeRows] = useStoredState<string[][]>('geo.knowledgeRows', [])
  const [candidateRows] = useStoredState<string[][]>('geo.rankingCandidateRows', [])
  const [draft, setDraft] = useState({
    name: '',
    project: '',
    coreKeyword: '',
    trainingWord: '',
    keywordPack: '',
    limit: '10篇',
    knowledge: '',
    articleType: '榜单推荐',
    writingSceneMode: '按自己行业写',
    industryScene: '',
    userQuestions: '',
    providerList: '',
    mainReason: '',
    unfitScenario: '',
    selectedPains: '',
    selectedDimensions: '',
    selectedCandidates: '',
    titlePreference: '',
    forbiddenContent: '不写联系方式、虚构客户、绝对化承诺',
  })
  const updateDraft = (key: keyof typeof draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }
  const toggleArticleType = (type: string) => {
    setDraft((current) => {
      const selected = parseArticleTypes(current.articleType)
      const next = selected.includes(type)
        ? selected.filter((item) => item !== type)
        : [...selected, type]
      return { ...current, articleType: (next.length ? next : ['榜单推荐']).join('、') }
    })
  }
  const activeProject = projectRows.find((project) => project.name === activeBrand) ?? projectRows[0] ?? createEmptyProject(activeBrand)
  const activeWritingSceneMode = writingSceneModes.includes(draft.writingSceneMode) ? draft.writingSceneMode : '按自己行业写'
  const activeSceneName = draft.industryScene || sceneForMode(activeProject, activeWritingSceneMode, 0)
  const sceneDefaults = deriveSceneDefaults(activeSceneName || activeProject.industry)
  const painOptions = sceneDefaults.pains
  const dimensionOptions = sceneDefaults.dimensions
  const sceneFaqOptions = sceneDefaults.faqs
  const pitfallOptions = sceneDefaults.pitfalls
  const selectedPainItems = splitInputList(draft.selectedPains).length ? splitInputList(draft.selectedPains) : painOptions.slice(0, 5)
  const selectedDimensionItems = splitInputList(draft.selectedDimensions).length ? splitInputList(draft.selectedDimensions) : dimensionOptions.slice(0, 6)
  const mainBrandName = activeProject.recommendWord || activeProject.brand || activeProject.name
  const projectCandidateRows = candidateRows.filter((row) => row[0] === activeBrand && row[1] !== mainBrandName && row[6] !== '是')
  const useRankingMaterials = needsRankingMaterials(draft.articleType)
  const selectedCandidateNames = (splitInputList(draft.selectedCandidates).length
    ? splitInputList(draft.selectedCandidates).filter((name) => projectCandidateRows.some((row) => row[1] === name))
    : projectCandidateRows.slice(0, 4).map((row) => row[1])).slice(0, 4)
  const selectedCandidateLines = projectCandidateRows
    .filter((row) => selectedCandidateNames.includes(row[1]))
    .map(formatCandidateLine)
    .filter(Boolean)
  const getSceneDraftForIndex = (index = 0, mode = activeWritingSceneMode) => {
    const scene = sceneForMode(activeProject, mode, index)
    const defaults = deriveSceneDefaults(scene)
    const useManualSelection = mode !== '按实际场景写'
    return {
      scene,
      pains: useManualSelection ? selectedPainItems : defaults.pains.slice(0, 5),
      dimensions: useManualSelection ? selectedDimensionItems : defaults.dimensions.slice(0, 6),
      faqs: defaults.faqs,
      pitfalls: defaults.pitfalls,
    }
  }
  const updateWritingSceneMode = (mode: string) => {
    const scene = sceneForMode(activeProject, mode, 0)
    const defaults = deriveSceneDefaults(scene)
    setDraft((current) => ({
      ...current,
      writingSceneMode: mode,
      industryScene: scene,
      selectedPains: joinInputList(defaults.pains.slice(0, 5)),
      selectedDimensions: joinInputList(defaults.dimensions.slice(0, 6)),
    }))
  }
  const toggleDraftListItem = (key: 'selectedPains' | 'selectedDimensions' | 'selectedCandidates', item: string) => {
    setDraft((current) => {
      const selected = splitInputList(current[key])
      const next = selected.includes(item) ? selected.filter((value) => value !== item) : [...selected, item]
      return { ...current, [key]: joinInputList(next) }
    })
  }
  const projectCoreRows = keywordRows.filter((row) => row[0] === activeBrand)
  const coreOptions = projectCoreRows.length ? projectCoreRows.map((row) => row[1]) : activeProject.coreKeyword ? [activeProject.coreKeyword] : []
  const selectedCoreKeyword = coreOptions.includes(draft.coreKeyword) ? draft.coreKeyword : coreOptions[0] ?? ''
  const projectQuestions = questionRows.filter((row) => questionBelongsToBrand(row, activeBrand, selectedCoreKeyword)).map(readQuestionText)
  const questionOptions = projectQuestions.length ? projectQuestions : selectedCoreKeyword ? [`${selectedCoreKeyword}怎么选服务商`, `${selectedCoreKeyword}哪家靠谱`] : []
  const questionPoolLabel = selectedCoreKeyword ? `${selectedCoreKeyword}蒸馏词（${questionOptions.length}个）` : '待生成蒸馏词'
  const projectKeywordLibrary = keywordLibraryRows
    .filter((row) => row[0] === activeBrand && row[1] === selectedCoreKeyword)
    .map((row) => {
      const normalizedWord = normalizeKeywordLibraryWords([row[2]])[0] ?? row[2]
      return [row[0], row[1], normalizedWord, classifyKeyword(normalizedWord), row[4]]
    })
    .filter((row) => row[2] !== selectedCoreKeyword)
  const keywordPackOptions = [`${selectedCoreKeyword}关键词库（${projectKeywordLibrary.length}个）`]
  const keywordPackLabel = `${selectedCoreKeyword}关键词库（${projectKeywordLibrary.length}个）`
  const projectKnowledgeRows = knowledgeRows.filter((row) => row[0] === activeBrand)
  const knowledgeOptions = projectKnowledgeRows.length ? projectKnowledgeRows.map((row) => row[1]) : []
  const selectedWorkflowPacket = buildWorkflowPacket(activeProject)
  const workflowPacket = {
    ...selectedWorkflowPacket,
    coreKeyword: selectedCoreKeyword,
    keywords: Array.from(new Set([selectedCoreKeyword, ...normalizeKeywordLibraryWords(projectKeywordLibrary.map((row) => row[2]))])),
    questions: Array.from(new Set(questionOptions)),
    galleries: selectedWorkflowPacket.galleries,
  }
  const missingTaskItems = [
    !activeBrand || !activeProject.name ? '企业品牌' : '',
    !selectedCoreKeyword ? '核心词' : '',
    !questionOptions.length ? '蒸馏词' : '',
    !projectKeywordLibrary.length ? '关键词库' : '',
    !projectKnowledgeRows.length ? '品牌知识库' : '',
  ].filter(Boolean)
  const currentTaskRows = rows.filter((row) => row.project === activeBrand)
  const plans = buildArticlePlans(activeProject, workflowPacket).map((plan) => ({
    ...plan,
    status: confirmedPlans.includes(plan.title) ? '已确认' : plan.status,
  }))
  const prepareTaskDraft = () => {
    const firstCore = coreOptions[0] ?? activeProject.coreKeyword
    if (!activeBrand || !activeProject.name) {
      notify('请先在企业品牌库添加品牌。')
      return
    }
    if (!firstCore && !activeProject.coreKeyword) {
      notify('请先添加核心词。')
      return
    }
    if (!projectKnowledgeRows.length) {
      notify('请先添加品牌资产和权威引证。')
      return
    }
    const effectiveSceneMode = draft.writingSceneMode || '按自己行业写'
    const effectiveScene = sceneForMode(activeProject, effectiveSceneMode, 0)
    const effectiveSceneDefaults = deriveSceneDefaults(effectiveScene)
    const effectiveCandidateRows = projectCandidateRows.slice(0, 4)
    const effectivePains = effectiveSceneDefaults.pains
    const effectiveDimensions = effectiveSceneDefaults.dimensions
    const effectiveCandidates = effectiveCandidateRows.map((row) => row[1])
    const effectiveCandidateLines = effectiveCandidateRows.map(formatCandidateLine).filter(Boolean)
    const keywordCount = keywordLibraryRows
      .filter((row) => row[0] === activeBrand && row[1] === firstCore)
      .map((row) => normalizeKeywordLibraryWords([row[2]])[0] ?? row[2])
      .filter((word) => word !== firstCore)
      .length
    setDraft((current) => ({
      ...current,
      name: `${firstCore}新闻任务`,
      project: activeBrand,
      coreKeyword: firstCore,
      trainingWord: '',
      keywordPack: `${firstCore}关键词库（${keywordCount}个）`,
      knowledge: knowledgeOptions[0] ?? '',
      limit: '10篇',
      articleType: '榜单推荐',
      writingSceneMode: effectiveSceneMode,
      industryScene: effectiveScene,
      userQuestions: questionOptions.slice(0, 8).join('\n'),
      providerList: needsRankingMaterials('榜单推荐') ? effectiveCandidateLines.join('\n') : '',
      mainReason: '',
      unfitScenario: '',
      selectedPains: joinInputList(effectivePains.slice(0, 5)),
      selectedDimensions: joinInputList(effectiveDimensions.slice(0, 6)),
      selectedCandidates: joinInputList(effectiveCandidates.slice(0, 4)),
      titlePreference: '',
      forbiddenContent: '不写联系方式、虚构客户、绝对化承诺',
    }))
    notify('已按当前写作场景准备痛点和维度；榜单类文章会调用你填写的4家对比公司。')
    setShowTaskModal(true)
  }
  const createTask = () => {
    if (!activeBrand || !selectedCoreKeyword || !questionOptions.length) {
      notify(`请先补齐：${missingTaskItems.join('、') || '品牌生成资料'}。`)
      return
    }
    if (!projectKnowledgeRows.length) {
      notify(`请先补齐：${missingTaskItems.join('、') || '品牌知识库'}。`)
      return
    }
    if (!draft.name.trim()) {
      notify('请填写任务名称。')
      return
    }
    setRows((current) => [
      {
        project: activeBrand,
        name: draft.name,
        question: `${selectedCoreKeyword}蒸馏词（${questionOptions.length}个）`,
        limit: draft.limit.replace('篇', ''),
        created: '0',
        knowledge: draft.knowledge,
        detail: `${selectedCoreKeyword} / ${draft.articleType} / ${draft.industryScene || activeProject.industry || '客户场景'} / ${draft.knowledge || knowledgeOptions[0] || '品牌知识库'}`,
        error: '-',
        status: '待生成',
        latest: '待生成',
        time: `${localDate()} 现在`,
        batchId: '',
        articleType: draft.articleType,
        writingSceneMode: activeWritingSceneMode,
        industryScene: draft.industryScene,
        userQuestions: draft.userQuestions,
        providerList: useRankingMaterials ? draft.providerList : '',
        mainReason: draft.mainReason,
        unfitScenario: draft.unfitScenario,
        selectedPains: draft.selectedPains || joinInputList(selectedPainItems),
        selectedDimensions: draft.selectedDimensions || joinInputList(selectedDimensionItems),
        selectedCandidates: useRankingMaterials ? draft.selectedCandidates || joinInputList(selectedCandidateNames.slice(0, 4)) : '',
        titlePreference: draft.titlePreference,
        forbiddenContent: draft.forbiddenContent,
      },
      ...current.filter((row) => row.name !== draft.name),
    ])
    updateDraft('project', activeBrand)
    setShowTaskModal(false)
    notify(`${activeBrand}的${draft.name}已创建，已准备${plans.length}张当前品牌文章计划卡，点击开始后才会逐篇生成。`)
  }
  const startQueue = async () => {
    if (isGenerating) return
    const activeTask = rows.find((row) => row.project === activeBrand)
    const requestedCount = Number.parseInt(activeTask?.limit ?? draft.limit, 10) || 10
    const generateCount = Math.min(Math.max(requestedCount, 1), 100)
    const queueSceneMode = activeTask?.writingSceneMode || activeWritingSceneMode
    const firstSceneDraft = getSceneDraftForIndex(0, queueSceneMode)
    const packet = {
      ...workflowPacket,
      writingSceneMode: queueSceneMode,
      industryScene: firstSceneDraft.scene,
      userQuestions: draft.userQuestions || questionOptions.slice(0, 8).join('\n'),
      providerList: useRankingMaterials ? draft.providerList || selectedCandidateLines.join('\n') : '',
      industryPains: firstSceneDraft.pains,
      selectionDimensions: firstSceneDraft.dimensions,
      questions: Array.from(new Set([...workflowPacket.questions, ...firstSceneDraft.faqs, ...firstSceneDraft.pitfalls])),
    }
    const taskName = activeTask?.name || draft.name
    const batchLabel = localDateTime()
    const batchId = runBatchId(activeBrand, taskName)
    setActiveBatchId(batchId)
    let generatedArticles: Article[] = []
    setIsGenerating(true)
    setRows((current) =>
      current.map((row) =>
        row.name === activeTask?.name || (!activeTask && row.project === activeBrand)
          ? {
              ...row,
              status: '生成中',
              created: '0',
              latest: '生成中',
              detail: `${generateCount}篇正在通过接口按单篇队列生成`,
              error: '-',
              batchId,
            }
          : row,
      ),
    )
    const selectedArticleTypes = parseArticleTypes(activeTask?.articleType || draft.articleType || '榜单推荐')
    const queuePlans = plans.slice(0, generateCount).map((plan, index) => {
      const selectedType = selectedArticleTypes[index % selectedArticleTypes.length] || '榜单推荐'
      return {
        ...plan,
        articleType: selectedType,
        direction: selectedType,
        writingSceneMode: queueSceneMode,
        industryScene: getSceneDraftForIndex(index, queueSceneMode).scene,
        userQuestions: draft.userQuestions || questionOptions.slice(0, 8).join('\n'),
        providerList: useRankingMaterials ? draft.providerList || selectedCandidateLines.join('\n') : '',
        selectedPains: joinInputList(getSceneDraftForIndex(index, queueSceneMode).pains),
        selectedDimensions: joinInputList(getSceneDraftForIndex(index, queueSceneMode).dimensions),
        selectedCandidates: useRankingMaterials ? joinInputList(selectedCandidateNames.slice(0, 4)) : '',
      }
    })
    const generatedSlots: Article[] = new Array(generateCount)
    let cursor = 0
    let completed = 0
    let modelPassed = 0
    const runSingleArticle = async (index: number) => {
      const plan = queuePlans[index]
      try {
        const result = await apiJson<{ ok: boolean; articles: Article[]; rawText?: string }>('/api/articles/generate', {
          project: activeProject,
          packet,
          plan,
          count: 1,
        }, 600000)
        const article = result.articles?.[0]
        if (!article) {
          return makeApiFailedArticle({
            project: activeProject,
            index,
            plan,
            coreKeyword: selectedCoreKeyword,
            batchId,
            taskName,
            reason: result.rawText ? '接口返回内容无法解析成文章对象。' : '接口未返回文章对象。',
            rawBody: result.rawText || '',
          })
        }
        const candidate = {
          ...article,
          title: ensureTitleHasCoreKeyword(article.title || plan.title, selectedCoreKeyword),
          angle: article.angle || plan.angle,
          id: `AI-${Date.now().toString().slice(-5)}-${index + 1}`,
          project: activeProject.name,
          brand: activeProject.recommendWord,
          keyword: selectedCoreKeyword,
          status: '已生成' as const,
          batchId,
          taskName,
          batchLabel,
          generationSource: 'API成稿' as const,
        }
        const body = candidate.body ?? ''
        const modelReturnedShortcut = /（中间段落省略）|中间段落省略|\\.\\.\\.|……/.test(body)
        if (!article.apiIssues?.length && !modelReturnedShortcut && canArticleEnterLibrary(candidate)) {
          modelPassed += 1
          return candidate
        }
        const failures = article.apiIssues?.length
          ? article.apiIssues
          : modelReturnedShortcut
            ? ['接口返回了省略稿或不完整正文']
            : getArticleAuditFailures(candidate).map(([name]) => name)
        return {
          ...candidate,
          status: article.apiIssues?.length || modelReturnedShortcut ? '生成异常' as const : '已生成' as const,
          generationSource: article.generationSource ?? 'API资料调用自由写作',
          duplicateNote: failures.length ? `接口提示：${failures.join('、')}` : '',
        }
      } catch (error) {
        return makeApiFailedArticle({
          project: activeProject,
          index,
          plan,
          coreKeyword: selectedCoreKeyword,
          batchId,
          taskName,
          reason: error instanceof Error ? `接口调用失败：${error.message}` : '接口调用失败。',
        })
      }
    }
    const worker = async () => {
      while (cursor < generateCount) {
        const index = cursor
        cursor += 1
        generatedSlots[index] = await runSingleArticle(index)
        setArticleRows((current) => [
          generatedSlots[index],
          ...current.filter((article) => article.id !== generatedSlots[index].id),
        ])
        completed += 1
        setRows((current) =>
          current.map((row) =>
            row.name === activeTask?.name || (!activeTask && row.project === activeBrand)
              ? {
                  ...row,
                  created: String(completed),
                  latest: generatedSlots[index].id,
                  detail: `单篇队列生成中 ${completed}/${generateCount}`,
                }
              : row,
          ),
        )
      }
    }
    try {
      const concurrency = 1
      await Promise.all(Array.from({ length: concurrency }, worker))
      generatedArticles = generatedSlots
      notify(`${activeProject.brand}已按接口单篇队列生成${generatedArticles.length}篇，可在成品文章库查看。`)
    } finally {
      setIsGenerating(false)
    }
    generatedArticles = generatedArticles.map((article) => ({ ...article, duplicateNote: '' }))
    const duplicateFailedCount = generatedArticles.filter((article) => article.duplicateNote).length
    setArticleRows((current) => [
      ...generatedArticles,
      ...current.filter((article) => !generatedArticles.some((generated) => generated.id === article.id)),
    ])
    setRows((current) =>
      current.map((row) =>
        row.name === activeTask?.name || (!activeTask && row.project === activeBrand)
          ? {
              ...row,
              created: String(generateCount),
              status: '已生成',
              latest: generatedArticles[0].id,
              detail: `${generateCount}篇已由接口返回，进入成品文章库`,
              batchId,
              time: batchLabel,
              error: duplicateFailedCount ? `${duplicateFailedCount}篇需人工复盘标题或相似度` : '-',
            }
          : row,
      ),
    )
    navigate('library')
  }
  const startSystemJob = async (taskOverride?: TaskRow) => {
    if (isGenerating) return
    if (!activeBrand || !selectedCoreKeyword || !questionOptions.length) {
      notify(`请先补齐：${missingTaskItems.join('、') || '品牌生成资料'}。`)
      return
    }
    if (!projectKnowledgeRows.length) {
      notify(`请先补齐：${missingTaskItems.join('、') || '品牌知识库'}。`)
      return
    }
    const activeTask = taskOverride ?? rows.find((row) => row.project === activeBrand)
    const taskName = activeTask?.name || draft.name || `${selectedCoreKeyword}新闻任务`
    const taskForRun = activeTask ?? {
      project: activeBrand,
      name: taskName,
      question: `${selectedCoreKeyword}蒸馏词（${questionOptions.length}个）`,
      limit: draft.limit.replace('篇', '') || '2',
      created: '0',
      knowledge: draft.knowledge || knowledgeOptions[0] || '',
      detail: `${selectedCoreKeyword} / ${questionPoolLabel} / ${keywordPackLabel} / ${draft.knowledge || knowledgeOptions[0] || '品牌知识库'}`,
      error: '-',
      status: '待生成',
      latest: '待生成',
      time: `${localDate()} 现在`,
      batchId: '',
      articleType: draft.articleType,
      writingSceneMode: activeWritingSceneMode,
      industryScene: draft.industryScene || activeSceneName,
      userQuestions: draft.userQuestions || questionOptions.slice(0, 8).join('\n'),
      providerList: useRankingMaterials ? draft.providerList : '',
      mainReason: draft.mainReason,
      unfitScenario: draft.unfitScenario,
      selectedPains: draft.selectedPains || joinInputList(selectedPainItems),
      selectedDimensions: draft.selectedDimensions || joinInputList(selectedDimensionItems),
      selectedCandidates: useRankingMaterials ? draft.selectedCandidates || joinInputList(selectedCandidateNames.slice(0, 4)) : '',
      titlePreference: draft.titlePreference,
      forbiddenContent: draft.forbiddenContent,
    }
    const requestedCount = Number.parseInt(taskForRun.limit, 10) || 10
    const generateCount = Math.min(Math.max(requestedCount, 1), 100)
    const taskInputs = {
      articleType: taskForRun.articleType || draft.articleType || '榜单推荐',
      writingSceneMode: taskForRun.writingSceneMode || activeWritingSceneMode,
      industryScene: taskForRun.industryScene || draft.industryScene || activeSceneName,
      userQuestions: taskForRun.userQuestions || draft.userQuestions || questionOptions.slice(0, 8).join('\n'),
      providerList: needsRankingMaterials(taskForRun.articleType || draft.articleType) ? taskForRun.providerList || draft.providerList || '' : '',
      mainReason: taskForRun.mainReason || draft.mainReason || '',
      unfitScenario: taskForRun.unfitScenario || draft.unfitScenario || '',
      selectedPains: taskForRun.selectedPains || draft.selectedPains || joinInputList(selectedPainItems),
      selectedDimensions: taskForRun.selectedDimensions || draft.selectedDimensions || joinInputList(selectedDimensionItems),
      selectedCandidates: needsRankingMaterials(taskForRun.articleType || draft.articleType) ? taskForRun.selectedCandidates || draft.selectedCandidates || joinInputList(selectedCandidateNames.slice(0, 4)) : '',
      titlePreference: taskForRun.titlePreference || draft.titlePreference || '',
      forbiddenContent: taskForRun.forbiddenContent || draft.forbiddenContent || '',
    }
    const firstSceneDraft = getSceneDraftForIndex(0, taskInputs.writingSceneMode)
    const packetForRun = {
      ...workflowPacket,
      ...taskInputs,
      industryScene: firstSceneDraft.scene,
      userQuestions: taskInputs.userQuestions,
      questions: Array.from(new Set([
        ...workflowPacket.questions,
        ...taskInputs.userQuestions.split(/\r?\n|[；;]/).map((item) => item.trim()).filter(Boolean),
        ...firstSceneDraft.faqs,
        ...firstSceneDraft.pitfalls,
      ])),
      industryPains: firstSceneDraft.pains,
      selectionDimensions: firstSceneDraft.dimensions,
      providerList: needsRankingMaterials(taskInputs.articleType) ? taskInputs.providerList || selectedCandidateLines.join('\n') : '',
    }
    const selectedArticleTypes = parseArticleTypes(taskInputs.articleType)
    const queuePlans = plans.slice(0, generateCount).map((plan, index) => {
      const sceneDraft = getSceneDraftForIndex(index, taskInputs.writingSceneMode)
      const selectedType = selectedArticleTypes[index % selectedArticleTypes.length] || '榜单推荐'
      return {
        ...plan,
        ...taskInputs,
        articleType: selectedType,
        direction: selectedType || plan.direction,
        industryScene: sceneDraft.scene,
        selectedPains: joinInputList(sceneDraft.pains),
        selectedDimensions: joinInputList(sceneDraft.dimensions),
        angle: sceneDraft.scene || plan.angle,
        lockTitle: false,
        planIndex: index + 1,
      }
    })
    const batchLabel = localDateTime()
    const batchId = runBatchId(activeBrand, taskName)
    setActiveBatchId(batchId)
    setIsGenerating(true)
    setRows((current) => {
      const baseRows = current.some((row) => row.project === activeBrand && row.name === taskName)
        ? current
        : [taskForRun, ...current]
      return baseRows.map((row) =>
        row.project === activeBrand && row.name === taskName
          ? {
              ...row,
              status: '生成中',
              created: '0',
              latest: '后台任务',
              detail: `${generateCount}篇已提交后台，系统自动逐篇生成`,
              error: '-',
              batchId,
              time: batchLabel,
            }
          : row,
      )
    })
    try {
      const started = await apiJson<{ ok: boolean; job: ArticleJobStatus }>('/api/jobs/start', {
        project: activeProject,
        packet: packetForRun,
        plans: queuePlans,
        count: generateCount,
        task: taskForRun,
        taskName,
        batchId,
        batchLabel,
      }, 15000)
      setActiveJob(started.job)
      notify(`后台任务已启动：${started.job.id}`)
      let latestJob = started.job
      for (let poll = 0; poll < 720; poll += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 3000))
        const status = await apiJson<{ ok: boolean; job: ArticleJobStatus }>(`/api/jobs/status?id=${encodeURIComponent(started.job.id)}`, undefined, 15000)
        latestJob = status.job
        setActiveJob(latestJob)
        const latestLog = latestJob.logs[latestJob.logs.length - 1]?.message || '后台任务运行中'
        const syncedArticles = latestJob.articles.map((article, index) => ({
          ...article,
          title: ensureTitleHasCoreKeyword(article.title || queuePlans[index]?.title || '', selectedCoreKeyword),
          angle: article.angle || queuePlans[index]?.angle || '',
          id: article.id,
          project: activeProject.name,
          brand: activeProject.recommendWord,
          keyword: selectedCoreKeyword,
          status: article.apiIssues?.length ? '生成异常' as const : '已生成' as const,
          batchId,
          taskName,
          batchLabel,
          generationSource: article.apiIssues?.length ? 'API资料调用未返回' as const : article.generationSource ?? 'API资料调用自由写作' as const,
          duplicateNote: article.apiIssues?.length ? `接口未返回正文：${article.apiIssues.join('、')}` : article.duplicateNote,
        }))
        if (syncedArticles.length) {
          setArticleRows((current) => [
            ...syncedArticles,
            ...current.filter((article) => !syncedArticles.some((synced) => synced.id === article.id)),
          ])
        }
        const effectiveCompleted = Math.max(latestJob.completed, Math.min(syncedArticles.length, latestJob.total))
        const effectiveDone = latestJob.status === 'done' || syncedArticles.length >= generateCount
        setRows((current) =>
          current.map((row) =>
            row.project === activeBrand && row.name === taskName
              ? {
                  ...row,
                  created: String(effectiveCompleted),
                  latest: syncedArticles[0]?.id || '后台任务',
                  detail: effectiveDone
                    ? `任务完成：生成${latestJob.passed}篇，接口无正文${latestJob.failed}篇`
                    : `${latestLog}（${effectiveCompleted}/${latestJob.total}）`,
                  error: latestJob.error || (latestJob.failed ? `${latestJob.failed}篇接口无正文` : '-'),
                  status: effectiveDone ? '已生成' : latestJob.status === 'failed' ? '待生成' : '生成中',
                  batchId,
                  time: batchLabel,
                }
              : row,
          ),
        )
        if (effectiveDone || latestJob.status === 'failed') break
      }
      notify(`后台任务结束：完成${latestJob.completed}篇，生成${latestJob.passed}篇，接口无正文${latestJob.failed}篇。`)
      navigate('library')
    } catch (error) {
      notify(error instanceof Error ? error.message : '后台任务启动失败。')
      setRows((current) =>
        current.map((row) =>
          row.project === activeBrand && row.name === taskName
            ? { ...row, status: '待生成', latest: '待生成', error: '后台任务启动失败', detail: '请检查模型接口或服务器状态' }
            : row,
        ),
      )
    } finally {
      setIsGenerating(false)
    }
  }
  const confirmPlan = (title: string) => {
    setConfirmedPlans((current) => Array.from(new Set([title, ...current])))
    notify(`${title}计划卡已确认。`)
  }
  const deleteTask = (name: string) => {
    const target = rows.find((row) => row.name === name && row.project === activeBrand)
    setRows((current) => current.filter((row) => row.name !== name))
    setArticleRows((current) =>
      current.filter((article) => {
        const sameTask = article.project === activeBrand && (article.taskName === name || (target?.batchId && article.batchId === target.batchId))
        return !sameTask
      }),
    )
    notify(`${name}已删除。`)
  }
  const stopTask = (name: string) => {
    setRows((current) =>
      current.map((row) =>
        row.name === name
          ? {
              ...row,
              status: '待生成',
              latest: row.latest === '生成中' ? '待生成' : row.latest,
              detail: '任务已终止，可重新开始生成',
              error: '已手动终止',
            }
          : row,
      ),
    )
    setIsGenerating(false)
    notify(`${name}已终止，可重新创建或重新开始。`)
  }
  return (
    <section className="operation-page">
      <div className="operation-toolbar">
        <div>
          <strong>文章生成</strong>
          <span>一个品牌创建一条编辑稿单，系统按单篇逐篇调用资料生成文章。</span>
        </div>
        <div className="toolbar-actions">
          <select className="search-input" value={activeBrand} onChange={(event) => {
            setActiveBrand(event.target.value)
            updateDraft('project', event.target.value)
          }}>
            {projectRows.map((project) => (
              <option key={project.name}>{project.name}</option>
            ))}
          </select>
          <button className="primary-button" onClick={prepareTaskDraft}>创建生成任务</button>
        </div>
      </div>

      <div className="panel">
        <SectionTitle icon={ListChecks} title="生成稿单列表" desc="一个稿单就是一个品牌的一批文章；点开始生成，完成后进入成品文章库。" />
        <div className={missingTaskItems.length ? 'workflow-warning' : 'workflow-ready'}>
          {missingTaskItems.length
            ? `当前品牌还缺：${missingTaskItems.join('、')}。补齐后才能创建和启动生成任务。`
            : `当前品牌资料已就绪：${questionPoolLabel}，${keywordPackLabel}，${projectKnowledgeRows.length}个知识库，可启动单篇队列生成。`}
        </div>
        <div className="ops-scroll">
          <div className="ops-table task-table mature-task-table">
            <div className="ops-head">
              <span>任务名</span><span>文章类型</span><span>生成篇数</span><span>已生成</span><span>稿单资料</span><span>状态</span><span>创建时间</span><span>操作</span>
            </div>
            {currentTaskRows.map((row) => (
              <div className="ops-row" key={row.name}>
                <strong>{row.name}</strong>
                <span>{row.articleType || '榜单推荐'}</span>
                <span>{row.limit}</span>
                <span>{row.created}</span>
                <span>{row.knowledge}</span>
                <span className="pill">{displayTaskStatus(row.status)}</span>
                <span>{row.time}</span>
                <span className="row-actions">
                  <button onClick={() => {
                    if (row.batchId) setActiveBatchId(row.batchId)
                    navigate('library')
                  }}>查看结果</button>
                  {(displayTaskStatus(row.status) !== '生成中' || !activeJob) && <button onClick={() => startSystemJob(row)}>{displayTaskStatus(row.status) === '生成中' ? '重新开始' : '开始'}</button>}
                  {row.status === '生成中' && activeJob && <button onClick={() => stopTask(row.name)}>终止任务</button>}
                  <button className="danger-button" onClick={() => deleteTask(row.name)}>删除</button>
                </span>
              </div>
            ))}
          </div>
        </div>
        {!currentTaskRows.length && (
          <div className="empty-state">
            <strong>当前品牌还没有生成任务</strong>
            <span>先确认核心词、关键词库和品牌知识库，再创建一条编辑稿单开始生成。</span>
            <button className="primary-button" onClick={prepareTaskDraft}>创建生成任务</button>
          </div>
        )}
        <p className="table-note">当前品牌：{activeBrand}。每条任务独立启动，每篇文章按单篇隔离调用资料生成。</p>
      </div>

      {activeJob && (
        <div className="panel">
          <SectionTitle icon={Gauge} title="生成进度" desc="系统按单篇队列生成，完成后进入成品文章库。" />
          <div className="job-status-strip">
            <span>任务ID：{activeJob.id}</span>
            <span>状态：{activeJob.status}</span>
            <span>进度：{activeJob.completed}/{activeJob.total}</span>
            <span>已生成：{activeJob.passed}</span>
            <span>接口无正文：{activeJob.failed}</span>
          </div>
          <div className="job-log-list">
            {activeJob.logs.slice(-12).map((log, index) => (
              <p key={`${log.time}-${index}`}><b>{log.time}</b>{log.message}</p>
            ))}
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="modal-backdrop">
          <div className="form-modal wide-modal">
            <div className="modal-head">
              <strong>创建生成任务</strong>
              <button onClick={() => setShowTaskModal(false)}>关闭</button>
            </div>
            <div className="create-grid">
              <Field label="任务名称" value={draft.name} />
              <SelectField label="归属品牌" value={draft.project} options={projectRows.map((project) => project.name)} onChange={(value) => {
                setActiveBrand(value)
                updateDraft('project', value)
              }} />
              <SelectField label="核心词" value={selectedCoreKeyword} options={coreOptions} onChange={(value) => {
                const nextQuestions = questionRows.filter((row) => questionBelongsToBrand(row, activeBrand, value)).map(readQuestionText)
                const nextQuestion = nextQuestions[0] ?? `${value}怎么选服务商`
                const nextKeywordCount = keywordLibraryRows.filter((row) => row[0] === activeBrand && row[1] === value).length
                updateDraft('coreKeyword', value)
                updateDraft('trainingWord', nextQuestion)
                updateDraft('keywordPack', `${value}关键词库（${nextKeywordCount}个）`)
              }} />
              <Field label="当前写作场景" value={activeWritingSceneMode === '按实际场景写' ? `${activeSceneName}（批量自动轮换）` : activeSceneName} />
              <Field label="蒸馏词总数" value={questionPoolLabel} />
              <Field label="关键词库总数" value={keywordPackOptions[0] || keywordPackLabel} />
              <SelectField label="品牌知识库" value={draft.knowledge} options={knowledgeOptions} onChange={(value) => updateDraft('knowledge', value)} />
              <SelectField label="生成篇数" value={draft.limit} options={['1篇', '2篇', '5篇', '10篇', '20篇', '50篇', '100篇']} onChange={(value) => updateDraft('limit', value)} />
            </div>
            <div className="type-selector">
              <div>
                <strong>写作场景</strong>
                <span>默认二选一：按项目自己的行业写，或按实际应用场景轮换写。</span>
              </div>
              <div className="type-chip-grid">
                {writingSceneModes.map((mode) => (
                  <button
                    type="button"
                    className={activeWritingSceneMode === mode ? 'type-chip active' : 'type-chip'}
                    key={mode}
                    onClick={() => updateWritingSceneMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div className="type-selector">
              <div>
                <strong>客户痛点</strong>
                <span>多选，文章会围绕这些真实场景展开，不再泛泛写GEO行业。</span>
              </div>
              <div className="type-chip-grid">
                {painOptions.map((pain) => (
                  <button
                    type="button"
                    className={selectedPainItems.includes(pain) ? 'type-chip active' : 'type-chip'}
                    key={pain}
                    onClick={() => toggleDraftListItem('selectedPains', pain)}
                  >
                    {pain}
                  </button>
                ))}
              </div>
            </div>
            <div className="type-selector">
              <div>
                <strong>选型维度</strong>
                <span>多选，作为榜单成立和服务商推荐的比较口径。</span>
              </div>
              <div className="type-chip-grid">
                {dimensionOptions.map((dimension) => (
                  <button
                    type="button"
                    className={selectedDimensionItems.includes(dimension) ? 'type-chip active' : 'type-chip'}
                    key={dimension}
                    onClick={() => toggleDraftListItem('selectedDimensions', dimension)}
                  >
                    {dimension}
                  </button>
                ))}
              </div>
            </div>
            {useRankingMaterials && <div className="type-selector">
              <div>
                <strong>对比服务商</strong>
                <span>只选另外4家；主推品牌由项目资料自动带入，不在这里重复填写。</span>
              </div>
              <div className="type-chip-grid">
                {projectCandidateRows.length ? projectCandidateRows.map((row) => (
                  <button
                    type="button"
                    className={selectedCandidateNames.includes(row[1]) ? 'type-chip active' : 'type-chip'}
                    key={row[1]}
                    onClick={() => {
                      toggleDraftListItem('selectedCandidates', row[1])
                      const nextSelected = selectedCandidateNames.includes(row[1])
                        ? selectedCandidateNames.filter((name) => name !== row[1])
                        : [...selectedCandidateNames, row[1]]
                      const nextLines = projectCandidateRows
                        .filter((candidate) => nextSelected.includes(candidate[1]))
                        .map(formatCandidateLine)
                        .filter(Boolean)
                      updateDraft('providerList', nextLines.join('\n'))
                    }}
                  >
                    {row[1]}
                  </button>
                )) : <button type="button" className="type-chip" onClick={() => navigate('candidates')}>去添加4家对比服务商</button>}
              </div>
            </div>}
            <div className="type-selector">
              <div>
                <strong>文章类型</strong>
                <span>可多选，系统按单篇轮换；行业只作为痛点场景，主线仍然是GEO公司/服务商选型。</span>
              </div>
              <div className="type-chip-grid">
                {articleTypeOptions.map((type) => (
                  <button
                    type="button"
                    className={parseArticleTypes(draft.articleType).includes(type) ? 'type-chip active' : 'type-chip'}
                    key={type}
                    onClick={() => toggleArticleType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="task-material-preview">
              <strong>本次调用内容</strong>
              <span>写作场景：{activeWritingSceneMode}</span>
              <span>当前场景：{activeWritingSceneMode === '按实际场景写' ? `${activeSceneName}，批量时自动轮换` : activeSceneName}</span>
              <span>核心词：{selectedCoreKeyword}</span>
              <span>客户痛点：{selectedPainItems.length} 个</span>
              <span>选型维度：{selectedDimensionItems.length} 个</span>
              <span>对比服务商：{useRankingMaterials ? selectedCandidateNames.length : 0} 个</span>
              <span>蒸馏词：{questionOptions.length} 个</span>
              <span>关键词库：{projectKeywordLibrary.length} 个</span>
              <span>知识库：{draft.knowledge || knowledgeOptions[0] || '待选择'}</span>
            </div>
            <p className="table-note">生成任务只选择已有资料。用户问题、关键词库、品牌资料和权威引证由系统自动组装进API稿单。</p>
            <div className={missingTaskItems.length ? 'workflow-warning' : 'workflow-ready'}>
              {missingTaskItems.length
                ? `当前还不能生成，缺少：${missingTaskItems.join('、')}。`
                : `可生成：系统将从${questionPoolLabel}中轮换选题，并优先调用${keywordPackLabel}。`}
            </div>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setShowTaskModal(false)}>取消</button>
              <button className="primary-button" onClick={createTask}>确定</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function Audit({ notify, navigate, articleRows, setArticleRows, activeBrand, activeBatchId }: ActionProps & ArticleStateProps & Pick<ActiveBrandProps, 'activeBrand'> & Pick<ActiveBatchProps, 'activeBatchId'>) {
  const [selectedArticle, setSelectedArticle] = useState('')
  const [statusFilter, setStatusFilter] = useState('全部文章')
  const visibleArticles = articleRows.filter((article) => {
    if (article.project !== activeBrand) return false
    if (activeBatchId && article.batchId !== activeBatchId) return false
    if (statusFilter === '已生成') return article.status === '已生成'
    if (statusFilter === '生成异常') return article.status === '生成异常'
    return true
  })
  const currentArticle = visibleArticles.find((article) => article.id === selectedArticle) ?? visibleArticles[0]
  const approveArticle = () => {
    if (!currentArticle) return
    setArticleRows((current) =>
      current.map((article) =>
        article.id === currentArticle.id ? { ...article, status: '已生成' } : article,
      ),
    )
    setSelectedArticle('')
    notify(`${currentArticle.title}已进入成品文章库。`)
    navigate('library')
  }
  const rejectArticle = () => {
    if (!currentArticle) return
    setArticleRows((current) =>
      current.map((article) =>
        article.id === currentArticle.id ? { ...article, status: '生成异常' } : article,
      ),
    )
    setSelectedArticle('')
    notify(`${currentArticle.title}已退回生产层，需重新生成。`)
  }
  const auditBatch = () => {
    setArticleRows((current) =>
      current.map((article) => {
        if (article.project !== activeBrand) return article
        if (activeBatchId && article.batchId !== activeBatchId) return article
        return article.apiIssues?.length ? { ...article, status: '生成异常' } : { ...article, status: '已生成' }
      }),
    )
    notify('旧审核规则已关闭，当前批次文章已按生成状态整理。')
  }
  const deleteArticle = (id: string) => {
    const target = visibleArticles.find((article) => article.id === id)
    if (!target) return
    setArticleRows((current) => current.filter((article) => article.id !== id || article.project !== activeBrand))
    notify(`${target?.title ?? '文章'}已删除。`)
  }
  return (
    <section className="operation-page">
      <div className="operation-toolbar">
        <div>
          <strong>文章查看</strong>
          <span>{activeBatchId ? `只查看当前任务批次：${activeBatchId}` : '这里查看系统生成文章。'}</span>
        </div>
        <div className="toolbar-actions">
          <select className="search-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option>全部文章</option>
            <option>已生成</option>
            <option>生成异常</option>
          </select>
          <button className="primary-button" onClick={auditBatch}>整理当前批次</button>
        </div>
      </div>

      <div className="panel">
        <SectionTitle icon={Newspaper} title="文章列表" desc="列表为主体，点击查看完整正文。" />
        <div className="ops-table audit-table">
          <div className="ops-head"><span>标题</span><span>文章方向</span><span>核心词</span><span>字数</span><span>来源</span><span>状态</span><span>操作</span></div>
          {visibleArticles.map((article) => (
            <div className="ops-row" key={article.id}>
              <strong>{article.title}</strong>
              <span>{article.angle}</span>
              <span>{article.keyword}</span>
              <span>{article.words}字</span>
              <span>{displayGenerationSource(article.generationSource)}</span>
              <span className={article.status === '生成异常' ? 'pill danger-pill' : 'pill'}>{article.status}</span>
              <span className="row-actions">
                <button onClick={() => setSelectedArticle(article.id)}>查看</button>
                <button className="danger-button" onClick={() => deleteArticle(article.id)}>删除</button>
              </span>
            </div>
          ))}
        </div>
        <p className="table-note">旧审核、高分、新闻口吻和固定结构规则已关闭。</p>
      </div>

      {selectedArticle && currentArticle && (
        <div className="modal-backdrop">
          <div className="form-modal wide-modal">
            <div className="modal-head">
              <strong>文章详情</strong>
              <button onClick={() => setSelectedArticle('')}>关闭</button>
            </div>
            <SectionTitle icon={ShieldCheck} title={currentArticle.title} desc="仅查看系统生成内容。" />
          {Boolean(currentArticle.apiIssues?.length || currentArticle.duplicateNote) && (
            <div className="article-body-preview system-issues">
              <strong>接口提示</strong>
              {currentArticle.duplicateNote && <p>{currentArticle.duplicateNote}</p>}
              {currentArticle.apiIssues?.map((issue) => <p key={issue}>{issue}</p>)}
            </div>
          )}
          {currentArticle.body && (
            <div className="article-body-preview">
              <strong>生成正文</strong>
              <pre>{currentArticle.body}</pre>
            </div>
          )}
          <div className="audit-actions">
            <button className="primary-button" onClick={() => setSelectedArticle('')}>完成</button>
          </div>
          </div>
        </div>
      )}
    </section>
  )
}

function LibraryPage({ notify, navigate, articleRows, setArticleRows, activeBrand, activeBatchId, setActiveBatchId }: ActionProps & ArticleStateProps & Pick<ActiveBrandProps, 'activeBrand'> & ActiveBatchProps) {
  const [previewId, setPreviewId] = useState('')
  const [selectedArticles, setSelectedArticles] = useState<string[]>([])
  const [showAllArticles, setShowAllArticles] = useState(false)
  const [isEditingArticle, setIsEditingArticle] = useState(false)
  const [editArticleTitle, setEditArticleTitle] = useState('')
  const [editArticleBody, setEditArticleBody] = useState('')
  const [storedTaskRows] = useStoredState('geo.taskRows', taskRows)
  const [galleryRows] = useStoredState<string[][]>('geo.galleryRows', [])
  const scopedArticles = articleRows.filter((article) => article.project === activeBrand)
  useEffect(() => { setPreviewId(''); setSelectedArticles([]); setIsEditingArticle(false); setShowAllArticles(false) }, [activeBrand])
  const batches = Array.from(
    scopedArticles
      .filter((article) => article.status === '已生成' || article.status === '生成异常')
      .reduce((map, article) => {
        const id = article.batchId || `${article.project || activeBrand}-历史成品`
        const current = map.get(id) ?? {
          id,
          project: article.project || activeBrand,
          taskName: article.batchId ? article.taskName ?? '未命名任务' : `${article.project || activeBrand}历史成品`,
          batchLabel: article.batchLabel || '',
          total: 0,
          passed: 0,
          failed: 0,
          api: 0,
          fallback: 0,
        }
        current.total += 1
        if (article.status === '已生成') current.passed += 1
        if (article.status === '生成异常') current.failed += 1
        if (article.generationSource === 'API成稿' || article.generationSource === 'API资料调用自由写作') current.api += 1
        if (article.generationSource === 'API资料调用未返回') current.fallback += 1
        map.set(id, current)
        return map
      }, new Map<string, { id: string; project: string; taskName: string; batchLabel: string; total: number; passed: number; failed: number; api: number; fallback: number }>())
      .values(),
  ).sort((left, right) => right.id.localeCompare(left.id, 'zh-CN', { numeric: true }))
  const defaultBatchId = batches.find((batch) => batch.passed > 0)?.id || batches[0]?.id || ''
  const activeBatchHasArticles = batches.some((batch) => batch.id === activeBatchId && batch.passed > 0)
  const latestBatchId = activeBatchHasArticles ? activeBatchId : defaultBatchId
  const previewArticle = scopedArticles.find((article) => article.id === previewId)
  const selectedBatch = batches.find((batch) => batch.id === latestBatchId)
  const articleInSelectedBatch = (article: Article) => {
    if (showAllArticles || !latestBatchId) return true
    if (article.batchId) return article.batchId === latestBatchId
    return latestBatchId.endsWith('-历史成品') && article.project === selectedBatch?.project && !article.batchId
  }
  const allBrandPassedArticles = scopedArticles.filter((item) => item.status === '已生成')
  const passedArticles = allBrandPassedArticles.filter(articleInSelectedBatch)
  const selectedPassedArticles = passedArticles.filter((article) => selectedArticles.includes(article.id))
  const taskForBatch = storedTaskRows.find((row) => row.batchId === latestBatchId)
  const allCurrentBatchArticles = scopedArticles.filter(articleInSelectedBatch)
  const imageCountForArticle = (article: Article) => [...(article.body || '').matchAll(/!\[[^\]]*\]\([^)]+\)/g)].length
  const bodyEditorRef = useRef<HTMLTextAreaElement>(null)
  const editorImages = galleryRows.filter(row => row[0] === previewArticle?.project && row[5])
  const insertImage = (row: string[]) => {
    if (!previewArticle || row[0] !== previewArticle.project) return
    const editor = bodyEditorRef.current
    const start = editor?.selectionStart ?? editArticleBody.length
    const end = editor?.selectionEnd ?? start
    const alt = (row[6] || row[1] || '正文配图').replace(/[\[\]\r\n]/g, '')
    const inserted = `\n\n![${alt}](${row[5]})\n\n`
    setEditArticleBody(editArticleBody.slice(0, start) + inserted + editArticleBody.slice(end))
    requestAnimationFrame(() => { editor?.focus(); editor?.setSelectionRange(start + inserted.length, start + inserted.length) })
  }
  const openArticleReader = (article: Article) => {
    setPreviewId(article.id)
    setEditArticleTitle(article.title)
    setEditArticleBody(article.body || '')
    setIsEditingArticle(false)
  }
  const savePreviewArticle = async () => {
    if (!previewArticle) return
    const nextBody = editArticleBody.trim()
    const updated = articleRows.map((article) => (
      article.id === previewArticle.id && article.project === activeBrand
        ? { ...article, title: editArticleTitle.trim() || article.title, body: nextBody, imagePaths: [...nextBody.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1]), words: String(chineseCount(nextBody)) }
        : article
    ))
    try {
      const result = await apiJson<{ value: Article[] }>('/api/state', { key: 'geo.articleRows', value: updated }, 5000)
      setArticleRows(result.value)
    } catch (error) {
      notify(error instanceof Error ? error.message : '文章保存失败，请重试。')
      return
    }
    setIsEditingArticle(false)
    notify('文章已保存，下载会使用当前编辑后的版本。')
  }
  const toggleSelectedArticle = (id: string) => {
    setSelectedArticles((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }
  const toggleAllPassedArticles = () => {
    setSelectedArticles((current) => {
      const currentVisible = current.filter((id) => passedArticles.some((article) => article.id === id))
      return currentVisible.length === passedArticles.length ? [] : passedArticles.map((article) => article.id)
    })
  }
  const downloadArticles = async (targets: Article[], filePrefix = 'GEO成品文章') => {
    targets = targets.filter(article => scopedArticles.some(row => row.id === article.id && row.project === article.project))
    if (!targets.length) {
      notify('当前没有可下载的成品文章。')
      return
    }
    try {
      const result = await apiJson<{ ok: boolean; downloadUrl: string; filePath: string; count: number }>('/api/articles/export', {
        brand: activeBrand,
        filePrefix,
        format: 'doc',
        articles: targets,
      })
      const link = document.createElement('a')
      const fileUrl = URL.createObjectURL(await fetchProjectFile(result.downloadUrl))
      link.href = fileUrl
      link.download = result.filePath.split(/[\\/]/).pop() || ''
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000)
      notify(`已导出${result.count}篇文章。`)
    } catch (error) {
      notify(error instanceof Error ? error.message : '下载失败，请重试。')
    }
  }
  const deleteLibraryArticle = (id: string) => {
    const target = scopedArticles.find((article) => article.id === id)
    if (!target) return
    setArticleRows((current) => current.filter((article) => article.id !== id || article.project !== activeBrand))
    setSelectedArticles((current) => current.filter((item) => item !== id))
    notify(`${target?.title ?? '文章'}已从成品文章库删除。`)
  }
  const downloadSelectedArticles = () => {
    const targets = selectedPassedArticles.length ? selectedPassedArticles : passedArticles
    downloadArticles(targets, `${activeBrand}_${taskForBatch?.name ?? '当前任务'}_成品文章`)
  }
  const downloadAllArticles = () => {
    downloadArticles(allBrandPassedArticles, `${activeBrand}_全部成品文章`)
  }
  return (
    <section className="operation-page">
      <div className="operation-toolbar library-toolbar">
        <div>
          <strong>成品文章库</strong>
          <span>{showAllArticles ? `当前显示${activeBrand}全部成品文章` : latestBatchId ? `当前显示最新任务：${taskForBatch?.name ?? selectedBatch?.taskName ?? latestBatchId}` : '这里只放已生成文章，后续可选分发平台。'}</span>
        </div>
        <div className="toolbar-actions">
          <div className="toolbar-group">
            <button className="ghost-button" disabled={!allBrandPassedArticles.length} onClick={() => {
              setShowAllArticles((current) => !current)
              setSelectedArticles([])
              setPreviewId('')
            }}>
              {showAllArticles ? '最新任务' : '全部成品'}
            </button>
            <button className="ghost-button" disabled={!passedArticles.length} onClick={toggleAllPassedArticles}>
              {selectedPassedArticles.length === passedArticles.length && passedArticles.length > 0 ? '取消全选' : '全选'}
            </button>
          </div>
          <div className="toolbar-group primary-group">
            <button className="ghost-button" disabled={!passedArticles.length} onClick={downloadSelectedArticles}>{selectedPassedArticles.length ? `下载选中${selectedPassedArticles.length}篇` : '下载当前批次'}</button>
            <button className="ghost-button" disabled={!allBrandPassedArticles.length} onClick={downloadAllArticles}>下载全部Word</button>
            <button
              className="primary-button"
              data-testid="select-distribution"
              onClick={() => {
                notify('已进入分发中心，可选择平台和文章。')
                navigate('distribution')
              }}
            >
              选择分发
            </button>
          </div>
        </div>
      </div>
      <div className="panel">
        <SectionTitle icon={ListChecks} title="文章任务列表" desc="一次生成任务对应一批文章；没有批次号的旧成品已归到历史成品，点击即可查看。" />
        <div className="ops-table task-batch-table">
            <div className="ops-head"><span>任务名</span><span>生成时间</span><span>品牌</span><span>总数</span><span>已生成</span><span>接口无正文</span><span>API成稿</span><span>API未返回</span><span>操作</span></div>
          {batches.map((batch) => (
            <div className={batch.id === latestBatchId ? 'ops-row active-row' : 'ops-row'} key={batch.id}>
              <strong>{batch.taskName}</strong>
              <span>{batch.batchLabel || batch.id}</span>
              <span>{batch.project}</span>
              <span>{batch.total}</span>
              <span>{batch.passed}</span>
              <span>{batch.failed}</span>
              <span>{batch.api}</span>
              <span>{batch.fallback}</span>
              <span className="row-actions">
                <button onClick={() => {
                  setActiveBatchId(batch.id)
                  setShowAllArticles(false)
                  setSelectedArticles([])
                  setPreviewId('')
                }}>查看文章</button>
                <button onClick={() => downloadArticles(scopedArticles.filter((article) => article.status === '已生成' && (article.batchId ? article.batchId === batch.id : batch.id.endsWith('-历史成品') && article.project === batch.project)), `${batch.project}_${batch.taskName}`)}>下载本批</button>
              </span>
            </div>
          ))}
        </div>
        {!batches.length && (
          <div className="empty-state">
            <strong>还没有文章批次</strong>
            <span>生成任务完成后，这里会按批次归档，支持查看、下载本批和进入分发。</span>
            <button className="primary-button" onClick={() => navigate('tasks')}>去生成文章</button>
          </div>
        )}
      </div>
      <div className="panel">
        <SectionTitle icon={Newspaper} title={showAllArticles ? '全部成品文章列表' : '当前任务文章列表'} desc={showAllArticles ? '显示当前品牌全部已生成文章，可全选或批量下载Word。' : '默认显示最新任务里已生成的文章，避免旧文章混入当前下载。'} />
        <div className="ops-table library-table">
          <div className="ops-head"><span>选择</span><span>标题</span><span>核心词</span><span>配图</span><span>来源</span><span>字数</span><span>状态</span><span>操作</span></div>
          {passedArticles.map((article) => (
            <div className="ops-row" key={article.id}>
              <label className="row-check">
                <input type="checkbox" checked={selectedArticles.includes(article.id)} onChange={() => toggleSelectedArticle(article.id)} />
              </label>
              <strong>{article.title}</strong><span>{article.keyword}</span><span>{imageCountForArticle(article) ? `${imageCountForArticle(article)}张可用` : '待上传'}</span><span>{displayGenerationSource(article.generationSource)}</span><span>{article.words}字</span><span className="pill">{article.status}</span>
              <span className="row-actions">
                <button onClick={() => openArticleReader(article)}>全文查看</button>
                <button onClick={() => downloadArticles([article], article.title)}>下载</button>
                <button className="danger-button" onClick={() => deleteLibraryArticle(article.id)}>删除</button>
              </span>
            </div>
          ))}
        </div>
        {!passedArticles.length && (
          <div className="empty-state">
            <strong>当前视图没有成品文章</strong>
            <span>切换到全部成品，或回到AI写作任务重新生成。</span>
            <button className="primary-button" onClick={() => navigate('tasks')}>回到写作任务</button>
          </div>
        )}
        <p className="table-note">{showAllArticles ? `当前视图共 ${allCurrentBatchArticles.length} 篇文章，已生成 ${passedArticles.length} 篇。` : `当前任务共 ${allCurrentBatchArticles.length} 篇，已生成 ${passedArticles.length} 篇。`} 不勾选时默认下载当前视图全部已生成文章。</p>
      </div>
      {previewArticle && (
        <div className="modal-backdrop">
          <div className="form-modal wide-modal article-reader-modal">
            <div className="modal-head">
              <strong>全文查看</strong>
              <button onClick={() => {
                setPreviewId('')
                setIsEditingArticle(false)
              }}>关闭</button>
            </div>
            <div className="article-reader">
              {isEditingArticle ? (
                <div className="article-editor">
                  <label>
                    <span>文章标题</span>
                    <input value={editArticleTitle} onChange={(event) => setEditArticleTitle(event.target.value)} />
                  </label>
                  <label>
                    <span>文章正文</span>
                    <textarea aria-label="文章正文" ref={bodyEditorRef} value={editArticleBody} onChange={(event) => setEditArticleBody(event.target.value)} />
                  </label>
                  <label><span>插入当前品牌图片</span><select aria-label="插入当前品牌图片" value="" onChange={event => {
                    const row = editorImages.find(image => image[5] === event.target.value)
                    if (row) insertImage(row)
                  }}><option value="">选择图片插入光标位置</option>{editorImages.map(row => <option key={row[5]} value={row[5]}>{row[6] || row[1]}</option>)}</select></label>
                </div>
              ) : (
                <article className="article-page-view">
                  <h1>{previewArticle.title}</h1>
                  <div className="article-meta-line">
                    <span>核心词：{previewArticle.keyword}</span>
                    <span>字数：{previewArticle.words}字</span>
                    <span>配图：{imageCountForArticle(previewArticle)}张</span>
                    <span>{displayGenerationSource(previewArticle.generationSource)}</span>
                  </div>
                  <div className="article-content-view">
                    {previewArticle.body ? renderArticleBody(previewArticle.body) : <p>当前文章暂无完整正文。</p>}
                  </div>
                </article>
              )}
            </div>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => downloadArticles([previewArticle], previewArticle.title)}>下载本文</button>
              <button className="ghost-button" onClick={() => setIsEditingArticle((current) => !current)}>{isEditingArticle ? '取消编辑' : '编辑文章'}</button>
              {isEditingArticle && <button className="primary-button" onClick={savePreviewArticle}>保存修改</button>}
              {!isEditingArticle && <button className="primary-button" onClick={() => setPreviewId('')}>完成</button>}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function GraphicWorkbench({ notify, navigate, articleRows, activeBrand }: ActionProps & { articleRows: Article[] } & Pick<ActiveBrandProps, 'activeBrand'>) {
  const [selectedArticleId, setSelectedArticleId] = useState('')
  const [galleryRows] = useStoredState<string[][]>('geo.galleryRows', [])
  const availableArticles = articleRows.filter((article) => article.project === activeBrand && article.status === '已生成')
  const currentArticle = availableArticles.find((article) => article.id === selectedArticleId) ?? availableArticles[0]
  const projectImages = galleryRows.filter((row) => row[0] === activeBrand)
  const coverImages = projectImages.filter((row) => /封面/.test(row[1] || row[2] || ''))
  const bodyImages = projectImages.filter((row) => !/封面/.test(row[1] || row[2] || ''))
  const createGraphicVersion = () => {
    if (!currentArticle) {
      notify('请先生成成品文章。')
      navigate('tasks')
      return
    }
    if (!projectImages.length) {
      notify('请先上传图库素材，再做图文加工。')
      navigate('gallery')
      return
    }
    notify(`${currentArticle.title}已生成图文加工预案，可进入分发发布继续处理。`)
    navigate('distribution')
  }
  return (
    <section className="operation-page">
      <div className="operation-toolbar">
        <div>
          <strong>图文加工</strong>
          <span>文章生成后再处理封面、正文配图、摘要和平台标题，不干扰正文生产。</span>
        </div>
        <div className="toolbar-actions">
          <button className="ghost-button" onClick={() => navigate('gallery')}>管理图库</button>
          <button className="primary-button" onClick={createGraphicVersion}>生成图文预案</button>
        </div>
      </div>

      <div className="page-grid">
        <div className="panel">
          <SectionTitle icon={FileText} title="选择文章" desc="只处理当前项目已生成的成品文章。" />
          <div className="ops-table graphic-table">
            <div className="ops-head"><span>文章标题</span><span>字数</span><span>状态</span><span>操作</span></div>
            {availableArticles.slice(0, 12).map((article) => (
              <div className="ops-row" key={article.id}>
                <strong>{article.title}</strong>
                <span>{article.words}字</span>
                <span className="pill">{article.status}</span>
                <span className="row-actions">
                  <button onClick={() => setSelectedArticleId(article.id)}>选择</button>
                </span>
              </div>
            ))}
          </div>
          {!availableArticles.length && (
            <div className="empty-card">
              <strong>还没有成品文章</strong>
              <span>先完成文章生成，再进入图文加工。</span>
              <button className="primary-button" onClick={() => navigate('tasks')}>去生成文章</button>
            </div>
          )}
        </div>
        <div className="panel">
          <SectionTitle icon={ImageIcon} title="配图预案" desc="封面和正文图从当前项目图库里选择。" />
          <div className="task-material-preview">
            <strong>{currentArticle?.title || '待选择文章'}</strong>
            <span>封面图：{coverImages.length} 张可选</span>
            <span>正文图：{bodyImages.length} 张可选</span>
            <span>摘要：由文章首屏和标题场景生成</span>
            <span>平台标题：在分发发布阶段按平台生成</span>
          </div>
          <p className="table-note">图文加工只处理展示形态，不回写正文规则；正文仍以skill稿单和项目资料为准。</p>
        </div>
      </div>
    </section>
  )
}

function Distribution({ notify, articleRows, activeBrand }: ActionProps & { articleRows: Article[] } & Pick<ActiveBrandProps, 'activeBrand'>) {
  const [distributionTasks, setDistributionTasks] = useStoredState<string[]>('geo.distributionTasks', [])
  const [selectedArticles, setSelectedArticles] = useState<string[]>([])
  const [configPlatform, setConfigPlatform] = useState('')
  const platforms = [
    ['官网SEO', '已连接', '自动发布', '新闻通稿版'],
    ['新闻源网站', '待配置', '人工确认', '媒体标题版'],
    ['博客园', '待配置', '队列发布', '技术观察版'],
    ['今日头条', '待配置', '队列发布', '短标题+封面'],
    ['搜狐号', '待配置', '队列发布', '新闻通稿版'],
    ['百家号', '待配置', '人工确认', '合规审核版'],
  ]
  const passedArticles = articleRows.filter((item) => item.status === '已生成' && item.project === activeBrand)
  const visibleDistributionTasks = distributionTasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => task.startsWith(`${activeBrand}｜`))
  const toggleArticle = (id: string) => {
    setSelectedArticles((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }
  const createDistributionTask = () => {
    if (!passedArticles.length) {
      notify('当前品牌还没有成品文章，请先生成文章。')
      return
    }
    const count = selectedArticles.length || Math.min(passedArticles.length, 3)
    setDistributionTasks((current) => [`${activeBrand}｜官网SEO + 新闻源网站｜${count}篇文章｜待确认｜${new Date().toLocaleTimeString('zh-CN')}`, ...current])
    notify(`分发任务已创建，已选择${count}篇文章。`)
  }
  const deleteDistributionTask = (taskIndex: number) => {
    setDistributionTasks((current) => current.filter((_, index) => index !== taskIndex))
    notify('分发任务已删除。')
  }
  return (
    <section className="operation-page">
      <div className="operation-toolbar">
        <div>
          <strong>文章发布</strong>
          <span>从文章列表选择成品稿，再生成对应平台标题、摘要、封面和发布队列。</span>
        </div>
        <div className="toolbar-actions">
          <button className="ghost-button" onClick={() => setConfigPlatform('全部平台')}>平台配置</button>
          <button
            className="primary-button"
            data-testid="create-distribution-task"
            onClick={createDistributionTask}
          >
            创建分发任务
          </button>
        </div>
      </div>
      <div className="distribution-layout">
        <div className="panel">
          <SectionTitle icon={Send} title="发布平台" desc="1.0先预留平台配置，后续对接新闻源网站和官网。" />
          <div className="ops-table platform-table">
            <div className="ops-head"><span>平台</span><span>连接状态</span><span>发布方式</span><span>内容版本</span><span>操作</span></div>
            {platforms.map((row) => (
              <div className="ops-row" key={row[0]}>
                <strong>{row[0]}</strong><span className={row[1] === '已连接' ? 'pill' : 'pill muted'}>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span><button onClick={() => setConfigPlatform(row[0])}>配置</button>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <SectionTitle icon={Newspaper} title="待分发文章" desc="只显示成品文章库里已生成的稿件。" />
          <div className="article-list compact-list">
            {passedArticles.map((article) => (
              <article className="article-row" key={article.id}>
                <div>
                  <strong>{article.title}</strong>
                  <p>{article.words}字 · {displayGenerationSource(article.generationSource)}</p>
                </div>
                <button className="row-button" onClick={() => toggleArticle(article.id)}>
                  {selectedArticles.includes(article.id) ? '已选择' : '选择'}
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>
      {visibleDistributionTasks.length > 0 && (
        <div className="panel">
          <SectionTitle icon={ListChecks} title="分发任务队列" desc="创建后能看到任务状态，后续再接真实发布接口。" />
          <div className="mini-list">
            {visibleDistributionTasks.map(({ task, index }) => (
              <span key={`${task}-${index}`}>
                {task}
                <button className="mini-delete" onClick={() => deleteDistributionTask(index)}>删除</button>
              </span>
            ))}
          </div>
        </div>
      )}
      {configPlatform && (
        <div className="modal-backdrop">
          <div className="form-modal">
            <div className="modal-head">
              <strong>{configPlatform}配置</strong>
              <button onClick={() => setConfigPlatform('')}>关闭</button>
            </div>
            <div className="create-grid single">
              <EditableField label="发布账号" value={`${configPlatform}账号待绑定`} onChange={() => undefined} />
              <EditableField label="发布方式" value="人工确认后发布" onChange={() => undefined} />
              <EditableField label="内容版本" value="文章正文 + 平台标题摘要" onChange={() => undefined} />
            </div>
            <div className="modal-actions">
              <button className="primary-button" onClick={() => {
                notify(`${configPlatform}配置已保存。`)
                setConfigPlatform('')
              }}>保存配置</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function DataCenter({ notify }: ActionProps) {
  const [detail, setDetail] = useState('')
  const rows: string[][] = []
  return (
    <section className="operation-page">
      <div className="operation-toolbar">
        <div>
          <strong>数据中心</strong>
          <span>查看文章生成、接口异常、关键词覆盖和分发效果。</span>
        </div>
        <div className="toolbar-actions">
          <input className="search-input" defaultValue="近7天" />
          <button className="ghost-button" onClick={() => setDetail('导出数据')}>导出数据</button>
        </div>
      </div>
      <div className="metric-row">
        <Metric title="核心词覆盖" value="0%" note="生成文章后统计" />
        <Metric title="平均阅读完成度" value="0%" note="生成文章后统计" />
        <Metric title="退回率" value="0%" note="生成文章后统计" />
        <Metric title="分发成功率" value="待接入" note="发布器二期连接" />
      </div>
      <div className="panel">
        <SectionTitle icon={BarChart3} title="质量趋势" desc="后续接真实数据，现在先展示系统要监控的字段。" />
        <div className="ops-table data-table">
          <div className="ops-head"><span>批次</span><span>生成数</span><span>通过数</span><span>平均分</span><span>主要退回原因</span><span>操作</span></div>
          {rows.map((row) => (
            <div className="ops-row" key={row[0]}>
              <strong>{row[0]}</strong><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span><span>{row[4]}</span><button onClick={() => setDetail(row[0])}>查看</button>
            </div>
          ))}
        </div>
      </div>
      {detail && (
        <div className="modal-backdrop">
          <div className="form-modal">
            <div className="modal-head">
              <strong>{detail === '导出数据' ? '导出数据报表' : `${detail}质量趋势`}</strong>
              <button onClick={() => setDetail('')}>关闭</button>
            </div>
            <div className="diagnosis-grid">
              <Metric title="生成数" value="0" note="当前统计周期" />
              <Metric title="已生成" value="0" note="API文章" />
              <Metric title="接口异常" value="0" note="接口无正文" />
              <Metric title="处理动作" value={detail === '导出数据' ? '导出' : '复盘'} note={detail === '导出数据' ? '正式版生成Excel' : rows.find((row) => row[0] === detail)?.[4] ?? ''} />
            </div>
            <div className="modal-actions">
              <button className="primary-button" onClick={() => {
                notify(detail === '导出数据' ? '数据导出任务已确认。' : `${detail}质量趋势已确认。`)
                setDetail('')
              }}>完成</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function ModelConfig({ notify }: ActionProps) {
  const [configStatus, setConfigStatus] = useState<{
    qwen?: { configured: boolean; baseUrl?: string; model?: string }
    activeModel?: { configured: boolean; baseUrl?: string; model?: string; source?: string }
    keyword5118?: { configured: boolean; missing?: string[] }
    xiaoqingwa?: { installed?: boolean; configured: boolean; missing?: string[] }
    oss?: { configured: boolean }
  }>({})
  const [testing, setTesting] = useState('')
  const loadStatus = async () => {
    try {
      const status = await apiJson<typeof configStatus>('/api/config/status')
      setConfigStatus(status)
    } catch {
      notify('接口服务未启动，请先运行本机API服务。')
    }
  }
  useEffect(() => {
    void loadStatus()
  }, [])
  const testModel = async () => {
    setTesting('model')
    try {
      const result = await apiJson<{ ok: boolean; content?: string }>('/api/model/test', {})
      notify(result.content || '模型连接正常。')
    } catch (error) {
      notify(error instanceof Error ? error.message : '模型测试失败。')
    } finally {
      setTesting('')
    }
  }
  const testKeyword = async () => {
    setTesting('keyword')
    try {
      await apiJson('/api/keywords/expand', { coreKeyword: '西安GEO公司', recommendWord: '曝光率GEO' })
      notify('5118关键词接口已连通。')
    } catch (error) {
      notify(error instanceof Error ? error.message : '5118测试失败。')
    } finally {
      setTesting('')
    }
  }
  const testMedia = async () => {
    setTesting('media')
    try {
      await apiJson('/api/media/publish', { dryRun: true, title: '接口测试', body: '接口测试' })
      notify('小青蛙发布接口已连通。')
    } catch (error) {
      notify(error instanceof Error ? error.message : '小青蛙测试失败。')
    } finally {
      setTesting('')
    }
  }
  return (
    <section className="operation-page">
      <div className="operation-toolbar">
        <div>
          <strong>模型配置</strong>
          <span>这里查看真实接口是否接通。密钥只放服务器环境，不写进前端页面。</span>
        </div>
        <button className="ghost-button" onClick={loadStatus}>刷新状态</button>
      </div>
      <div className="model-layout">
        <div className="panel">
          <SectionTitle icon={Database} title="真实接口状态" desc="大模型负责生成，5118负责拓词，小青蛙负责新闻源媒体发布。" />
          <div className="connector-list">
            <div className="connector-row">
              <div>
                <strong>当前写作大模型</strong>
                <span>{configStatus.activeModel?.configured ? `已配置：${configStatus.activeModel.model}（${configStatus.activeModel.source || '模型接口'}）` : '未配置：优先填写MODEL_API_KEY、MODEL_BASE_URL、MODEL_NAME'}</span>
              </div>
              <em className={configStatus.activeModel?.configured ? 'ready' : 'warn'}>{configStatus.activeModel?.configured ? '可生成' : '待配置'}</em>
              <button onClick={testModel}>{testing === 'model' ? '测试中' : '测试模型'}</button>
            </div>
            <div className="connector-row">
              <div>
                <strong>5118关键词指数/拓展</strong>
                <span>{configStatus.keyword5118?.configured ? '已配置，可替换本地拓词规则' : `接口地址已确认，待补：${configStatus.keyword5118?.missing?.join('、') || '5118关键词指数KEY'}`}</span>
              </div>
              <em className={configStatus.keyword5118?.configured ? 'ready' : 'warn'}>{configStatus.keyword5118?.configured ? '可拓展' : '待KEY'}</em>
              <button onClick={testKeyword}>{testing === 'keyword' ? '测试中' : '测试5118'}</button>
            </div>
            <div className="connector-row">
              <div>
                <strong>小青蛙新闻源发布</strong>
                <span>
                  {configStatus.xiaoqingwa?.configured
                    ? '已配置，可创建媒体投喂任务'
                    : configStatus.xiaoqingwa?.installed
                      ? 'KEY、平台和余额已准备；还差发文接口地址后即可真实投喂'
                      : `待补：${configStatus.xiaoqingwa?.missing?.join('、') || '发布接口信息'}`}
                </span>
              </div>
              <em className={configStatus.xiaoqingwa?.configured ? 'ready' : 'warn'}>{configStatus.xiaoqingwa?.configured ? '可发布' : configStatus.xiaoqingwa?.installed ? '已安装' : '待配置'}</em>
              <button onClick={testMedia}>{testing === 'media' ? '测试中' : '测试发布'}</button>
            </div>
          </div>
        </div>
        <div className="panel form-panel">
          <SectionTitle icon={Settings} title="接口补齐项" desc="只显示会影响真实上线的剩余事项。" />
          <Field label="写作模型" value={configStatus.activeModel?.configured ? `当前使用：${configStatus.activeModel.model}` : '待配置MODEL_API_KEY、MODEL_BASE_URL、MODEL_NAME'} />
          <Field label="通义备用" value={configStatus.qwen?.configured ? `已完成：${configStatus.qwen.model}` : '未配置QWEN_API_KEY、QWEN_BASE_URL、QWEN_MODEL'} />
          <Field label="5118接口" value={configStatus.keyword5118?.configured ? '已完成，可真实拓展关键词库' : `待补：${configStatus.keyword5118?.missing?.join('、') || '5118关键词指数KEY'}`} />
          <Field label="小青蛙接口" value="KEY和平台可先安装；真实投喂还缺媒体列表、发文、状态回查接口地址" />
          <Field label="图片上传" value={configStatus.oss?.configured ? 'OSS已配置' : '1.0可先本地上传，正式服务器再接OSS'} />
        </div>
      </div>
    </section>
  )
}

function SettingsPage({ notify }: ActionProps) {
  const [savedAt, setSavedAt] = useState('尚未保存')
  return (
    <section className="operation-page">
      <div className="operation-toolbar">
        <div>
          <strong>系统设置</strong>
          <span>管理资料调用、接口和分发频控。</span>
        </div>
        <button className="primary-button" onClick={() => {
          setSavedAt('刚刚保存')
          notify('系统设置已保存。')
        }}>保存设置</button>
      </div>
      <div className="settings-layout">
        <div className="panel">
          <SectionTitle icon={ShieldCheck} title="资料调用规则" desc="当前只保留品牌资料、关键词和可信资料调用。" />
          <div className="rule-list">
            <div className="rule-item">
              <strong>品牌归属</strong>
              <p>生成文章只调用当前品牌项目的数据。</p>
            </div>
            <div className="rule-item">
              <strong>资料来源</strong>
              <p>核心词、蒸馏问题、关键词库、品牌资料和可信资料作为写作参考。</p>
            </div>
            <div className="rule-item">
              <strong>skill稿单写作</strong>
              <p>系统按文章类型、客户场景和项目资料组装稿单，再交给API逐篇生成。</p>
            </div>
          </div>
        </div>
        <div className="panel form-panel">
          <SectionTitle icon={Settings} title="当前写作模式" desc="旧审核和固定写作规则已关闭。" />
          <Field label="提示词版本" value="niuge-geo-skill-api-v2" />
          <Field label="文章结构" value="按skill稿单生成" />
          <Field label="标题生成" value="按核心词、行业和文章类型生成" />
          <Field label="入库方式" value="生成后进入成品文章库" />
          <div className="status-line">
            <span>保存状态</span>
            <strong>{savedAt}</strong>
          </div>
        </div>
      </div>
    </section>
  )
}

function ArticleTable({
  articleRows,
  compact = false,
  title = '近期成品稿',
  desc = '展示系统调用资料生成的文章。',
}: {
  articleRows: Article[]
  compact?: boolean
  title?: string
  desc?: string
}) {
  return (
    <div className="panel">
      <SectionTitle icon={Newspaper} title={title} desc={desc} />
      <div className="article-list">
        {articleRows.slice(0, compact ? 3 : articleRows.length).map((article) => (
          <article className="article-row" key={article.id}>
            <div>
              <strong>{article.title}</strong>
              <p>{article.angle} · {article.keyword} · {article.words}字</p>
            </div>
            <div className="article-score">
              <span>{article.words}</span>
              <em className={article.status === '生成异常' ? 'danger' : ''}>{article.status}</em>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function Inspector({ articleRows }: { articleRows: Article[] }) {
  const passedCount = articleRows.filter((article) => article.status === '已生成').length
  const failedCount = articleRows.filter((article) => article.status === '生成异常').length
  return (
    <>
      <div className="inspector-card live-card">
        <p className="eyebrow">当前品牌</p>
        <h3>曝光率GEO · 西安GEO公司</h3>
        <p>核心词锁定，关键词库按语义辅助，已生成文章{passedCount}篇。</p>
        <div className="live-score">
          <span>{passedCount}</span>
          <div>
            <strong>成品文章</strong>
            <p>接口异常 {failedCount} 篇</p>
          </div>
        </div>
      </div>

      <div className="inspector-card">
        <SectionTitle icon={ListChecks} title="写作资料链" desc="这些在生成前就参与稿单。" />
        <div className="mini-list">
          <span>核心词优先</span>
          <span>蒸馏问题定意图</span>
          <span>关键词库补语境</span>
          <span>标题问题化</span>
          <span>品牌资产按需调用</span>
          <span>权威引证转理由</span>
        </div>
      </div>

      <div className="inspector-card">
        <SectionTitle icon={ShieldCheck} title="成品出口" desc="生成完成后直接进入成品库。" />
        <div className="check-stack">
          {['API单篇生成', '无正文才标异常', '成品库查看下载', '分发队列预留'].map((title) => (
            <div key={title}>
              <CheckCircle2 size={15} />
              <span>{title}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function RuleList({ max }: { max?: number }) {
  return (
    <div className="rule-list">
      {auditRules.slice(0, max).map(([title, desc]) => (
        <div className="rule-item" key={title}>
          <CheckCircle2 size={17} />
          <div>
            <strong>{title}</strong>
            <p>{desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function Metric({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="metric-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder = '',
}: {
  label: string
  value: string
  onChange?: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        readOnly={!onChange}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange?.(event.target.value)}
      />
    </label>
  )
}

function EditableField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)} />
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  const safeOptions = options.length ? options : ['暂无可选项']
  const safeValue = safeOptions.includes(value) ? value : safeOptions[0]
  return (
    <label className="field">
      <span>{label}</span>
      <select value={safeValue} onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}>
        {safeOptions.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

function ReportRow({ name, words, status, score }: { name: string; words: string; status: string; score: string }) {
  return (
    <div className="panel report-row">
      <div>
        <strong>{name}</strong>
        <p>{words}</p>
      </div>
      <span className="pill">{status}</span>
      <em>{score}分</em>
    </div>
  )
}

function SectionTitle({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="section-title">
      <Icon size={18} />
      <div>
        <h2>{title}</h2>
        <p>{desc}</p>
      </div>
    </div>
  )
}

function ProjectApp() {
  const [scope, setScope] = useState(identityKey)
  useEffect(() => {
    const changed = () => setScope(identityKey())
    window.addEventListener('geo:identity-changed', changed)
    return () => window.removeEventListener('geo:identity-changed', changed)
  }, [])
  return <App key={scope} />
}

const rootElement = document.getElementById('root')!
const windowWithRoot = window as typeof window & { __geoContentRoot?: ReturnType<typeof ReactDOM.createRoot> }
windowWithRoot.__geoContentRoot ??= ReactDOM.createRoot(rootElement)
windowWithRoot.__geoContentRoot.render(
  <StrictMode>
    <ProjectApp />
  </StrictMode>,
)

