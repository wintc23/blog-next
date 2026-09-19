'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { App, Button } from 'antd'
import { useUser } from '@/lib/store'
import AddToAlbum from '@/components/albums/AddToAlbum'
import { sourceKey, type PhotoSource } from '@/lib/albums'
import styles from './LifeMoments.module.css'
type Selection = { active: boolean; has: (id: string, index: number) => boolean; toggle: (id: string, index: number) => void }
const Context = createContext<Selection | null>(null)
export const useMomentSelection = () => useContext(Context)
export default function MomentSelection({ children }: { children: ReactNode }) {
  const user = useUser(), { message } = App.useApp()
  const [active, setActive] = useState(false), [selected, setSelected] = useState<PhotoSource[]>([])
  const source = (id: string, index: number): PhotoSource => ({ type: 'moment', id: String(id), index })
  const has = (id: string, index: number) => selected.some(item => sourceKey(item) === sourceKey(source(id, index)))
  const toggle = (id: string, index: number) => {
    const item = source(id, index), key = sourceKey(item)
    if (!has(id, index) && selected.length >= 100) { message.info('每次最多选择 100 张图片'); return }
    setSelected(current => current.some(value => sourceKey(value) === key) ? current.filter(value => sourceKey(value) !== key) : [...current, item])
  }
  return <Context.Provider value={{ active: !!user?.admin && active, has, toggle }}>
    {user?.admin && <div className={styles.selectionBar}>
      {active ? <><span role="status">已选 {selected.length} 张 · 可跨动态选择</span><AddToAlbum sources={selected} onAdded={() => setSelected([])} /><Button type="text" onClick={() => setSelected([])} disabled={!selected.length}>清空</Button><Button type="text" onClick={() => { setActive(false); setSelected([]) }}>完成选图</Button></> : <Button type="link" onClick={() => setActive(true)}>选图加入画册</Button>}
    </div>}
    {children}
  </Context.Provider>
}
