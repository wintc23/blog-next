import { permanentRedirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function LegacyBlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      query.append(key, item)
    }
  }

  const suffix = query.toString()
  permanentRedirect(`/article${suffix ? `?${suffix}` : ''}`)
}
