import { apiFetch, apiFetchServer } from './client'
import { SiteStatSummarySchema, StatReportSchema } from '@/lib/schemas'

export function getSiteStatSummary(server = false) {
  return (server ? apiFetchServer : apiFetch)('/get-site-stat-summary/', {
    schema: SiteStatSummarySchema,
  })
}

export function statEvents(
  events: { name: string; params: string; visitorId: string }[],
) {
  return apiFetch('/save-stat-events/', { method: 'POST', data: { events } })
}

export function getStatEventsInfo(params: Record<string, unknown>) {
  return apiFetch('/get-stat-events-info/', { params })
}

export function getSiteStatReport(params: Record<string, unknown>) {
  return apiFetch('/get-site-stat-report/', { params, schema: StatReportSchema })
}
