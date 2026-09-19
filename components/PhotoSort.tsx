'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { closestCenter, DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import styles from './PhotoSort.module.css'

export function PhotoSort({ ids, children, preview, onMove, disabled, onDraggingChange }: { ids: string[]; children: ReactNode; preview: (id: string) => ReactNode; onMove: (from: number, to: number) => void; disabled?: boolean; onDraggingChange?: (value: boolean) => void }) {
  const [active, setActive] = useState<string | null>(null), [mounted, setMounted] = useState(false), [reduced, setReduced] = useState(false)
  useEffect(() => { setMounted(true); const query = matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setReduced(query.matches); update(); query.addEventListener('change', update); return () => query.removeEventListener('change', update) }, [])
  useEffect(() => { onDraggingChange?.(active !== null); return () => onDraggingChange?.(false) }, [active, onDraggingChange])
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Tab'] } }),
  )
  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={({ active }) => setActive(String(active.id))} onDragCancel={() => setActive(null)} onDragEnd={({ active, over }) => {
    setActive(null)
    if (!disabled && over && active.id !== over.id) { const from = ids.indexOf(String(active.id)), to = ids.indexOf(String(over.id)); if (from >= 0 && to >= 0) onMove(from, to) }
  }} accessibility={{ screenReaderInstructions: { draggable: '按空格开始排序，方向键移动，空格确认，Escape 取消。' } }}>
    <SortableContext items={ids} strategy={rectSortingStrategy}>{children}</SortableContext>
    {mounted && createPortal(<DragOverlay zIndex={2100} dropAnimation={reduced ? null : { duration: 180, easing: 'ease-out' }}>{active ? <div className={styles.overlay}>{preview(active)}</div> : null}</DragOverlay>, document.body)}
  </DndContext>
}
export function SortablePhoto({ id, className, disabled, children }: { id: string; className?: string; disabled?: boolean; children: (handle: Pick<ReturnType<typeof useSortable>, 'attributes' | 'listeners' | 'setActivatorNodeRef'>) => ReactNode }) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled, transition: { duration: 180, easing: 'ease-out' } })
  return <div ref={setNodeRef} data-sortable-photo={id} className={`${className || ''} ${styles.item}`} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.25 : 1 }}>{children({ attributes, listeners, setActivatorNodeRef })}</div>
}
