'use client'

import { App, DatePicker, Radio, Table } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { getSiteStatReport } from '@/lib/api/stat'
import type { RadioChangeEvent } from 'antd'
import type { Dayjs } from 'dayjs'

interface StatRow {
  bucket: string
  pv: number
  uv: number
}

interface Summary {
  totalPv: number
  totalUv: number
}

export default function ManageStatClient() {
  const [granularity, setGranularity] = useState<'day' | 'week'>('day')
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [list, setList] = useState<StatRow[]>([])
  const [summary, setSummary] = useState<Summary>({ totalPv: 0, totalUv: 0 })
  const [loading, setLoading] = useState(false)
  const { message } = App.useApp()

  const load = useCallback(async () => {
    setLoading(true)
    const params: Record<string, unknown> = { granularity }
    if (range && range[0] && range[1]) {
      params.startTime = range[0].startOf('day').unix()
      params.endTime = range[1].endOf('day').unix()
    }
    try {
      const res = (await getSiteStatReport(params)) as unknown as {
        list: StatRow[]
        summary?: Summary
      }
      setList(res.list || [])
      setSummary(res.summary || { totalPv: 0, totalUv: 0 })
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [granularity, range, message])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="flex h-full flex-col p-3">
      <div className="flex shrink-0 items-center justify-between border-b pb-3">
        <DatePicker.RangePicker
          value={range}
          onChange={(v) => setRange(v as [Dayjs | null, Dayjs | null] | null)}
        />
        <Radio.Group
          value={granularity}
          onChange={(e: RadioChangeEvent) => setGranularity(e.target.value)}
          optionType="button"
        >
          <Radio.Button value="day">按天</Radio.Button>
          <Radio.Button value="week">按周</Radio.Button>
        </Radio.Group>
      </div>
      <div className="flex shrink-0 gap-3 py-3">
        <div className="min-w-[120px] rounded bg-[#f5f7f9] px-4 py-3">
          <div className="text-xs text-[#999]">总 PV</div>
          <div className="mt-1 text-2xl font-bold text-[#2d8cf0]">
            {summary.totalPv || 0}
          </div>
        </div>
        <div className="min-w-[120px] rounded bg-[#f5f7f9] px-4 py-3">
          <div className="text-xs text-[#999]">总 UV</div>
          <div className="mt-1 text-2xl font-bold text-[#2d8cf0]">
            {summary.totalUv || 0}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <Table
          rowKey="bucket"
          loading={loading}
          dataSource={list}
          pagination={false}
          size="small"
          bordered
          columns={[
            { title: '周期', dataIndex: 'bucket', key: 'bucket' },
            { title: 'PV', dataIndex: 'pv', key: 'pv', align: 'center' },
            { title: 'UV', dataIndex: 'uv', key: 'uv', align: 'center' },
          ]}
        />
      </div>
    </div>
  )
}
