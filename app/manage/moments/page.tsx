import MomentsManager from './MomentsManager'

export default async function ManageMomentsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams
  return <MomentsManager initialEditId={typeof edit === 'string' ? edit : undefined} />
}
