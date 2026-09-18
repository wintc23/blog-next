'use client'

import { App } from 'antd'
import { ApiError } from './api/client'
import { useAppStore } from './store'
import type { User } from './schemas/user'

/** Authenticate on demand, then carry out the original action without a modal. */
export function useAuthenticatedAction() {
  const ensureUser = useAppStore((s) => s.ensureUser)
  const logout = useAppStore((s) => s.logout)
  const { message } = App.useApp()

  return async <T,>(action: (user: User) => Promise<T>): Promise<T> => {
    const authenticate = async () => {
      const result = await ensureUser()
      if (result.signedIn) {
        message.info({ key: 'quick-login', content: `已为你快捷登录为「${result.user.username}」` })
      }
      return result.user
    }
    const user = await authenticate()
    try {
      return await action(user)
    } catch (error) {
      // Only an explicitly rejected credential can safely retry the action.
      if (!(error instanceof ApiError) || error.status !== 401) throw error
      logout()
      return action(await authenticate())
    }
  }
}
