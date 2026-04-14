import { SITE } from '@/lib/config'

export default function Footer() {
  return (
    <footer className="shrink-0 py-4 text-center text-sm text-[#666]">
      {SITE.copyright}
      <br />
      <a href="http://beian.miit.gov.cn" target="_blank" rel="nofollow noreferrer">
        滇ICP备18002180号
      </a>
    </footer>
  )
}
