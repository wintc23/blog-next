import { notFound } from 'next/navigation'
import DigestPreview from '@/components/ai-digest/DigestPreview'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) notFound()
  return <DigestPreview id={Number(id)} />
}
