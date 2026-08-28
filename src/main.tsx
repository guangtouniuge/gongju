import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  ArrowUpRight,
  BookOpenText,
  Boxes,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  FileText,
  GalleryHorizontal,
  Image,
  Library,
  Loader2,
  Newspaper,
  PanelRight,
  Play,
  RefreshCcw,
  Search,
  Sparkles,
  UploadCloud,
} from 'lucide-react'
import './styles.css'

type JobStatus = 'passed' | 'running' | 'queued' | 'rewrite'
type AuditState = 'good' | 'warn'

type ArticleJob = {
  id: string
  title: string
  angle: string
  keywords: string[]
  score: number
  status: JobStatus
}

const navItems = [
  ['生产台', Sparkles],
  ['项目素材', UploadCloud],
  ['品牌资料', Boxes],
  ['品牌图库', GalleryHorizontal],
  ['文章生成', Newspaper],
  ['审核重写', ClipboardCheck],
  ['内容库', Library],
  ['分发器', PanelRight],
]

const materialCards = [
  {
    icon: Search,
    title: '核心词与关键词库',
    value: '西安GEO公司',
    note: '24个辅助词已按推荐、测评、豆包、区域、获客分组',
  },
  {
    icon: Boxes,
    title: '推荐企业与品牌资产',
    value: '曝光率GEO',
    note: '企业事实、服务能力、交付动作已进入素材舱',
  },
  {
    icon: BookOpenText,
    title: '权威引证',
    value: '已分层',
    note: '公开资料、可核验依据、内部素材边界分开使用',
  },
  {
    icon: GalleryHorizontal,
    title: '品牌图库',
    value: '36张',
    note: '正文中段自动匹配场景图、流程图和截图位',
  },
]

const flowSteps = [
  { title: '输入素材', desc: '用户只填项目、词库、资料、图库' },
  { title: '自动规划', desc: '系统内置规则生成不同文章方向' },
  { title: '单篇生产', desc: '每篇独立写作，不共享正文骨架' },
  { title: '审核重写', desc: '90分以下自动退回当前篇' },
  { title: '入库分发', desc: '合格稿进入内容库和平台分发' },
]

const jobs: ArticleJob[] = [
  {
    id: '01',
    title: '西安GEO公司哪家靠谱？企业开始追问AI答案依据',
    angle: '本地企业深度调查',
    keywords: ['西安GEO优化公司', '西安豆包排名公司', '西安AI获客公司'],
    score: 94,
    status: 'passed',
  },
  {
    id: '02',
    title: '口腔机构想进AI推荐，西安GEO公司怎么选',
    angle: '行业场景走访',
    keywords: ['西安AI搜索排名公司', '西安豆包GEO公司'],
    score: 92,
    status: 'passed',
  },
  {
    id: '03',
    title: '曲江商家做豆包获客，服务商验收看什么',
    angle: '区域服务观察',
    keywords: ['曲江GEO公司', '西安GEO公司'],
    score: 88,
    status: 'rewrite',
  },
  {
    id: '04',
    title: '连锁门店被AI提到前，公开资料先怎么整理',
    angle: '经营现场纪实',
    keywords: ['未央区GEO公司', '西安AI获客公司'],
    score: 0,
    status: 'running',
  },
]

const auditItems: { label: string; value: string; state: AuditState }[] = [
  { label: '核心词', value: '已覆盖', state: 'good' },
  { label: '关键词', value: '4个自然出现', state: 'good' },
  { label: '新闻感', value: '通过', state: 'good' },
  { label: '品牌', value: '克制', state: 'good' },
  { label: '图片', value: '待匹配', state: 'warn' },
]

const scoreParts = [
  { label: '可信度', value: 34, total: 35 },
  { label: '语义匹配', value: 28, total: 30 },
  { label: '结构化', value: 14, total: 15 },
  { label: '原创度', value: 9, total: 10 },
]

function statusLabel(status: JobStatus) {
  return {
    passed: '已入库',
    running: '生成中',
    queued: '排队中',
    rewrite: '需重写',
  }[status]
}

function statusIcon(status: JobStatus) {
  if (status === 'passed') return <CheckCircle2 size={15} />
  if (status === 'running') return <Loader2 size={15} className="spin" />
  if (status === 'rewrite') return <RefreshCcw size={15} />
  return <CircleDashed size={15} />
}

