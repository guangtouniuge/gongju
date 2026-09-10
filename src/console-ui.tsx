import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'

export type ConsoleKind = 'platform' | 'agency' | 'project'
export const consoleNames = { platform: '总后台', agency: '代理后台', project: '项目后台' }

type AccountUser = {
  id: string
  username: string
  displayName: string
  role: 'super_admin' | 'agent' | 'project_admin' | 'project_operator'
  status: 'pending' | 'active' | 'disabled'
  workspaceId: string
  agentId?: string
  projectId?: string
  projectName?: string
}

const roleLabels: Record<AccountUser['role'], string> = {
  super_admin: '总后台管理员',
  agent: '代理账号',
  project_admin: '项目管理员',
  project_operator: '项目操作员',
}

const statusLabels: Record<AccountUser['status'], string> = {
  pending: '待审核',
  active: '启用',
  disabled: '停用',
}

async function accountRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '请求失败')
  return data
}

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <div className="operation-toolbar"><div><strong>{title}</strong><span>{description}</span></div><div className="toolbar-actions">{actions}</div></div>
}

export function EmptyState({ title = '暂无记录', description, action }: { title?: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><strong>{title}</strong><span>{description}</span>{action}</div>
}

export function Modal({ title, onClose, children, actions }: { title: string; onClose: () => void; children: ReactNode; actions: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  return <dialog ref={dialog} className="form-modal console-dialog" onCancel={onClose} aria-label={title}>
    <div className="modal-head"><strong>{title}</strong><button onClick={onClose} aria-label="关闭弹窗">关闭</button></div>
    {children}<div className="modal-actions">{actions}</div>
  </dialog>
}

export function BatchBar({ count, onClear, children }: { count: number; onClear: () => void; children: ReactNode }) {
  if (!count) return null
  return <div className="batch-bar" role="status"><strong>已选 {count} 项</strong><button className="ghost-button" onClick={onClear}>取消选择</button><div className="toolbar-actions">{children}</div></div>
}

function AccountDirectory({ mode }: { mode: 'agents' | 'projects' }) {
  const [me, setMe] = useState<AccountUser | null>(null)
  const [rows, setRows] = useState<AccountUser[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [draftOpen, setDraftOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const isAgents = mode === 'agents'
  const load = async () => {
    const [self, users] = await Promise.all([
      accountRequest<{ user: AccountUser }>('/api/auth/me'),
      accountRequest<{ users: AccountUser[] }>('/api/admin/users'),
    ])
    setMe(self.user)
    setRows(users.users)
  }
  useEffect(() => { void load().catch(error => setMessage(error instanceof Error ? error.message : '账号加载失败')) }, [])
  const visible = rows
    .filter(row => isAgents ? row.role === 'agent' : ['project_admin', 'project_operator'].includes(row.role))
    .filter(row => !query.trim() || `${row.username}${row.displayName}${row.projectName || ''}`.includes(query.trim()))
  const title = isAgents ? '代理管理' : '项目账户'
  const description = isAgents
    ? '总后台创建和停用代理账号；代理登录后进入代理后台管理自己的项目账户。'
    : '代理创建客户项目管理员和操作员；项目账号登录后进入独立项目后台。'
  const createRole = isAgents ? 'agent' : 'project_admin'
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setMessage('')
    try { await action() } catch (error) { setMessage(error instanceof Error ? error.message : '操作失败') } finally { setBusy(false) }
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    void run(async () => {
      await accountRequest('/api/admin/users', { ...data, role: isAgents ? 'agent' : data.role || createRole })
      await load()
      setDraftOpen(false)
      setMessage(isAgents ? '代理账号已创建' : '项目账号已创建')
    })
  }
  const toggleStatus = (row: AccountUser) => run(async () => {
    await accountRequest('/api/admin/users/update', { id: row.id, status: row.status === 'active' ? 'disabled' : 'active' })
    await load()
  })
  return <section className="operation-page">
    <PageHeader title={title} description={description} actions={<button className="primary-button" onClick={() => setDraftOpen(true)}>{isAgents ? '添加代理账号' : '添加项目账号'}</button>} />
    <div className="panel">
      <div className="list-toolbar"><input className="search-input" aria-label={`搜索${title}`} placeholder="搜索账号、名称或项目" value={query} onChange={event => { setQuery(event.target.value); setSelected([]) }} /><span>共 {visible.length} 条</span></div>
      <BatchBar count={selected.length} onClear={() => setSelected([])}><button className="danger-button" disabled={busy} onClick={() => void run(async () => { await Promise.all(selected.map(id => accountRequest('/api/admin/users/update', { id, status: 'disabled' }))); setSelected([]); await load() })}>停用选中</button></BatchBar>
      <div className="table-scroll"><table className="management-table"><thead><tr><th><input type="checkbox" aria-label="全选当前列表" checked={visible.length > 0 && visible.every(row => selected.includes(row.id))} onChange={event => setSelected(event.target.checked ? visible.map(row => row.id) : [])} /></th><th>账号</th><th>角色</th><th>{isAgents ? '代理编号' : '项目'}</th><th>状态</th><th>操作</th></tr></thead><tbody>{visible.map(row => <tr key={row.id}><td><input type="checkbox" aria-label={`选择${row.username}`} checked={selected.includes(row.id)} onChange={event => setSelected(current => event.target.checked ? [...current, row.id] : current.filter(id => id !== row.id))} /></td><td><strong>{row.displayName || row.username}</strong><span>{row.username}</span></td><td>{roleLabels[row.role]}</td><td>{isAgents ? row.agentId || row.workspaceId : `${row.projectName || row.projectId || row.workspaceId}`}</td><td><span className="pill">{statusLabels[row.status] || row.status}</span></td><td><div className="row-actions"><button className="ghost-button" disabled={busy || row.id === me?.id} onClick={() => void toggleStatus(row)}>{row.status === 'active' ? '停用' : '启用'}</button></div></td></tr>)}</tbody></table></div>
      {!visible.length && <EmptyState title={query ? '没有匹配账号' : isAgents ? '还没有代理账号' : '还没有项目账号'} description={query ? '换个关键词再试。' : isAgents ? '点击右上角添加代理账号。' : '点击右上角添加项目账号。'} />}
      {message && <p className="table-note" role="status">{message}</p>}
    </div>
    {draftOpen && <Modal title={isAgents ? '添加代理账号' : '添加项目账号'} onClose={() => setDraftOpen(false)} actions={<><button className="ghost-button" onClick={() => setDraftOpen(false)}>取消</button><button className="primary-button" form="account-create-form" disabled={busy}>保存账号</button></>}>
      <form id="account-create-form" className="console-form" onSubmit={submit}>
        <label>登录账号<input name="username" required minLength={3} maxLength={80} autoFocus /></label>
        <label>显示名称<input name="displayName" required maxLength={80} /></label>
        <label>初始密码<input name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" /></label>
        {!isAgents && <><label>账号角色<select name="role" defaultValue="project_admin"><option value="project_admin">项目管理员</option><option value="project_operator">项目操作员</option></select></label><label>项目名称<input name="projectName" placeholder="例如：某客户GEO项目" required maxLength={80} /></label><label>项目编号（可留空自动生成）<input name="projectId" placeholder="只支持字母、数字、横线、下划线" /></label></>}
        {isAgents && <label>代理编号（可留空自动生成）<input name="agentId" placeholder="只支持字母、数字、横线、下划线" /></label>}
      </form>
    </Modal>}
  </section>
}

export function AgencyDirectory() {
  return <AccountDirectory mode="agents" />
}

export function ProjectAccountDirectory() {
  return <AccountDirectory mode="projects" />
}

export function ConsoleOverview({ kind, projectCount, articleCount, onProjects }: { kind: ConsoleKind; projectCount: number; articleCount: number; onProjects: () => void }) {
  return <section className="operation-page"><PageHeader title={kind === 'platform' ? '平台概览' : '代理工作台'} description="查看当前已加载的项目与内容规模。" /><div className="console-metrics"><div className="panel"><span>品牌项目</span><strong>{projectCount}</strong></div><div className="panel"><span>文章记录</span><strong>{articleCount}</strong></div></div><div className="panel"><PageHeader title="项目管理" description="从品牌列表进入项目，继续资料准备与内容生产。" actions={<button className="primary-button" onClick={onProjects}>查看项目</button>} /><p className="table-note">账号权限已按总后台、代理后台、项目后台分层；内容数据仍按项目空间隔离。</p></div></section>
}
