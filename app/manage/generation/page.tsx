import GenerationManager from '@/components/generation/GenerationManager'
export default async function Page({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const { job } = await searchParams
  return <GenerationManager initialJobId={job && /^[1-9]\d*$/.test(job) ? Number(job) : undefined} />
}
