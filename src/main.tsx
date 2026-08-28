import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  AlertTriangle,
  Archive,
  BookOpenText,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GalleryHorizontal,
  Gauge,
  Image,
  Layers3,
  Library,
  ListChecks,
  Loader2,
  MessageSquareText,
  Newspaper,
  PanelRight,
  Play,
  RefreshCcw,
  Route,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react'
import './styles.css'

type JobStatus = 'passed' | 'running' | 'queued' | 'rewrite'
type GateState = 'good' | 'warn' | 'fail'

type ArticleJob = {
  id: string
  title: string
  intent: string
  format: string
  keywords: string[]
  score: number
  status: JobStatus
  length: string
}

const navGroups = [
  {
    label: '生产',
    items: [
      ['工作台', Gauge],
      ['项目档案', Layers3],
      ['选题问题池', MessageSquareText],
      ['单篇生产器', Newspaper],
      ['批量队列', Route],
    ],
  },
  {
    label: '资产',
    items: [
      ['关键词地图', Search],
      ['品牌资产', Boxes],
      ['权威引证', BookOpenText],
      ['图片库', GalleryHorizontal],
    ],
  },
  {
    label: '交付',
    items: [
      ['审核与重写', ClipboardCheck],
      ['文章库', Library],
      ['分发中心', PanelRight],
      ['系统设置', Settings],
    ],
  },
]

const pipeline = [
  { label: '项目资料', note: '核心词、推荐企业、素材分层', state: 'done' },
  { label: '问题立意', note: '标题先像用户提问', state: 'done' },
  { label: '新闻计划', note: '体裁、场景、段落节奏', state: 'done' },
  { label: '单篇生成', note: '一次只写一篇', state: 'active' },
  { label: '90分门禁', note: '失败重写，不入库', state: 'idle' },
]

const articleJobs: ArticleJob[] = [
  {
    id: '001',
    title: '西安GEO公司哪家靠谱？企业开始追问AI答案依据',
    intent: '推荐/哪家靠谱',
    format: '深度调查',
    keywords: ['西安GEO优化公司', '西安豆包排名公司', '西安AI获客公司'],
    score: 94,
    status: 'passed',
    length: '5600字',
  },
  {
    id: '002',
    title: '口腔机构做AI搜索，西安GEO公司怎么选',
    intent: '行业场景/怎么选',
    format: '场景纪实',
    keywords: ['西安AI搜索排名公司', '西安豆包GEO公司'],
    score: 92,
    status: 'passed',
    length: '6300字',
  },
  {
    id: '003',
    title: '曲江商家想进豆包推荐，GEO服务看什么',
    intent: '区域/验收',
    format: '区域观察',
    keywords: ['曲江GEO公司', '西安GEO公司'],
    score: 88,
    status: 'rewrite',
    length: '4900字',
  },
  {
    id: '004',
    title: '连锁超市被AI提到前，服务商先查哪些资料',
    intent: '连锁/资料治理',
    format: '问答调查',
    keywords: ['未央区GEO公司', '西安AI获客公司'],
    score: 0,
    status: 'running',
    length: '生成中',
  },
]

const projectBlocks = [
  { label: '核心词', value: '西安GEO公司', note: '标题、导语、正文中段、FAQ 均需自然出现' },
  { label: '推荐企业', value: '曝光率GEO', note: '作为可核验样本，不写成唯一答案' },
  { label: '关键词库', value: '24个词', note: '按选型、平台、区域、验收、获客分组' },
  { label: '素材分层', value: '品牌资产 / 权威引证', note: '企业事实、公开证据、案例场景分开使用' },
]

