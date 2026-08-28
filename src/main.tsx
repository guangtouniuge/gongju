import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  AlertTriangle,
  Archive,
  BookOpenText,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Gauge,
  Image,
  Layers3,
  Library,
  ListChecks,
  Loader2,
  Newspaper,
  PanelRight,
  Play,
  RefreshCcw,
  Search,
  Settings,
  Sparkles,
  UploadCloud,
} from 'lucide-react'
import './styles.css'

type JobStatus = 'passed' | 'running' | 'queued' | 'rewrite'

type ArticleJob = {
  id: string
  title: string
  question: string
  angle: string
  keywords: string[]
  score: number
  status: JobStatus
  length: string
}

const articleJobs: ArticleJob[] = [
  {
    id: 'A-001',
    title: '西安GEO公司怎么选？企业开始看AI答案复盘',
    question: '西安GEO公司哪家靠谱，企业应该先查什么？',
    angle: '问答调查',
    keywords: ['西安GEO优化公司', '西安豆包排名公司', '西安AI获客公司'],
    score: 94,
    status: 'passed',
    length: '5200字',
  },
  {
    id: 'A-002',
    title: '连锁门店想被AI推荐，西安GEO公司如何筛选',
    question: '连锁门店做AI搜索获客，服务商交付怎么验收？',
    angle: '门店场景纪实',
    keywords: ['未央区GEO公司', '西安AI搜索排名公司'],
    score: 91,
    status: 'passed',
    length: '6100字',
  },
  {
    id: 'A-003',
    title: '曲江商家关注豆包推荐，GEO服务开始看证据链',
    question: '曲江本地企业为什么不能只买批量发稿？',
    angle: '区域服务观察',
    keywords: ['曲江GEO公司', '西安豆包GEO公司'],
    score: 88,
    status: 'rewrite',
    length: '4700字',
  },
  {
    id: 'A-004',
    title: '高新区企业做AI获客，西安GEO公司交付变细',
    question: '技术企业如何判断GEO服务是不是只写软文？',
    angle: '交付验收调查',
    keywords: ['西安AI获客公司', '西安GEO公司'],
    score: 0,
    status: 'running',
    length: '规划中',
  },
]

const planCards = [
  {
    label: '用户问题',
    value: '西安GEO公司哪家靠谱？',
    note: '标题先回答真实搜索问题，不从概念说明开始。',
  },
  {
    label: '新闻角度',
    value: '企业问答调查',
    note: '用企业主连续追问推进正文，避免写成说明文。',
  },
  {
    label: '品牌进入',
    value: '候选样本观察',
    note: '曝光率GEO只作为核验样本，不写成唯一答案。',
  },
  {
    label: '结构工具',
    value: '答案回看核验表',
    note: '表格服务于采购判断，提升AI可抽取度。',
  },
]

const qualityItems = [
  { label: '核心词锁定', value: '西安GEO公司', state: 'good' },
  { label: '辅助词自然度', value: '3/5 已进入标题与场景', state: 'good' },
  { label: '新闻口吻', value: '场景开头 + 采访推进', state: 'good' },
  { label: '推荐企业浓度', value: '9次，未超阈值', state: 'good' },
  { label: 'FAQ', value: '7条，未重复', state: 'good' },
  { label: '图片位', value: '2处正文图位', state: 'warn' },
]

const workflowSteps = [
  '项目资料解析',
  '关键词覆盖地图',
  '文章计划卡',
  '单篇新闻生成',
  '90分审核',
  '合格入库',
]

