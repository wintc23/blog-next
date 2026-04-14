'use client'

import useSWR from 'swr'
import type { User } from './types'
import { getUserInfoById } from './api/users'

export function useUserById(userId: number | null | undefined) {
  const { data } = useSWR<User | null>(
    userId ? `user:${userId}` : null,
    async () => {
      if (!userId) return null
      try {
        return await getUserInfoById(userId)
      } catch {
        return null
      }
    },
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  )
  return data
}
