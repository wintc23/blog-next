import TaskScreen from '@/components/image-tools/TaskScreen'
export const metadata = { title: '图片任务', robots: { index: false, follow: false }, referrer: 'no-referrer' }
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <TaskScreen key={(await params).id} id={(await params).id} /> }