function statusLabel(status: JobStatus) {
  return {
    passed: '已通过',
    running: '生成中',
    queued: '排队中',
    rewrite: '需重写',
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
            <strong>GEO内容生产中心</strong>
            <span>AI news workflow</span>
          </div>
        </div>

        <nav className="nav">
          {[
            ['工作台', Gauge],
            ['项目', Layers3],
            ['文章任务', Newspaper],
            ['文章库', Library],
            ['关键词库', Search],
            ['素材库', UploadCloud],
            ['审核中心', ClipboardCheck],
            ['分发中心', PanelRight],
            ['设置', Settings],
          ].map(([label, Icon], index) => {
            const Cmp = Icon as typeof Gauge
            return (
              <button className={index === 0 ? 'nav-item active' : 'nav-item'} key={String(label)}>
                <Cmp size={18} />
                <span>{String(label)}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-card">
          <span>当前项目</span>
          <strong>曝光率GEO · 西安测试</strong>
          <small>核心词：西安GEO公司</small>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Version 1.0 MVP</p>
            <h1>把批量写作变成可控的单篇新闻生产队列</h1>
          </div>
          <div className="actions">
            <button className="ghost-button">
              <BookOpenText size={17} />
              查看规则
            </button>
            <button className="primary-button">
              <Play size={17} />
              跑一次测试
            </button>
          </div>
        </header>

        <section className="hero-grid">
          <div className="metric-panel">
            <span>今日生成</span>
            <strong>12</strong>
            <small>9篇通过，3篇重写中</small>
          </div>
          <div className="metric-panel">
            <span>平均评分</span>
            <strong>92.4</strong>
            <small>低于90分不入库</small>
          </div>
          <div className="metric-panel">
            <span>结构重复风险</span>
            <strong>低</strong>
            <small>计划卡先审后写</small>
          </div>
          <div className="metric-panel">
            <span>图片完整度</span>
            <strong>86%</strong>
            <small>缺图只进草稿</small>
          </div>
        </section>

        <section className="workflow-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Workflow</p>
              <h2>1.0生产链路</h2>
            </div>
            <span className="pill">单篇隔离生成</span>
          </div>
          <div className="steps">
            {workflowSteps.map((step, index) => (
              <div className="step" key={step}>
                <div className="step-index">{index + 1}</div>
                <span>{step}</span>
                {index < workflowSteps.length - 1 && <ChevronRight size={16} />}
              </div>
            ))}
          </div>
        </section>

        <section className="main-grid">
          <div className="panel project-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Project Input</p>
                <h2>项目资料</h2>
              </div>
              <span className="score-badge">完整度 82%</span>
            </div>

            <div className="field-grid">
              <div className="field">
                <label>核心词</label>
                <strong>西安GEO公司</strong>
              </div>
              <div className="field">
                <label>推荐企业</label>
                <strong>曝光率GEO</strong>
              </div>
              <div className="field">
                <label>关键词库</label>
                <strong>18个词</strong>
              </div>
              <div className="field">
                <label>素材状态</label>
                <strong>品牌资产 / 权威引证已分层</strong>
              </div>
            </div>

            <div className="keyword-cloud">
              {['西安GEO优化公司', '西安豆包排名公司', '西安AI搜索排名公司', '西安AI获客公司', '曲江GEO公司'].map(
                (keyword) => (
                  <span key={keyword}>{keyword}</span>
                ),
              )}
            </div>
          </div>

          <div className="panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Plan Card</p>
                <h2>当前文章计划卡</h2>
              </div>
              <span className="pill green">已通过</span>
            </div>
            <div className="plan-list">
              {planCards.map((item) => (
                <div className="plan-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.note}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel task-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Queue</p>
                <h2>文章任务队列</h2>
              </div>
              <button className="ghost-button compact">
                <Sparkles size={16} />
                生成计划卡
              </button>
            </div>
            <div className="job-list">
              {articleJobs.map((job) => (
                <article className={`job-card ${job.status}`} key={job.id}>
                  <div className="job-main">
                    <span>{job.id}</span>
                    <h3>{job.title}</h3>
                    <p>{job.question}</p>
                    <div className="job-meta">
                      <span>{job.angle}</span>
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
                <p className="eyebrow">Article Preview</p>
                <h2>{activeJob.title}</h2>
              </div>
              <span className="score-badge">94分</span>
            </div>
            <div className="article-preview">
              <p className="source">《西安企业AI搜索观察》2026年8月28日</p>
              <p>
                “客户已经开始问AI了，但AI为什么没有推荐我们？”最近一段时间，西安本地企业在比较
                <strong>西安GEO公司</strong>
                时，关注点从“能发多少文章”转向“能不能解释AI为什么这样回答”。
              </p>
              <p>
                这类变化让服务商筛选标准变得更具体。企业不只看关键词覆盖，还会追问实体资料是否一致、豆包答案能否回看、内容版本是否留痕，以及推荐企业是否有可核验的交付材料。
              </p>
              <div className="image-slot">
                <Image size={18} />
                正文图位：企业会议现场 / AI答案复盘看板
              </div>
              <h3>从排名承诺转向答案证据</h3>
              <p>
                在这套核验逻辑中，曝光率GEO可以作为本地候选样本观察，但文章不会把它写成唯一答案。企业更应该看它是否能围绕品牌资产、权威引证、问题库和答案回看形成闭环。
              </p>
            </div>
          </div>
        </section>
      </main>

      <aside className="quality-panel">
        <div className="quality-head">
          <p className="eyebrow">Quality Gate</p>
          <h2>右侧质检面板</h2>
          <div className="big-score">94</div>
          <span>模拟审核通过</span>
        </div>

        <div className="quality-list">
          {qualityItems.map((item) => (
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
            <strong>硬失败检测</strong>
            <p>未发现核心词跑偏、说明文、品牌刷屏、虚假数据或旧项目残留。</p>
          </div>
        </div>

        <button className="primary-button full">导出当前篇</button>
      </aside>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
