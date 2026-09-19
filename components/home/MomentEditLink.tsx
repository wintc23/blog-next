'use client'
import { Button } from 'antd'
import { useUser } from '@/lib/store'
export default function MomentEditLink({ id }: { id: string }) {
  const user = useUser()
  if (!user?.admin) return null
  return <Button type="link" href={`/manage/moments?edit=${encodeURIComponent(id)}`}>编辑</Button>
}
