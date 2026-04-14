'use client'

import { getVisitorId } from '@/lib/utils'
import { statEvents } from '@/lib/api/stat'

interface StatEvent {
  name: string
  params: string
  visitorId: string
}

class StatManager {
  private queue: StatEvent[] = []
  private timer: ReturnType<typeof setTimeout> | null = null

  push(name: string, params: Record<string, unknown>) {
    if (typeof window === 'undefined') return
    const event: StatEvent = {
      name,
      params: JSON.stringify(params),
      visitorId: getVisitorId(),
    }
    if (name === 'visitPage') {
      statEvents([event]).catch(() => {})
      return
    }
    this.queue.push(event)
    if (this.timer) return
    this.timer = setTimeout(() => this.flush(), 3000)
  }

  private flush() {
    this.timer = null
    if (!this.queue.length) return
    const batch = this.queue.slice()
    this.queue = []
    statEvents(batch).catch(() => {})
  }
}

const instance = new StatManager()

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  instance.push(name, params)
}
