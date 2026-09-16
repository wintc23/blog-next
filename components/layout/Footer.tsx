'use client'

import { SITE } from '@/lib/config'
import { useSite } from '@/lib/store'

export default function Footer() {
  const { personalProfile } = useSite()
  return (
    <footer className="shrink-0 py-4 text-center text-sm text-[#666]">
      {SITE.copyright}{personalProfile?.displayName && ` ${personalProfile.displayName}`}
      <br />
      <a href="http://beian.miit.gov.cn" target="_blank" rel="nofollow noreferrer">
        滇ICP备18002180号
      </a>
    </footer>
  )
}
