'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, Checkbox, Collapse, Dropdown, Modal, Spin, type MenuProps } from 'antd'
import { MoreOutlined } from '@ant-design/icons'
import { assetUrl, labels, ratioLabels, type Task } from '@/lib/image-tools'
import { Compare, DownloadImageButton, ResultImage } from './Shared'
import { useUser } from '@/lib/store'
import AddToAlbum from '@/components/albums/AddToAlbum'
import styles from './Tools.module.css'

export default function TaskResults({ task, busy, onRetry, onShare, onDownloadAll, onClone, onStopSharing, moreItems, onMoreAction }: {
  task: Task
  busy: boolean
  onRetry: (itemId: string) => void
  onShare: (assetIds: string[]) => Promise<boolean>
  onDownloadAll: () => void
  onClone: () => void
  onStopSharing: () => void
  moreItems: MenuProps['items']
  onMoreAction: (key: string) => void
}) {
  const canShare = !!useUser()?.admin
  const [activeId, setActiveId] = useState((task.items.at(-1)?.previousId ? task.items.at(-1)?.id : task.items[0]?.id) || '')
  const knownItems = useRef(new Set(task.items.map(item => item.id)))
  const [comparing, setComparing] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  // A retry creates a new item; follow it while keeping earlier results accessible.
  useEffect(() => {
    const added = task.items.filter(item => !knownItems.current.has(item.id))
    if (added.length) setActiveId(added.at(-1)!.id)
    knownItems.current = new Set(task.items.map(item => item.id))
  }, [task.items])
  const item = task.items.find(item => item.id === activeId) || task.items[0]
  const output = task.outputs.find(asset => asset.id === item?.outputId)
  const source = task.inputs.find(asset => asset.id === item?.sourceId)
  const retrying = task.items.some(candidate => candidate.previousId === item?.id && ['queued', 'running'].includes(candidate.status))
  const canRetry = item && ['completed', 'failed', 'uncertain'].includes(item.status) && !retrying
  const completed = task.items.filter(item => item.status === 'completed').length
  const openShare = () => {
    if (!canShare || !output) return
    if (task.outputs.length === 1) { void onShare([output.id]); return }
    setSelected([output.id]); setShareOpen(true)
  }
  const selectedIds = selected.filter(id => task.outputs.some(asset => asset.id === id))
  return <>
    <section className={`${styles.panel} ${styles.resultsPanel}`} aria-label="生成结果">
      <div className={styles.panelHeading}><h2>生成结果</h2><span className={styles.resultStatus} role="status">{task.items.length > 1 ? `已完成 ${completed} / ${task.items.length}` : labels[item?.status || task.status]}</span></div>
      {task.items.length > 1 && <div className={styles.resultChoices} role="group" aria-label="选择生成结果">
        {task.items.map((candidate, index) => {
          const asset = task.outputs.find(asset => asset.id === candidate.outputId)
          return <Button type="text" className={styles.resultChoice} key={candidate.id} aria-pressed={candidate.id === item?.id} aria-label={`查看结果 ${index + 1}，${labels[candidate.status] || candidate.status}`} onClick={() => setActiveId(candidate.id)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {asset ? <img src={assetUrl(asset)} alt="" /> : <span className={styles.choiceStatus}>{labels[candidate.status] || candidate.status}</span>}
            <span>{index + 1}{candidate.previousId ? ' · 新版' : ''}</span>
          </Button>
        })}
      </div>}
      {output ? <ResultImage key={output.id} asset={output} gallery={task.outputs} alt={`生成结果 ${task.items.indexOf(item) + 1}`} /> : <div className={styles.generationState} role="status">
        {['queued', 'running'].includes(item?.status || task.status) && <Spin />}
        <strong>{labels[item?.status || task.status] || '等待结果'}</strong>
        <p>{item?.error || (['queued', 'running'].includes(item?.status || task.status) ? '图片生成后会自动显示，可以稍后从“我的图片任务”继续查看。' : '暂时没有可用的图片结果。')}</p>
      </div>}
      <div className={styles.resultCaption}>
        <span>{source?.name || (task.items.length > 1 ? `结果 ${task.items.indexOf(item) + 1}` : '生成图片')}{item?.previousId ? ' · 新版本' : ''}</span>
        {output && <span>{output.width} × {output.height}</span>}
      </div>
      <div className={styles.resultToolbar} role="group" aria-label="当前结果操作">
        {output && <><DownloadImageButton asset={output} disabled={busy} /><AddToAlbum sources={task.outputs.map(asset => ({ type: 'generated', id: asset.id }))} pictures={task.outputs.map((asset, index) => ({ url: assetUrl(asset), name: `结果 ${index + 1}` }))} />{canShare && <Button disabled={busy} onClick={openShare}>分享结果</Button>}</>}
        {canRetry && <Button disabled={busy} onClick={() => onRetry(item.id)}>重新生成</Button>}
        {output && source && task.config.comparison && <Button disabled={busy} onClick={() => setComparing(true)}>对比原图</Button>}
        <Dropdown trigger={['click']} menu={{ items: [
          { key: 'clone', label: '调整后再生成' },
          ...(task.outputs.length > 1 ? [{ key: 'download', label: '下载全部图片（ZIP）' }] : []),
          ...(canShare && task.sharing ? [{ key: 'unshare', label: '取消结果分享' }] : []),
          { type: 'divider' },
          ...(moreItems || []),
        ], onClick: ({ key }) => {
          if (key === 'clone') onClone()
          if (key === 'download') onDownloadAll()
          if (key === 'unshare' && canShare) onStopSharing()
          onMoreAction(key)
        } }}><Button icon={<MoreOutlined />} disabled={busy} aria-label="更多结果操作">更多</Button></Dropdown>
      </div>
    </section>
    <Collapse className={styles.inputSummary} items={[{ key: 'input', label: '查看本次输入与设置', children: <>
      {!!task.inputs.length && <div className={styles.sourceImages}>{task.inputs.map(asset => <ResultImage key={asset.id} asset={asset} gallery={task.inputs} alt={asset.name} compact />)}</div>}
      {task.options.prompt && <p className={styles.inputPrompt}>{task.options.prompt}</p>}
      <dl className={styles.inputSettings}><div><dt>画幅</dt><dd>{ratioLabels[task.options.ratio || task.config.defaultRatio] || task.options.ratio || task.config.defaultRatio}</dd></div>
        {task.config.fields.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{task.options.fields?.[field.key] || field.default}</dd></div>)}
      </dl>
    </> }]} />
    <Modal title="对比原图" open={comparing && !!source && !!output} onCancel={() => setComparing(false)} footer={null} width={720} destroyOnClose>
      {source && output && <Compare input={source} output={output} />}
    </Modal>
    <Modal title="选择分享的图片" open={canShare && shareOpen} onCancel={() => setShareOpen(false)} okText="创建分享链接" cancelText="取消" confirmLoading={busy} okButtonProps={{ disabled: !selectedIds.length }} onOk={async () => { if (canShare && await onShare(selectedIds)) setShareOpen(false) }}>
      <p className={styles.hint}>仅分享选中的结果，不包含原图和生成要求。链接 7 天有效，重新分享会替换旧链接。</p>
      <Checkbox checked={selectedIds.length === task.outputs.length} indeterminate={!!selectedIds.length && selectedIds.length < task.outputs.length} onChange={event => setSelected(event.target.checked ? task.outputs.map(asset => asset.id) : [])}>全选</Checkbox>
      <div className={styles.shareChoices}>{task.outputs.map((asset, index) => <Checkbox key={asset.id} checked={selectedIds.includes(asset.id)} onChange={event => setSelected(list => event.target.checked ? [...list, asset.id] : list.filter(id => id !== asset.id))}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={assetUrl(asset)} alt="" /><span>结果 {index + 1}</span>
      </Checkbox>)}</div>
    </Modal>
  </>
}