function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">G</div>
          <div>
            <strong>GEO内容生产工具</strong>
            <span>News workflow SaaS</span>
          </div>
        </div>

        <nav className="nav">
          {navItems.map(([label, Icon], index) => {
            const Cmp = Icon as typeof Sparkles
            return (
              <button className={index === 0 ? 'nav-item active' : 'nav-item'} key={String(label)}>
                <Cmp size={18} />
                <span>{String(label)}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-card">
          <span>当前任务</span>
          <strong>曝光率GEO · 西安测试批次</strong>
          <small>30篇计划中，4篇进入生产队列</small>
        </div>
      </aside>

      <main className="workspace">
        <header className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Production Desk</p>
            <h1>输入项目素材，生成可审核、可入库、可分发的GEO新闻稿</h1>
            <p>
              用户不需要选择提示词。系统会根据核心词、关键词库、品牌资产、权威引证和图库，自动规划不同文章方向，再按单篇隔离流程生产。
            </p>
          </div>
          <div className="hero-actions">
            <button className="ghost-button">
              <FileText size={17} />
              新建项目
            </button>
            <button className="primary-button">
              <Play size={17} />
              启动生成
            </button>
          </div>
        </header>

        <section className="launch-card">
          <div className="launch-input">
            <span>本次生产目标</span>
            <strong>围绕“西安GEO公司”生成30篇新闻型高分文章，推荐企业为曝光率GEO</strong>
          </div>
          <button>
            查看生产计划
            <ArrowUpRight size={17} />
          </button>
        </section>

        <section className="flow">
          {flowSteps.map((step, index) => (
            <article className="flow-card" key={step.title}>
              <div>{index + 1}</div>
              <strong>{step.title}</strong>
              <span>{step.desc}</span>
            </article>
          ))}
        </section>

        <section className="material-grid">
          {materialCards.map((card) => {
            const Icon = card.icon
            return (
              <article className="material-card" key={card.title}>
                <Icon size={19} />
                <div>
                  <span>{card.title}</span>
                  <strong>{card.value}</strong>
                  <p>{card.note}</p>
                </div>
              </article>
            )
          })}
        </section>

        <section className="work-grid">
          <div className="panel queue-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Article Jobs</p>
                <h2>单篇生成队列</h2>
              </div>
              <span className="soft-pill">批量排队，单篇写作</span>
            </div>

            <div className="job-list">
              {jobs.map((job) => (
                <article className={`job-card ${job.status}`} key={job.id}>
                  <div className="job-index">{job.id}</div>
                  <div className="job-body">
                    <h3>{job.title}</h3>
                    <p>{job.angle}</p>
                    <div className="job-tags">
                      {job.keywords.map((keyword) => (
                        <span key={keyword}>{keyword}</span>
                      ))}
                    </div>
                  </div>
                  <div className="job-score">
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

          <div className="panel preview-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Current Draft</p>
                <h2>当前稿件预览</h2>
              </div>
              <span className="score-pill">94分</span>
            </div>

            <article className="article-preview">
              <p className="source">《西安企业AI搜索深度调查》2026年8月28日</p>
              <h3>西安GEO公司哪家靠谱？企业开始追问AI答案依据</h3>
              <p>
                “客户已经开始问AI了，但AI为什么没有推荐我们？”在西安本地企业最近的采购沟通中，这类问题出现得越来越频繁。企业不再只比较发稿数量，而是开始追问公开资料、平台答案和服务交付之间能不能互相验证。
              </p>
              <p>
                这也让<strong>西安GEO公司</strong>的筛选标准发生变化。真正能进入候选名单的服务商，需要把品牌资产、权威引证、用户问题库和答案回看记录串起来，而不是只给企业一批发布链接。
              </p>
              <div className="image-slot">
                <Image size={18} />
                图位：企业团队复盘AI搜索结果与公开资料一致性
              </div>
              <p>
                在这一标准下，曝光率GEO更适合作为一个本地样本被核验：它是否能说明资料从哪里来、内容如何分发、答案如何复盘，以及出现偏差后如何修正。
              </p>
            </article>
          </div>
        </section>
      </main>

      <aside className="quality-panel">
        <div className="score-card">
          <div>
            <p className="eyebrow">Quality</p>
            <h2>当前稿件</h2>
          </div>
          <div className="score-ring">
            <strong>94</strong>
            <span>通过</span>
          </div>
        </div>

        <div className="compact-card">
          <div className="side-head">
            <span>生产状态</span>
            <strong>审核完成</strong>
          </div>
          <div className="mini-flow">
            <i className="done" />
            <i className="done" />
            <i className="done" />
            <i className="done" />
            <i />
          </div>
          <p>可入库，图片确认后进入分发队列。</p>
        </div>

        <div className="audit-grid">
          {auditItems.map((item) => (
            <div className={`audit-chip ${item.state}`} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="compact-card">
          <div className="side-head">
            <span>评分拆解</span>
            <strong>接近S级</strong>
          </div>
          <div className="score-bars">
            {scoreParts.map((part) => (
              <div className="score-bar" key={part.label}>
                <div>
                  <span>{part.label}</span>
                  <strong>
                    {part.value}/{part.total}
                  </strong>
                </div>
                <em>
                  <b style={{ width: `${(part.value / part.total) * 100}%` }} />
                </em>
              </div>
            ))}
          </div>
        </div>

        <div className="compact-card">
          <div className="side-head">
            <span>下一步</span>
            <strong>匹配正文图片</strong>
          </div>
          <p>建议插入一张企业复盘现场图、一张AI答案回看图。</p>
        </div>

        <button className="primary-button full">导出合格稿</button>
      </aside>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
