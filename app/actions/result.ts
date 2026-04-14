import { ApiError } from '@/lib/api/client'
import { ZodError } from 'zod'

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const data = await fn()
    return { ok: true, data }
  } catch (err) {
    if (err instanceof ZodError) {
      return { ok: false, error: '数据格式异常' }
    }
    if (err instanceof ApiError) {
      return { ok: false, error: err.message || '请求失败' }
    }
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message || '未知错误' }
  }
}
