import { z } from 'zod'
import { camel } from '@/lib/utils'

/**
 * Runs the blog-backend's snake_case payload through camelCase conversion
 * before letting Zod validate it. Every schema is written in camelCase.
 *
 * Composition is safe — running `camel()` on already-camelCased data is a
 * no-op, so nested schemas using this helper won't misbehave, though the
 * canonical pattern is to call `fromSnake` only at the endpoint boundary.
 */
export function fromSnake<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => camel(val), schema)
}

/**
 * Matches a paginated list envelope. Some blog-backend endpoints omit
 * `per_page` (e.g. `/get-comments/`, `/get-hide-messages/`), so we make
 * it optional with a sensible default so downstream UI code can still
 * rely on `perPage` being present.
 */
export function paginated<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    list: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    perPage: z.number().default(20),
  })
}

/** Matches a simple `{ list: T[] }` envelope. */
export function listEnvelope<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({ list: z.array(itemSchema) })
}
