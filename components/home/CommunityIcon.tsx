import {
  GithubOutlined, LinkedinOutlined, LinkOutlined,
  WeiboOutlined, YoutubeOutlined, ZhihuOutlined,
} from '@ant-design/icons'
import type { ProfileLink } from '@/lib/schemas/personal-profile'

const icons = {
  link: LinkOutlined,
  github: GithubOutlined,
  zhihu: ZhihuOutlined,
  weibo: WeiboOutlined,
  youtube: YoutubeOutlined,
  linkedin: LinkedinOutlined,
}

export default function CommunityIcon({ icon }: { icon: ProfileLink['icon'] }) {
  if (icon === 'sysu' || icon === 'bytedance') {
    return (
      // Official organization artwork, stored locally to avoid third-party requests.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/images/profile/${icon}.png`} alt="" width={28} height={28} />
    )
  }
  const Icon = icons[icon]
  return <Icon aria-hidden />
}
