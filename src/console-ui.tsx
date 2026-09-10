import { useEffect, useRef, useState, type ReactNode } from 'react'

export type ConsoleKind = 'platform' | 'agency' | 'project'
export const consoleNames = { platform: '总后台', agency: '代理后台', project: '项目后台' }

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

type Agency = { id: string; name: string; contact: string; status: string }
export function AgencyDirectory() {
  const [rows, setRows] = useState<Agency[]>(() => {
    try { const saved = JSON.parse(localStorage.getItem('geoskill.ui.agencies') || '[]'); return Array.isArray(saved) ? saved : [] } catch { return [] }
  })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('全部状态')
  const [selected, setSelected] = useState<string[]>([])
  const [draft, setDraft] = useState<Agency | null>(null)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string[]>([])
  const visible = rows.filter(row => row.name.includes(query.trim()) && (filter === '全部状态' || row.status === filter))
  const save = (next: Agency[]) => { localStorage.setItem('geoskill.ui.agencies', JSON.stringify(next)); setRows(next) }
  const open = (row?: Agency) => { setError(''); setDraft(row || { id: crypto.randomUUID(), name: '', contact: '', status: '启用' }) }
  return <section className="operation-page">
    <PageHeader title="代理管理" description="维护本机代理联系记录；账户开通与权限分配待接入。" actions={<button className="primary-button" onClick={() => open()}>添加代理</button>} />
    <div className="panel">
      <div className="list-toolbar"><input className="search-input" aria-label="搜索代理" placeholder="搜索代理名称" value={query} onChange={e => { setQuery(e.target.value); setSelected([]) }} /><select aria-label="代理状态" value={filter} onChange={e => { setFilter(e.target.value); setSelected([]) }}>{['全部状态', '启用', '停用'].map(value => <option key={value}>{value}</option>)}</select><span>共 {visible.length} 条</span></div>
      <BatchBar count={selected.length} onClear={() => setSelected([])}><button className="danger-button" onClick={() => setDeleting(selected)}>删除选中</button></BatchBar>
      <div className="table-scroll"><table className="management-table"><thead><tr><th><input type="checkbox" aria-label="全选当前列表" checked={visible.length > 0 && visible.every(row => selected.includes(row.id))} onChange={e => setSelected(e.target.checked ? visible.map(row => row.id) : [])} /></th><th>代理名称</th><th>联系人</th><th>状态</th><th>操作</th></tr></thead><tbody>{visible.map(row => <tr key={row.id}><td><input type="checkbox" aria-label={`选择${row.name}`} checked={selected.includes(row.id)} onChange={e => setSelected(current => e.target.checked ? [...current, row.id] : current.filter(id => id !== row.id))} /></td><td><strong>{row.name}</strong></td><td>{row.contact || '—'}</td><td><span className="pill">{row.status}</span></td><td><div className="row-actions"><button className="ghost-button" onClick={() => open(row)}>编辑</button><button className="ghost-button" onClick={() => save(rows.map(item => item.id === row.id ? { ...item, status: item.status === '启用' ? '停用' : '启用' } : item))}>{row.status === '启用' ? '停用' : '启用'}</button><button className="danger-button" onClick={() => setDeleting([row.id])}>删除</button></div></td></tr>)}</tbody></table></div>
      {!visible.length && <EmptyState title={rows.length ? '没有匹配的代理' : '还没有代理记录'} description={rows.length ? '调整名称或状态筛选。' : '点击右上角添加代理，保存后显示在此列表。'} />}
    </div>
    {draft && <Modal title={rows.some(row => row.id === draft.id) ? '编辑代理' : '添加代理'} onClose={() => setDraft(null)} actions={<><button className="ghost-button" onClick={() => setDraft(null)}>取消</button><button className="primary-button" onClick={() => {
      if (!draft.name.trim()) { setError('请填写代理名称'); return }
      if (rows.some(row => row.id !== draft.id && row.name === draft.name.trim())) { setError('代理名称已存在'); return }
      const next = { ...draft, name: draft.name.trim() }; save(rows.some(row => row.id === draft.id) ? rows.map(row => row.id === draft.id ? next : row) : [...rows, next]); setDraft(null)
    }}>保存</button></>}><div className="console-form"><label>代理名称<input autoFocus value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label><label>联系人<input value={draft.contact} onChange={e => setDraft({ ...draft, contact: e.target.value })} /></label>{error && <p role="alert">{error}</p>}</div></Modal>}
    {deleting.length > 0 && <Modal title="删除代理记录" onClose={() => setDeleting([])} actions={<><button className="ghost-button" onClick={() => setDeleting([])}>取消</button><button className="danger-button" onClick={() => { save(rows.filter(row => !deleting.includes(row.id))); setSelected([]); setDeleting([]) }}>确认删除</button></>}><p>将删除 {deleting.length} 条本机联系记录，不影响品牌项目。</p></Modal>}
  </section>
}

export function ConsoleOverview({ kind, projectCount, articleCount, onProjects }: { kind: ConsoleKind; projectCount: number; articleCount: number; onProjects: () => void }) {
  return <section className="operation-page"><PageHeader title={kind === 'platform' ? '平台概览' : '代理工作台'} description="查看当前已加载的项目与内容规模。" /><div className="console-metrics"><div className="panel"><span>品牌项目</span><strong>{projectCount}</strong></div><div className="panel"><span>文章记录</span><strong>{articleCount}</strong></div></div><div className="panel"><PageHeader title="项目管理" description="从品牌列表进入项目，继续资料准备与内容生产。" actions={<button className="primary-button" onClick={onProjects}>查看项目</button>} /><p className="table-note">当前为后台界面框架，共用现有品牌数据；租户权限与代理项目归属待接入。</p></div></section>
}
