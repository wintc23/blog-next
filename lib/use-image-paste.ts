'use client'
import { useEffect } from 'react'

/** Handle user-initiated paste without requesting clipboard read permission. */
export function useImagePaste(enabled: boolean, upload: (files: File[]) => void) {
  useEffect(() => {
    if (!enabled) return
    const paste = (event: ClipboardEvent) => {
      if (event.defaultPrevented || !event.clipboardData) return
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('[role="dialog"], [role="alertdialog"]')) return
      if (target?.closest('input, textarea, [contenteditable="true"]') && event.clipboardData.getData('text/plain')) return
      const files = Array.from(event.clipboardData.files).filter(file => file.type.startsWith('image/'))
      if (!files.length) return
      event.preventDefault()
      upload(files)
    }
    document.addEventListener('paste', paste)
    return () => document.removeEventListener('paste', paste)
  }, [enabled, upload])
}
