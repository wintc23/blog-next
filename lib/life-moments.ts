import type { ProfileMoment } from './schemas/personal-profile'

/** API dates and displayed times always use Asia/Shanghai, independent of the viewer's timezone. */
export function momentClock(moment: Pick<ProfileMoment, 'occurredAt'>) {
  if (!moment.occurredAt) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(moment.occurredAt))
}

export function momentTimeLabel(moment: Pick<ProfileMoment, 'date' | 'occurredAt'>) {
  return [moment.date.replaceAll('-', '.'), momentClock(moment)].filter(Boolean).join(' ')
}

export function currentMomentTime() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date())
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}
