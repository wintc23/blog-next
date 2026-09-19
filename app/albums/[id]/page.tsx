import AlbumDetail from '@/components/albums/AlbumDetail'
export const metadata = { title: '画册' }
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <AlbumDetail id={(await params).id} /> }
