'use client'
import { useEffect, useState } from 'react'
import { Alert, Button, Collapse, Descriptions, Drawer, Empty, Image, Spin, Tabs } from 'antd'
import { z } from 'zod'
import { apiFetch } from '@/lib/api/client'
import { assetUrl, labels, ratioLabels, TaskSchema, type Asset } from '@/lib/image-tools'
import styles from './Admin.module.css'
const DetailSchema = z.object({ task: TaskSchema.omit({ quota: true }), model: z.string(), owner: z.object({ id: z.number(), username: z.string(), isGuest: z.boolean() }) })
export default function AdminJobDetails({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [data, setData] = useState<z.infer<typeof DetailSchema> | null>(null)
  const [error, setError] = useState(''), [revision, setRevision] = useState(0)
  useEffect(() => {
    setData(null); setError('')
    if (!id) return
    const controller = new AbortController()
    apiFetch(`/image-tools/admin/jobs/${encodeURIComponent(id)}/`, { schema: DetailSchema, cache: 'no-store', signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setData(value) })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '加载任务失败') })
    return () => controller.abort()
  }, [id, revision])
  const gallery = (assets: Asset[]) => assets.length ? <Image.PreviewGroup><div className={styles.jobPhotos}>{assets.map((asset, index) => <figure key={asset.id}><Image src={assetUrl(asset)} alt={asset.name || `图片 ${index + 1}`} /><figcaption>{index + 1}. {asset.name}<br />{asset.width} × {asset.height}</figcaption></figure>)}</div></Image.PreviewGroup> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无图片" />
  const task = data?.task.id === id ? data.task : null
  return <Drawer title="任务详情" open={!!id} onClose={onClose} width={820} extra={<Button onClick={() => setRevision(value => value + 1)}>刷新</Button>}>
    {error ? <Alert type="error" message={error} action={<Button onClick={() => setRevision(value => value + 1)}>重试</Button>} /> : !task || !data ? <Spin /> : <div className={styles.jobDetail}>
      <Descriptions size="small" column={1} items={[
        { key: 'id', label: '任务编号', children: task.id },
        { key: 'owner', label: '所属账号', children: `${data.owner.username}（${data.owner.id}）${data.owner.isGuest ? ' · 游客' : ''}` },
        { key: 'tool', label: '工具', children: `${task.config.name} · v${task.toolVersion}` },
        { key: 'model', label: '模型', children: data.model },
        { key: 'status', label: '状态', children: labels[task.status] || task.status },
        { key: 'created', label: '创建时间', children: new Date(task.createdAt).toLocaleString() },
        { key: 'ratio', label: '画幅', children: ratioLabels[task.options.ratio || task.config.defaultRatio] || task.options.ratio || task.config.defaultRatio },
      ]} />
      <Tabs items={[
        { key: 'outputs', label: `结果图（${task.outputs.length}）`, children: gallery(task.outputs) },
        { key: 'inputs', label: `原图（${task.inputs.length}）`, children: gallery(task.inputs) },
        { key: 'config', label: '任务配置', children: <>
          <h3>用户提示词</h3><p className={styles.jobPrompt}>{task.options.prompt || '未填写'}</p>
          <h3>生成指令</h3><p className={styles.jobPrompt}>{task.config.instruction || '未设置'}</p>
          <Collapse items={[{ key: 'options', label: '用户参数', children: <pre className={styles.jobJson}>{JSON.stringify(task.options, null, 2)}</pre> }, { key: 'snapshot', label: '创建任务时的完整配置', children: <pre className={styles.jobJson}>{JSON.stringify(task.config, null, 2)}</pre> }]} />
        </> },
        { key: 'items', label: '执行明细', children: task.items.length ? <ul className={styles.jobItems}>{task.items.map((item, index) => <li key={item.id}><strong>图片 {index + 1} · {labels[item.status] || item.status}</strong><p>原图：{task.inputs.find(asset => asset.id === item.sourceId)?.name || '无'}　结果：{task.outputs.find(asset => asset.id === item.outputId)?.name || '无'}</p>{item.error && <Alert type="error" message={item.error} />}</li>)}</ul> : <Empty description="暂无执行记录" /> },
      ]} />
    </div>}
  </Drawer>
}
