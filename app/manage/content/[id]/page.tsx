import { notFound } from 'next/navigation'
import ContentManager from '@/components/generation/ContentManager'
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[1-9]\d*$/.test(id)) notFound()
  return <ContentManager id={Number(id)} />
}
