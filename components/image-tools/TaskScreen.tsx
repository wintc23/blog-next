'use client'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { App, Button, Collapse, Dropdown, Image, Input, Select, Spin, Tooltip } from 'antd'
import { ArrowLeftOutlined, CloseOutlined, MoreOutlined, PlusOutlined, QrcodeOutlined } from '@ant-design/icons'
import { z } from 'zod'
import { useUser, useShowLogin, useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api/client'
import { trackEvent } from '@/lib/stat-event'
import { BASE_URL } from '@/lib/config'
import { IMAGE_UPLOAD_ACCEPT } from '@/lib/image-formats'
import { useImagePaste } from '@/lib/use-image-paste'
import { assetUrl, downloadBlob, loadTask, mutateTask, TaskResult, uploadToolImage, ratioLabels, toolCover, type Options, type Task, type Tool } from '@/lib/image-tools'
import { ShareDialog, useDevice } from './Shared'
import TaskResults from './TaskResults'
import LikeButton from '@/components/LikeButton'
import styles from './Tools.module.css'

function emptyDraft(tool: Tool): Task {
  return { id: '', toolSlug: tool.slug, toolVersion: tool.version, config: tool.config, options: {}, status: 'draft', createdAt: '', inputs: [], outputs: [], items: [], sharing: false,
    quota: { exempt: false, remaining: null, globalPerMinute: 10, userPerHour: 10, retryAfter: 0 } }
}

export default function TaskScreen({ id, tool }: { id?: string; tool?: Tool }) {
  const user = useUser()
  const identity = useRef(user?.id)
  const identityRevision = useRef(0)
  // Preserve selected files/options when an anonymous action establishes a guest.
  // Logout or switching an existing identity still resets private editor state.
  if (identity.current !== user?.id) {
    if (identity.current !== undefined) identityRevision.current++
    identity.current = user?.id
  }
  return <TaskEditor key={`${id || tool?.slug}-${identityRevision.current}`} initialId={id} tool={tool} />
}

function TaskEditor({ initialId, tool }: { initialId?: string; tool?: Tool }) {
  const [id, setId] = useState(initialId || '')
  const idRef = useRef(initialId || '')
  const creating = useRef<Promise<string> | null>(null)
  const user = useUser(), showLogin = useShowLogin(), device = useDevice(), router = useRouter()
  const ensureUser = useAppStore(state => state.ensureUser)
  const { message, modal } = App.useApp()
  const [task, setTask] = useState<Task | null>(() => tool ? emptyDraft(tool) : null)
  const [options, setOptions] = useState<Options>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [share, setShare] = useState<{ title: string; path: string; note?: string; shareTitle?: string; description?: string; image?: string } | null>(null)
  const [uploadUntil, setUploadUntil] = useState<number | null>(null)
  const [saved, setSaved] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const taskRef = useRef<Task | null>(null)
  const optionsLoaded = useRef(!!tool)
  const optionsRef = useRef(options)
  const dirty = useRef(false)
  const editNumber = useRef(0)
  const saving = useRef<Promise<void> | null>(null)
  const active = useRef(false)
  const listRef = useRef<HTMLDivElement>(null)
  const drag = useRef<number | null>(null)
  const dragStart = useRef({ x: 0, y: 0 })
  const dragged = useRef(false)
  const [preview, setPreview] = useState<number | null>(null)
  const prefix = useId()
  taskRef.current = task; optionsRef.current = options
  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!idRef.current) return
    const value = await loadTask(idRef.current, signal)
    if (signal?.aborted) return
    setTask(value.task); taskRef.current = value.task; setError('')
    if (!optionsLoaded.current) { setOptions(value.task.options); optionsRef.current = value.task.options; optionsLoaded.current = true }
  }, [])
  useEffect(() => {
    if (!user || !id) return
    const controller = new AbortController()
    let fetching = false
    const poll = async () => {
      if (fetching || active.current) return
      fetching = true
      try { await refresh(controller.signal) } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '任务加载失败') }
      finally { fetching = false }
    }
    void poll()
    const timer = setInterval(() => void poll(), 4000)
    return () => { controller.abort(); clearInterval(timer) }
  }, [user?.id, id, refresh])
  // Browsing a tool is read-only. Create one draft lazily on first upload or generation.
  const ensureTask = async () => {
    await ensureUser()
    if (idRef.current) return idRef.current
    if (!tool) throw new Error('工具尚未加载')
    if (!creating.current) creating.current = apiFetch('/image-tasks/', { method: 'POST', data: { toolSlug: tool.slug }, schema: TaskResult }).then(({ task: created }) => {
      idRef.current = created.id; taskRef.current = created; setId(created.id); setTask(created)
      return created.id
    }).finally(() => { creating.current = null })
    return creating.current
  }
  const save = useCallback(async () => {
    if (saving.current) await saving.current
    if (!idRef.current || !dirty.current || taskRef.current?.status !== 'draft') return
    const revision = editNumber.current
    const operation = apiFetch(`/image-tasks/${idRef.current}/`, { method: 'PATCH', data: { options: optionsRef.current }, schema: TaskResult }).then(() => {
      if (editNumber.current === revision) { dirty.current = false; setSaved('已保存') }
    })
    saving.current = operation
    try { await operation } finally { saving.current = null }
  }, [id])
  useEffect(() => {
    if (!dirty.current || busy) return
    const timer = setTimeout(() => void save().catch(() => setSaved('保存失败，点击生成可重试')), 900)
    return () => clearTimeout(timer)
  }, [options, busy, save])
  const change = (value: Options) => { dirty.current = true; editNumber.current++; setSaved(''); const next = { ...optionsRef.current, ...value }; optionsRef.current = next; setOptions(next) }
  const action = async (operation: () => Promise<void>) => {
    if (active.current) return false
    active.current = true; setBusy(true)
    try { await operation(); return true } catch (error) { message.error(error instanceof Error ? error.message : '操作失败，请重试'); return false }
    finally { active.current = false; setBusy(false) }
  }
  const upload = (files: File[]) => void action(async () => {
    if (!files.length || !task || task.status !== 'draft') return
    if (files.length + task.inputs.length > task.config.maxImages) throw new Error(`最多上传 ${task.config.maxImages} 张图片`)
    const taskId = await ensureTask()
    try { for (const file of files) await uploadToolImage(file, taskId, undefined, text => message.info({ key: 'image-upload-preparation', content: text })) } finally { await refresh() }
  })
  useImagePaste(task?.status === 'draft' && task.config.maxImages > 0 && !busy && !share && preview === null, upload)
  const handoff = () => void action(async () => {
    await ensureTask(); await save()
    const result = await apiFetch(`/image-tasks/${idRef.current}/handoff/`, { method: 'POST', data: {}, schema: z.object({ token: z.string(), expiresIn: z.number() }) })
    setUploadUntil(Date.now() + result.expiresIn * 1000)
    setShare({ title: device === 'desktop' ? '用手机上传' : '从其他设备上传', path: `/tools/upload#${result.token}`, note: '15 分钟内有效，仅可向当前任务上传图片。请勿转发给不信任的人。关闭窗口即关闭上传入口。' })
  })
  const closeShare = () => {
    if (uploadUntil) void apiFetch(`/image-tasks/${idRef.current}/handoff/`, { method: 'DELETE' }).catch(() => message.info('未能关闭上传入口；它会在到期或开始生成后失效'))
    setUploadUntil(null); setShare(null)
  }
  useEffect(() => {
    if (!uploadUntil) return
    const timer = setTimeout(() => { setShare(null); setUploadUntil(null); message.info('上传入口已过期，可重新打开') }, Math.max(0, uploadUntil - Date.now()))
    return () => clearTimeout(timer)
  }, [uploadUntil, message])
  const reorder = async (ids: string[]) => {
    await save()
    await apiFetch(`/image-tasks/${idRef.current}/`, { method: 'PATCH', data: { options: optionsRef.current, assetOrder: ids }, schema: TaskResult })
    await refresh()
  }
  const start = () => { trackEvent('image_tool.generate_click', { tool: task?.toolSlug }); void action(async () => { const taskId = await ensureTask(); await save(); const result = await mutateTask(taskId, 'submit/'); setTask(result.task); window.history.replaceState(null, '', `/tools/tasks/${taskId}`); setSaved(''); setShare(null); setUploadUntil(null) }).then(ok => { if (!ok) trackEvent('image_tool.submit_failed', { tool: task?.toolSlug }) }) }
  const retry = (itemId: string) => modal.confirm({ title: '重新生成这张图片？', content: '旧结果会保留。重新生成会再次占用 1 张额度；结果待确认的任务也可能已经产生服务费用。', okText: '重新生成', cancelText: '取消', onOk: () => action(async () => { setTask((await mutateTask(id, `items/${itemId}/retry/`)).task) }) })
  const taskMenuItems = [
    { key: 'share-tool', label: '分享工具' },
    ...(id ? [{ key: 'continue', label: '在另一台设备继续' }, { key: 'delete', label: '删除任务', danger: true }] : []),
  ]
  const taskMenuAction = (key: string) => {
    if (!task) return
    if (key === 'share-tool') setShare({ title: task.config.name, path: `/tools/${task.toolSlug}`, description: task.config.description, image: toolCover({ slug: task.toolSlug, config: task.config }), note: '分享工具，不包含你的图片或任务。' })
    if (key === 'continue') void action(async () => { await save(); setShare({ title: '在另一台设备继续', path: `/tools/tasks/${id}`, note: '使用同一账号登录即可继续。' }) })
    if (key === 'delete') modal.confirm({ title: '删除这个任务？', content: '分享链接会立即失效，图片将进入清理队列。', okText: '删除', cancelText: '取消', onOk: () => action(async () => { await apiFetch(`/image-tasks/${id}/`, { method: 'DELETE' }); router.push('/tools/tasks') }) })
  }
  if (!user && !tool) return <div className={styles.panel}><h1>我的图片任务</h1><p>登录原账号，继续在这台设备上查看和操作。</p><Button type="primary" onClick={showLogin}>登录并继续</Button></div>
  return <div className={styles.shell}>
    {error && <div role="alert" className={styles.error}>{error}<Button onClick={() => void refresh().catch(() => {})}>刷新</Button></div>}
    {!task ? !error && <Spin /> : <>
      <div className={styles.editorHeading}><div><Link href="/products" className={styles.backArrow} aria-label="返回探索页图片工具"><ArrowLeftOutlined /></Link><h1>{task.config.name}</h1><LikeButton target="tool" id={task.toolSlug} /></div><Link href="/tools/tasks">我的图片任务</Link></div>
      <Image.PreviewGroup items={task.inputs.map(asset => assetUrl(asset))} preview={{ visible: preview !== null, current: preview ?? 0, onVisibleChange: visible => { if (!visible) setPreview(null) }, onChange: current => setPreview(current) }} />
      <div className={styles.taskFlow}>
        {task.status === 'draft' ? <section className={`${styles.panel} ${styles.draftPanel}`} aria-label="输入"><div className={styles.panelHeading}><h2>{task.config.mode === 'per_image' ? '原图' : '输入'}</h2>
          {task.status === 'draft' && task.config.maxImages > 0 && <Tooltip title={device === 'phone' ? '从其他设备上传' : '用手机上传'}><Button type="link" className={styles.phoneUpload} icon={<QrcodeOutlined />} aria-label={device === 'phone' ? '从其他设备上传' : '用手机上传'} disabled={busy} onClick={handoff}>{device === 'phone' ? '从其他设备上传' : '用手机上传'}</Button></Tooltip>}
        </div>
          {task.config.maxImages > 0 && <>
            <input ref={input} className="hidden" type="file" accept={IMAGE_UPLOAD_ACCEPT} multiple={task.config.maxImages > 1} aria-label="选择创作图片" onChange={event => { upload(Array.from(event.target.files || [])); event.target.value = '' }} />
            <div ref={listRef} className={styles.uploadGrid}
              onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!busy && task.status === 'draft') upload(Array.from(event.dataTransfer.files)) }}
              onPointerMove={event => {
              if (drag.current === null || busy) return
              if (Math.hypot(event.clientX - dragStart.current.x, event.clientY - dragStart.current.y) > 6) dragged.current = true
              const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-tool-image]')
              if (!target || !listRef.current?.contains(target)) return
              const destination = Number(target.dataset.toolImage)
              if (destination === drag.current) return
              const current = taskRef.current!; const images = [...current.inputs]
              images.splice(destination, 0, images.splice(drag.current, 1)[0]); drag.current = destination
              taskRef.current = { ...current, inputs: images }; setTask(taskRef.current)
            }} onPointerUp={() => { if (drag.current !== null) { const index = drag.current; drag.current = null; if (dragged.current) void action(() => reorder(taskRef.current!.inputs.map(asset => asset.id))); else setPreview(index) } }} onPointerCancel={() => { drag.current = null; void refresh().catch(() => {}) }}>
              {task.inputs.map((asset, index) => <div className={styles.thumb} key={asset.id} data-tool-image={index}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetUrl(asset)} alt={asset.name} draggable={false} tabIndex={task.status === 'draft' ? 0 : undefined} role={task.status === 'draft' ? 'button' : undefined} aria-label={task.status === 'draft' ? `查看图片 ${index + 1} 大图；拖动或使用左右方向键排序` : undefined}
                  style={{ touchAction: task.status === 'draft' ? 'none' : 'auto', cursor: task.status === 'draft' ? 'grab' : 'default' }}
                  onPointerDown={event => { if (task.status !== 'draft' || busy || event.button !== 0) return; listRef.current?.setPointerCapture(event.pointerId); drag.current = index; dragged.current = false; dragStart.current = { x: event.clientX, y: event.clientY } }}
                  onKeyDown={event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); setPreview(index); return } if (task.status !== 'draft' || busy || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return; event.preventDefault(); const next = index + (event.key === 'ArrowLeft' ? -1 : 1); if (next < 0 || next >= task.inputs.length) return; const ids = task.inputs.map(a => a.id); ids.splice(next, 0, ids.splice(index, 1)[0]); void action(() => reorder(ids)) }} />
                <span className={styles.imageNumber}>{index + 1}</span>{task.status === 'draft' && <Button size="small" disabled={busy} aria-label={`删除图片 ${index + 1}`} onClick={() => void action(async () => { await apiFetch(`/image-tasks/${id}/assets/${asset.id}/`, { method: 'DELETE' }); await refresh() })}><CloseOutlined /></Button>}
              </div>)}
              {task.status === 'draft' && task.inputs.length < task.config.maxImages && <Tooltip title="添加图片，也可直接粘贴"><Button className={styles.addImage} style={{ width: '100%', height: 'auto' }} type="dashed" icon={<PlusOutlined />} aria-label="添加图片" loading={busy} onClick={() => input.current?.click()} /></Tooltip>}
            </div>
          </>}
          {task.config.promptRequired && <><label className={styles.label} htmlFor={`${prefix}-prompt`}>描述你想生成的画面</label>
          <Input.TextArea autoSize={{ minRows: 4, maxRows: 10 }} id={`${prefix}-prompt`} className={styles.textarea} value={options.prompt || ''} maxLength={4000} disabled={busy || task.status !== 'draft'} onChange={event => change({ prompt: event.target.value })} placeholder="例如：黄昏时分，一间面朝大海的木屋，温暖的灯光，水彩风格…" /></>}
          <Collapse ghost className={styles.advanced} items={[{ key: 'advanced', label: '高级设置', children: <>
            {!task.config.promptRequired && <><label className={styles.label} htmlFor={`${prefix}-prompt`}>补充要求（选填）</label><Input.TextArea id={`${prefix}-prompt`} value={options.prompt || ''} autoSize={{ minRows: 3, maxRows: 8 }} maxLength={4000} disabled={busy || task.status !== 'draft'} onChange={event => change({ prompt: event.target.value })} placeholder="填写额外要求" /></>}
            {task.config.ratios.length > 1 && <><label className={styles.label} htmlFor={`${prefix}-ratio`}>输出画幅</label><Select id={`${prefix}-ratio`} className={styles.select} value={options.ratio || task.config.defaultRatio} options={task.config.ratios.map(value => ({ value, label: ratioLabels[value] || value }))} disabled={busy || task.status !== 'draft'} onChange={ratio => change({ ratio })} /></>}
            {task.config.fields.map(field => <div key={field.key}><label className={styles.label} htmlFor={`${prefix}-${field.key}`}>{field.label}</label><Select id={`${prefix}-${field.key}`} className={styles.select} value={options.fields?.[field.key] || field.default} options={field.options.map(value => ({ value, label: value }))} disabled={busy || task.status !== 'draft'} onChange={value => change({ fields: { ...options.fields, [field.key]: value } })} /></div>)}
            <p className={styles.hint}>{task.config.mode === 'per_image' ? '每张原图生成一张结果，默认自动适配画幅。' : `每次生成 ${task.config.defaultCount} 张结果。`}</p>
          </> }]} />
          <div className={styles.generateRow}><Button type="primary" loading={busy} disabled={task.inputs.length < task.config.minImages || task.config.promptRequired && !options.prompt?.trim()} onClick={start}>生成{task.config.mode === 'per_image' && task.inputs.length ? ` ${task.inputs.length} 张` : ''}</Button><Dropdown trigger={['click']} menu={{ items: taskMenuItems, onClick: ({ key }) => taskMenuAction(key) }}><Button icon={<MoreOutlined />} disabled={busy} aria-label="更多任务操作">更多</Button></Dropdown><span className={styles.hint} role="status">{saved}</span></div>
        </section> : <TaskResults task={task} busy={busy} onRetry={retry} moreItems={taskMenuItems} onMoreAction={taskMenuAction}
          onShare={assetIds => !user?.admin ? Promise.resolve(false) : action(async () => { const result = await apiFetch(`/image-tasks/${id}/share/`, { method: 'POST', data: { assetIds }, schema: z.object({ token: z.string() }) }); setShare({ title: '分享生成结果', shareTitle: `${task.config.name} · 创作分享`, description: `${task.config.name}生成的 ${assetIds.length} 张图片，点击查看完整作品。`, path: `/tools/share/${result.token}`, note: '仅分享所选结果，不含原图和生成要求。7 天有效，可在更多操作中取消。' }); await refresh() })}
          onDownloadAll={() => void action(() => downloadBlob(`${BASE_URL}/image-tasks/${id}/download/`, `${task.config.name}.zip`, true))}
          onClone={() => void action(async () => { const result = await mutateTask(id, 'clone/'); router.push(`/tools/tasks/${result.task.id}`) })}
          onStopSharing={() => { if (!user?.admin) return; void action(async () => { await apiFetch(`/image-tasks/${id}/share/`, { method: 'DELETE' }); await refresh(); message.success('已取消结果分享') }) }} />}
      </div>
      <ShareDialog title={share?.title || ''} path={share?.path.startsWith('/tools/share/') && !user?.admin ? null : share?.path || null} note={share?.note} shareTitle={share?.shareTitle} description={share?.description} image={share?.image} onClose={closeShare} />
    </>}
  </div>
}
