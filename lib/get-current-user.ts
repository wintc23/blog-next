import { apiFetchServer } from './api/client'
import { UserSchema } from './schemas'
import type { User } from './schemas'

/**
 * Read the `token` cookie on the server and exchange it for the current
 * user object. Returns `null` if no cookie or the call fails — we never
 * throw from the root layout.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    return (await apiFetchServer('/get-self/', { schema: UserSchema })) as User
  } catch {
    return null
  }
}
