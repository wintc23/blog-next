import { RECOMMENDATION_TITLE } from '@/lib/config'

const LIST = [
  {
    title: '团队内推',
    description: '字节跳动飞书团队前端，Base深圳',
    href: 'https://job.toutiao.com/s/NtLBC4y',
    introduce: [
      '字节跳动飞书团队前端，Base深圳。近期急招，面试通过机会较大。',
      '团队氛围活跃，队友们都很有趣喔~',
    ],
  },
  {
    title: '云服务器',
    description: '阿里云精选特惠',
    href: 'https://www.aliyun.com/minisite/goods?userCode=h55rc1yh',
    introduce: [
      '花100块买台云服务器练手学习，是稳赚不赔的投资！',
      '把作品放到自己的云服务器吧！',
    ],
  },
]

export default function RecommendationPage() {
  return (
    <div>
      <div className="sub-page-header ws">{RECOMMENDATION_TITLE}</div>
      <div className="space-y-3">
        {LIST.map((item) => (
          <a
            key={item.title}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="ws block rounded-sm p-5 hover:shadow-md"
          >
            <div className="text-lg font-bold text-[#333]">{item.title}</div>
            <div className="text-sm text-[#666]">{item.description}</div>
            <div className="mt-2 space-y-1 text-sm text-[#333]">
              {item.introduce.map((t, i) => (
                <div key={i}>{t}</div>
              ))}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