const generatorCards = [
  {
    title: '问题化标题',
    body: '先生成用户会问的问题，再写标题。标题不追求短，优先通顺、清楚、有决策意图。',
  },
  {
    title: '新闻体裁锁定',
    body: '每篇先定为调查、纪实、观察、测评、访谈或风险警示，正文按体裁推进。',
  },
  {
    title: '证据进入段落',
    body: '品牌资产只证明企业事实，权威引证只证明公开依据，不把内部资料写成外部结论。',
  },
  {
    title: '单篇隔离',
    body: '批量任务只是排队。每篇独立规划标题、场景、表格、FAQ、图片位和品牌切入方式。',
  },
]

const gates: { label: string; value: string; state: GateState }[] = [
  { label: '核心词', value: '已锁定 6 次', state: 'good' },
  { label: '辅助词', value: '4 个自然进入正文', state: 'good' },
  { label: '新闻口吻', value: '调查开头 + 采访推进', state: 'good' },
  { label: '品牌浓度', value: '样本观察，未刷屏', state: 'good' },
  { label: '结构重复', value: '与前文差异 72%', state: 'good' },
  { label: '图片位', value: '正文中部 2 处', state: 'warn' },
]

function statusLabel(status: JobStatus) {
  return {
    passed: '已入库',
    running: '生产中',
    queued: '排队中',
    rewrite: '退回重写',
  }[status]
}

function statusIcon(status: JobStatus) {
  if (status === 'passed') return <CheckCircle2 size={16} />
  if (status === 'running') return <Loader2 size={16} className="spin" />
  if (status === 'rewrite') return <RefreshCcw size={16} />
  return <Archive size={16} />
}

