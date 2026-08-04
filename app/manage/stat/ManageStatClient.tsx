'use client'

import Link from 'next/link'
import {
  App,
  DatePicker,
  Empty,
  Progress,
  Segmented,
  Spin,
  Table,
  Tag,
} from 'antd'
import {
  CommentOutlined,
  EyeOutlined,
  HeartOutlined,
  MessageOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import { getAnalyticsDashboard } from '@/lib/api/stat'
import type { AnalyticsDashboard } from '@/lib/schemas'

const METRIC_META = [
  { key: 'pv', label: '页面浏览', icon: <EyeOutlined />, color: '#2563eb' },
  { key: 'uv', label: '独立访客', icon: <TeamOutlined />, color: '#7c3aed' },
  { key: 'sessions', label: '访问会话', icon: <ThunderboltOutlined />, color: '#0891b2' },
  { key: 'comments', label: '新增评论', icon: <CommentOutlined />, color: '#059669' },
  { key: 'messages', label: '新增留言', icon: <MessageOutlined />, color: '#d97706' },
  { key: 'likes', label: '新增点赞', icon: <HeartOutlined />, color: '#e11d48' },
] as const

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN', { notation: value >= 10000 ? 'compact' : 'standard' }).format(value)
}

function MetricCard({ label, value, change, icon, color }: {
  label: string
  value: number
  change?: number
  icon: React.ReactNode
  color: string
}) {
  const positive = (change || 0) >= 0
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{formatNumber(value)}</div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg text-lg" style={{ color, background: `${color}12` }}>
          {icon}
        </div>
      </div>
      {change !== undefined && (
        <div className={`mt-3 text-xs ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
          {positive ? '↑' : '↓'} {Math.abs(change)}% <span className="text-slate-400">较上一周期</span>
        </div>
      )}
    </div>
  )
}

function TrendChart({ rows }: { rows: AnalyticsDashboard['trend'] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const width = 900
  const height = 250
  const padding = 32
  const max = Math.max(1, ...rows.flatMap((row) => [row.pv, row.uv]))
  const points = (key: 'pv' | 'uv') => rows.map((row, index) => {
    const x = padding + (rows.length <= 1 ? 0 : index * (width - padding * 2) / (rows.length - 1))
    const y = height - padding - row[key] * (height - padding * 2) / max
    return `${x},${y}`
  }).join(' ')
  const hovered = hoveredIndex === null ? null : rows[hoveredIndex]
  const hoveredX = hoveredIndex === null
    ? 0
    : padding + (rows.length <= 1 ? 0 : hoveredIndex * (width - padding * 2) / (rows.length - 1))
  const pointY = (value: number) => height - padding - value * (height - padding * 2) / max
  if (!rows.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
  return (
    <div>
      <div className="mb-2 flex gap-5 text-xs text-slate-500">
        <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-600" />PV</span>
        <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-violet-600" />UV</span>
      </div>
      <div className="overflow-x-auto">
        <div className="relative min-w-[680px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" role="img" aria-label="访问趋势图" onMouseLeave={() => setHoveredIndex(null)}>
          {[0, 1, 2, 3, 4].map((line) => {
            const y = padding + line * (height - padding * 2) / 4
            return <line key={line} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
          })}
          <polyline points={points('pv')} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={points('uv')} fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          {hovered && (
            <>
              <line x1={hoveredX} x2={hoveredX} y1={padding} y2={height - padding} stroke="#94a3b8" strokeDasharray="4 4" />
              <circle cx={hoveredX} cy={pointY(hovered.pv)} r="5" fill="#2563eb" stroke="white" strokeWidth="2" />
              <circle cx={hoveredX} cy={pointY(hovered.uv)} r="5" fill="#7c3aed" stroke="white" strokeWidth="2" />
            </>
          )}
          {rows.map((row, index) => {
            const cellWidth = (width - padding * 2) / Math.max(1, rows.length)
            const x = padding + index * (width - padding * 2) / Math.max(1, rows.length - 1)
            return <rect key={`hit-${row.bucket}`} x={x - cellWidth / 2} y={padding} width={cellWidth} height={height - padding * 2} fill="transparent" onMouseEnter={() => setHoveredIndex(index)} />
          })}
          {rows.map((row, index) => {
            if (index % Math.max(1, Math.ceil(rows.length / 7)) !== 0 && index !== rows.length - 1) return null
            const x = padding + (rows.length <= 1 ? 0 : index * (width - padding * 2) / (rows.length - 1))
            return <text key={row.bucket} x={x} y={height - 7} textAnchor="middle" fontSize="10" fill="#94a3b8">{row.bucket.slice(5)}</text>
          })}
        </svg>
        {hovered && (
          <div className="pointer-events-none absolute rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg" style={{ left: `${hoveredX / width * 100}%`, top: 8, transform: hoveredX > width * 0.78 ? 'translateX(-100%)' : 'translateX(8px)' }}>
            <div className="mb-1 font-medium">{hovered.bucket}</div>
            <div>PV：{hovered.pv}</div>
            <div>UV：{hovered.uv}</div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

function InteractionBars({ rows }: { rows: AnalyticsDashboard['trend'] }) {
  const totals = [
    { label: '评论', value: rows.reduce((sum, row) => sum + row.comments, 0), color: '#10b981' },
    { label: '留言', value: rows.reduce((sum, row) => sum + row.messages, 0), color: '#f59e0b' },
    { label: '点赞', value: rows.reduce((sum, row) => sum + row.likes, 0), color: '#f43f5e' },
  ]
  const max = Math.max(1, ...totals.map((item) => item.value))
  return (
    <div className="space-y-5 pt-2">
      {totals.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex justify-between text-sm"><span className="text-slate-600">{item.label}</span><b>{item.value}</b></div>
          <Progress percent={Math.round(item.value * 100 / max)} showInfo={false} strokeColor={item.color} trailColor="#f1f5f9" />
        </div>
      ))}
    </div>
  )
}

export default function ManageStatClient() {
  const [preset, setPreset] = useState<'7' | '30' | '90' | undefined>('30')
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(29, 'day'), dayjs()])
  const [data, setData] = useState<AnalyticsDashboard | null>(null)
  const [loading, setLoading] = useState(false)
  const { message } = App.useApp()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getAnalyticsDashboard({
        start_time: range[0].startOf('day').unix(),
        end_time: range[1].add(1, 'day').startOf('day').unix(),
      }))
    } catch {
      message.error('数据分析加载失败')
    } finally {
      setLoading(false)
    }
  }, [range, message])

  useEffect(() => { load() }, [load])

  const maxSource = useMemo(() => Math.max(1, ...(data?.sources || []).map((item) => item.pv)), [data])

  const applyPreset = (value: string | number) => {
    const days = Number(value)
    setPreset(String(value) as '7' | '30' | '90')
    setRange([dayjs().subtract(days - 1, 'day'), dayjs()])
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="m-0 text-2xl font-bold text-slate-900">数据分析</h1>
            <p className="mb-0 mt-1 text-sm text-slate-500">访问、内容表现与社区互动的统一视图</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented value={preset} onChange={applyPreset} options={[{ label: '近 7 天', value: '7' }, { label: '近 30 天', value: '30' }, { label: '近 90 天', value: '90' }]} />
            <DatePicker.RangePicker value={range} allowClear={false} onChange={(value) => {
              if (value?.[0] && value[1]) {
                setPreset(undefined)
                setRange([value[0], value[1]])
              }
            }} />
          </div>
        </div>

        <Spin spinning={loading}>
          {data ? (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                {METRIC_META.map((item) => <MetricCard key={item.key} label={item.label} icon={item.icon} color={item.color} value={data.metrics[item.key]} change={data.changes[item.key]} />)}
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4"><h2 className="m-0 text-base font-semibold">访问趋势</h2><span className="text-xs text-slate-400">{data.range.start} 至 {data.range.end}</span></div>
                  <TrendChart rows={data.trend} />
                </section>
                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="m-0 text-base font-semibold">社区互动</h2>
                  <p className="mt-1 text-xs text-slate-400">统计周期内新增操作</p>
                  <InteractionBars rows={data.trend} />
                  <div className="mt-6 grid grid-cols-2 gap-3 border-t pt-4 text-center">
                    <div><div className="text-xl font-bold text-amber-600">{data.interaction.pendingComments}</div><div className="text-xs text-slate-400">待审评论</div></div>
                    <div><div className="text-xl font-bold text-amber-600">{data.interaction.pendingMessages}</div><div className="text-xs text-slate-400">待审留言</div></div>
                  </div>
                </section>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b px-4 py-3"><h2 className="m-0 text-base font-semibold">内容表现</h2></div>
                  <Table rowKey={(row) => `${row.type}-${row.id}`} size="small" pagination={false} scroll={{ x: 620 }} dataSource={data.topContent} columns={[
                    { title: '内容', key: 'title', width: 250, render: (_, row) => <div className="min-w-0"><Link href={row.path} target="_blank" className="block truncate font-medium">{row.title}</Link><Tag className="mt-1" color={row.type === 'article' ? 'blue' : 'purple'}>{row.type === 'article' ? '文章' : '作品'}</Tag></div> },
                    { title: 'PV', dataIndex: 'pv', align: 'right' },
                    { title: 'UV', dataIndex: 'uv', align: 'right' },
                    { title: '评论', dataIndex: 'comments', align: 'right' },
                    { title: '点赞', dataIndex: 'likes', align: 'right' },
                    { title: '外链点击', key: 'linkClicks', align: 'right', render: (_, row) => row.type === 'product' ? row.linkClicks : '—' },
                    { title: '互动率', key: 'rate', align: 'right', render: (_, row) => `${row.interactionRate}%` },
                  ]} />
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="m-0 text-base font-semibold">流量来源</h2>
                  <div className="mt-4 space-y-4">
                    {data.sources.length ? data.sources.map((source) => (
                      <div key={source.name}>
                        <div className="mb-1 flex items-center justify-between text-sm"><span className="max-w-[65%] truncate text-slate-600">{source.name}</span><span><b>{source.pv}</b> <span className="text-xs text-slate-400">PV · {source.percentage}%</span></span></div>
                        <Progress percent={Math.round(source.pv * 100 / maxSource)} showInfo={false} strokeColor="#6366f1" trailColor="#f1f5f9" size="small" />
                      </div>
                    )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                  </div>
                </section>
              </div>

              <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b px-4 py-3">
                  <h2 className="m-0 text-base font-semibold">作品链接点击</h2>
                  <p className="mb-0 mt-1 text-xs text-slate-400">按作品后台配置的统计标识区分自定义按钮，不根据名称或 URL 猜测类型</p>
                </div>
                <Table rowKey={(row) => `${row.productId}-${row.linkKey}-${row.location}`} size="small" pagination={false} locale={{ emptyText: '当前周期暂无作品链接点击' }} dataSource={data.productLinks} columns={[
                  { title: '作品', dataIndex: 'productName' },
                  { title: '按钮名称', dataIndex: 'linkLabel' },
                  { title: '统计标识', dataIndex: 'linkKey', render: (value) => <Tag>{value}</Tag> },
                  { title: '位置', dataIndex: 'location', render: (value) => value === 'hero' ? '首屏' : value },
                  { title: '点击量', dataIndex: 'clicks', align: 'right' },
                  { title: '点击访客', dataIndex: 'uv', align: 'right' },
                  { title: '点击转化率', dataIndex: 'conversionRate', align: 'right', render: (value) => `${value}%` },
                ]} />
              </section>

              <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b px-4 py-3"><h2 className="m-0 text-base font-semibold">热门页面</h2></div>
                <Table rowKey="path" size="small" pagination={false} dataSource={data.topPages} columns={[
                  { title: '页面', dataIndex: 'path', render: (path) => <Link href={path} target="_blank">{path}</Link> },
                  { title: 'PV', dataIndex: 'pv', align: 'right', width: 120 },
                  { title: 'UV', dataIndex: 'uv', align: 'right', width: 120 },
                ]} />
              </section>
            </>
          ) : !loading ? <div className="rounded-xl bg-white py-20"><Empty description="暂无分析数据" /></div> : <div className="h-[420px]" />}
        </Spin>
      </div>
    </div>
  )
}
