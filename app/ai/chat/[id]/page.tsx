import AiChatClient from '../AiChatClient'

export const dynamic = 'force-dynamic'

export default async function AiChatSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <AiChatClient initialSessionId={Number(id)} />
}