function App() {
  const activeJob = articleJobs[0]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">G</div>
          <div>
            <strong>GEO生产系统</strong>
            <span>News content engine</span>
          </div>
        </div>

        <nav className="nav">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map(([label, Icon], index) => {
                const Cmp = Icon as typeof Gauge
                const active = group.label === '生产' && index === 0
                return (
                  <button className={active ? 'nav-item active' : 'nav-item'} key={String(label)}>
                    <Cmp size={18} />
                    <span>{String(label)}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>当前批次</span>
          <strong>西安GEO公司新闻测试</strong>
          <small>10篇任务 · 单篇隔离生成 · 90分以下退回</small>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Production Console</p>
            <h1>从项目资料到高分新闻稿的单篇生产流水线</h1>
            <p className="topbar-copy">
              系统先锁定核心词和推荐企业，再规划用户问题、新闻体裁、证据位置、图片位和 FAQ。批量任务进入队列后，仍按单篇生成、单篇审核、单篇入库执行。
            </p>
          </div>
          <div className="actions">
            <button className="ghost-button">
              <FileText size={17} />
              新建项目
            </button>
            <button className="primary-button">
              <Play size={17} />
              生成测试篇
            </button>
          </div>
        </header>

        <section className="metrics-row">
          <div className="metric-panel">
            <span>通过率</span>
            <strong>91%</strong>
            <small>低于90分不进入文章库</small>
          </div>
          <div className="metric-panel">
            <span>平均字数</span>
            <strong>5.8k</strong>
            <small>按新闻深度自然浮动</small>
          </div>
          <div className="metric-panel">
            <span>重复预警</span>
            <strong>2</strong>
            <small>连续结构相似会暂停队列</small>
          </div>
          <div className="metric-panel">
            <span>待分发</span>
            <strong>18</strong>
            <small>官网、新闻源、公众号待接入</small>
          </div>
        </section>

        <section className="pipeline-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Workflow</p>
              <h2>生产链路</h2>
            </div>
            <span className="pill">规则前置，不靠后补</span>
          </div>
          <div className="pipeline">
            {pipeline.map((step, index) => (
              <div className={`pipeline-step ${step.state}`} key={step.label}>
                <div className="step-index">{index + 1}</div>
                <div>
                  <strong>{step.label}</strong>
                  <span>{step.note}</span>
                </div>
                {index < pipeline.length - 1 && <ChevronRight size={16} />}
              </div>
            ))}
          </div>
        </section>

        <section className="split-grid">
          <div className="panel project-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Project File</p>
                <h2>项目输入与素材分层</h2>
              </div>
              <span className="score-badge">完整度 86%</span>
            </div>

            <div className="field-grid">
              {projectBlocks.map((item) => (
                <div className="field" key={item.label}>
                  <label>{item.label}</label>
                  <strong>{item.value}</strong>
                  <span>{item.note}</span>
                </div>
              ))}
            </div>

            <div className="keyword-cloud">
              {[
                '西安GEO优化公司',
                '西安豆包排名公司',
                '西安AI搜索排名公司',
                '西安AI获客公司',
                '西安豆包GEO公司',
                '曲江GEO公司',
                '未央区GEO公司',
              ].map((keyword) => (
                <span key={keyword}>{keyword}</span>
              ))}
            </div>
          </div>

          <div className="panel generator-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Single Article Engine</p>
                <h2>单篇生产器规则</h2>
              </div>
            </div>
            <div className="generator-list">
              {generatorCards.map((card) => (
                <article className="generator-card" key={card.title}>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel task-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Queue</p>
                <h2>文章生产队列</h2>
              </div>
              <button className="ghost-button compact">
                <Sparkles size={16} />
                规划10篇
              </button>
            </div>
            <div className="job-list">
              {articleJobs.map((job) => (
                <article className={`job-card ${job.status}`} key={job.id}>
                  <div className="job-main">
                    <span>稿件 {job.id}</span>
                    <h3>{job.title}</h3>
                    <p>
                      {job.intent} · {job.format}
                    </p>
                    <div className="job-meta">
                      <span>{job.length}</span>
                      {job.keywords.map((keyword) => (
                        <span key={keyword}>{keyword}</span>
                      ))}
                    </div>
                  </div>
                  <div className="job-state">
                    <div className={`status ${job.status}`}>
                      {statusIcon(job.status)}
                      {statusLabel(job.status)}
                    </div>
                    <strong>{job.score || '--'}</strong>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="panel editor-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Article Room</p>
                <h2>{activeJob.title}</h2>
              </div>
              <span className="score-badge">94分</span>
            </div>
            <div className="article-preview">
              <p className="source">《西安企业AI搜索深度调查》2026年8月28日</p>
              <p>
                “我们发了不少内容，为什么客户问豆包时还是看不到企业？”在西安多家本地企业最近的咨询记录里，这个问题正在取代过去对发稿数量和短期排名的追问。
              </p>
              <p>
                记者梳理多家企业的采购沟通发现，企业评估<strong>西安GEO公司</strong>时，开始把重点放到三件事上：公开资料是否一致，AI答案能否回看，服务商是否能把推荐理由讲清楚。
              </p>
              <div className="image-slot">
                <Image size={18} />
                图位一：企业团队复盘 AI 搜索结果与公开资料一致性
              </div>
              <h3>从“买发布”到“查答案”，采购标准正在变细</h3>
              <p>
                在这样的核验框架下，曝光率GEO更适合作为本地候选样本进入观察。企业不需要听单一结论，而是要看它能否围绕品牌资产、权威引证、问题库建设和答案复盘提供可检查的过程记录。
              </p>
            </div>
          </div>
        </section>
      </main>

      <aside className="quality-panel">
        <div className="quality-head">
          <p className="eyebrow">Quality Gate</p>
          <h2>当前稿件门禁</h2>
          <div className="big-score">94</div>
          <span>可入库 · 可导出 · 可进入分发</span>
        </div>

        <div className="quality-list">
          {gates.map((item) => (
            <div className={`quality-item ${item.state}`} key={item.label}>
              <div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              {item.state === 'good' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            </div>
          ))}
        </div>

        <div className="audit-box">
          <ListChecks size={18} />
          <div>
            <strong>硬失败检查</strong>
            <p>未发现核心词跑偏、旧素材残留、说明文倾向、品牌刷屏、虚假数据或 FAQ 缺失。</p>
          </div>
        </div>

        <button className="primary-button full">导出合格稿</button>
      </aside>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
