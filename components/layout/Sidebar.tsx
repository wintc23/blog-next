'use client'

import Link from 'next/link'
import { EyeOutlined, GithubOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { Tag, Tooltip } from 'antd'
import { usePathname } from 'next/navigation'
import {
  useSite,
  useShowUserDrawer,
  useOutlineItems,
  useHeaderOffset,
} from '@/lib/store'
import { SITE } from '@/lib/config'
import { pseudoRandom, formatCount } from '@/lib/utils'

const HIDE_SIDEBAR_PREFIXES = ['/message', '/about', '/recommendation']

const ALIYUN = {
  href: 'https://www.aliyun.com/minisite/goods?userCode=h55rc1yh',
  title: '阿里云推广',
  text: ['云服务器 精选特惠', '花100块买台云服务器练手学习,是稳赚不赔的投资!'],
  tags: ['新用户享好礼', '云服务器1折起'],
}

// Hex codes drawn from the iView preset colours used by blog-ssr's
// `<Tag :color="...">`. Same eight slots, deterministic random pick via
// `pseudoRandom` keeps each tag's colour stable across renders.
const TAG_COLORS = [
  '#19be6b', // success / green
  '#2d8cf0', // primary / blue
  '#ff9900', // orange
  '#ed4014', // error / red
  '#9b51e0', // purple
  '#ed3f7d', // magenta
  '#1cbbb4', // cyan
  '#f5a623', // gold
]

export default function Sidebar() {
  const site = useSite()
  const showUserDrawer = useShowUserDrawer()
  const outline = useOutlineItems()
  const headerOffset = useHeaderOffset()
  const pathname = usePathname()
  const shouldShow = !HIDE_SIDEBAR_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )
  if (!shouldShow) return null

  const outlineShow = outline.length > 0

  const jumpTo = (id: string) => {
    if (typeof document === 'undefined') return
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const admin = site.admin
  const tags = (site.tagList || [])
    .filter((t) => t.postCount)
    .sort((a, b) => b.postCount - a.postCount)
  const colors: string[] = []
  for (const idx of pseudoRandom(tags.length, TAG_COLORS.length)) {
    colors.push(TAG_COLORS[idx])
  }
  const topTen = site.topTen || []
  const links = site.linkList || []
  const summary = site.siteStatSummary

  return (
    <aside className="modules">
      {admin && (
        <div className="ws mb-[10px] rounded-sm">
          <div className="flex items-center justify-between border-b border-[#eee] px-[15px] py-2 text-[#666]">
            <span>{SITE.title}</span>
            {summary && (
              <Tooltip
                title={`自 ${summary.visitStartDate} 起累计访问 ${summary.visitCount} 次，累计访客 ${summary.visitorCount || 0} 人`}
              >
                <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[rgba(51,97,216,0.08)] px-[10px] py-[2px] text-[12px] leading-[1.4] text-[#3361d8]">
                  <span className="text-[#7f8aa3]">访问</span>
                  <span className="font-semibold">{formatCount(summary.visitCount)}</span>
                  <span className="mx-1 h-3 w-px bg-[rgba(51,97,216,0.18)]" />
                  <span className="text-[#7f8aa3]">访客</span>
                  <span className="font-semibold">{formatCount(summary.visitorCount)}</span>
                </span>
              </Tooltip>
            )}
          </div>
          <div className="px-[15px] pb-5 pt-[10px]">
            <div className="overflow-hidden py-[10px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={admin.avatar}
                alt={admin.username}
                className="float-left mr-[10px] h-[50px] w-[50px] cursor-pointer rounded-full"
                onClick={() => showUserDrawer(admin.id)}
              />
              <div className="overflow-hidden text-[orange]">{admin.username}</div>
              <div className="overflow-hidden py-[5px] text-sm">
                共<span className="text-[#3361d8]">{admin.postCount || 0}</span>篇文章
              </div>
            </div>
            <div className="flex items-center py-1 pl-5 text-[20px]">
              <GithubOutlined />
              <a
                target="_blank"
                rel="noreferrer"
                href={SITE.githubHomePage}
                className="ml-[10px] text-base hover:underline"
              >
                github
              </a>
            </div>
            <div className="flex items-center py-1 pl-5 text-[20px]">
              <EnvironmentOutlined />
              <span className="ml-[10px] text-base">{SITE.location}</span>
            </div>
            {admin.aboutMe && (
              <div className="mt-2 text-sm text-[#666]">{admin.aboutMe}</div>
            )}
          </div>
        </div>
      )}

      {/* Aliyun module is shown on all pages (including article), matching
          blog-ssr which has no `outlineShow` gate on this card. */}
      <div className="ws mb-[10px] rounded-sm">
        <div className="border-b border-[#eee] px-[15px] py-2 text-[#666]">
          <span>{ALIYUN.title}</span>
          <a
            href={ALIYUN.href}
            target="_blank"
            rel="noreferrer"
            className="float-right text-sm hover:underline"
          >
            [了解详情]
          </a>
        </div>
        <a
          href={ALIYUN.href}
          target="_blank"
          rel="noreferrer"
          className="block px-[15px] pb-5 pt-[10px] text-[#333]"
        >
          {ALIYUN.text.map((t, i) => (
            <div
              key={i}
              className={
                i === 0
                  ? 'mb-[15px] mt-[5px] text-[15px]'
                  : 'mb-[15px] mt-[5px] text-sm text-[#FF2121]'
              }
            >
              {t}
            </div>
          ))}
          <div className="mt-2 flex flex-wrap gap-1">
            {ALIYUN.tags.map((tag) => (
              <Tag key={tag} color="geekblue">
                {tag}
              </Tag>
            ))}
          </div>
        </a>
      </div>

      {!outlineShow && topTen.length > 0 && (
        <div className="ws mb-[10px] rounded-sm">
          <div className="border-b border-[#eee] px-[15px] py-2 text-[#666]">
            热门文章
          </div>
          <div className="px-[15px] pb-5 pt-[10px]">
            {topTen.map((post, i) => (
              <div
                key={post.id}
                className={`flex items-start justify-between gap-2 ${i ? 'mt-[10px]' : ''}`}
              >
                <Link
                  href={`/article/${post.id}`}
                  title={post.title}
                  className="min-w-0 flex-1 truncate text-[#333] hover:text-[#4791ff] hover:underline"
                >
                  {post.title}
                </Link>
                <span
                  className="shrink-0 whitespace-nowrap text-sm text-[#999]"
                  title={`${post.readTimes}次浏览`}
                >
                  <EyeOutlined className="mr-[5px]" />
                  {post.readTimes}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!outlineShow && tags.length > 0 && (
        <div className="ws mb-[10px] rounded-sm">
          <div className="border-b border-[#eee] px-[15px] py-2 text-[#666]">
            文章标签
          </div>
          <div className="flex flex-wrap justify-around px-[15px] pb-5 pt-[10px]">
            {tags.map((tag, idx) => (
              <Link
                key={tag.id}
                href={`/tag/${tag.id}`}
                title={`${tag.title}(${tag.postCount})`}
                style={{ borderColor: colors[idx], color: colors[idx] }}
                className="mb-[5px] flex w-[120px] items-center justify-center rounded border bg-white px-2 py-[2px] text-center text-[12px] leading-5 hover:opacity-80"
              >
                <span className="truncate">{tag.title}</span>
                <span className="ml-[2px] shrink-0">({tag.postCount})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!outlineShow && links.length > 0 && (
        <div className="ws mb-[10px] rounded-sm">
          <div className="border-b border-[#eee] px-[15px] py-2 text-[#666]">
            <span>友链</span>
            <Link href="/link" className="float-right text-sm hover:underline">
              [详情]
            </Link>
          </div>
          <div className="flex flex-wrap gap-[5px] px-[15px] pb-5 pt-[10px]">
            {links.map((link) => (
              <a
                key={link.id}
                target="_blank"
                rel="noreferrer"
                href={link.link}
                className="rounded bg-black/5 px-2 py-[2px] text-sm text-[#333] hover:bg-black/10"
              >
                {link.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Outline module comes LAST (matches blog-ssr ordering). It's sticky,
          so when the user scrolls past the admin/aliyun modules it stays
          visible. `top` is dynamic so it slides up with the hide-on-scroll
          header. */}
      {outlineShow && (
        <div
          className="ws mb-3 sticky rounded-sm transition-[top] duration-500"
          style={{ top: headerOffset + 5 }}
        >
          <div className="border-b border-[#eee] px-[15px] py-2 text-[#666]">
            目录
          </div>
          <div className="scroll-thin max-h-[70vh] overflow-auto px-[15px] pb-5 pt-[10px]">
            {outline.map((item) => (
              <div
                key={item.id}
                onClick={() => jumpTo(item.id)}
                style={{ paddingLeft: (item.level - 1) * 12 }}
                className="cursor-pointer select-none truncate py-1 text-sm text-[#333] hover:text-[#4791ff] hover:underline"
                title={item.title}
              >
                {item.title}
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
