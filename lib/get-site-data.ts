import { getAdminInfo } from './api/users'
import { getSiteStatSummary } from './api/stat'
import { getTagList } from './api/tags'
import { getTopicList } from './api/topics'
import { getBasicLinkList } from './api/links'
import { getTopTen, getPostType } from './api/posts'
import type { SiteData } from './types'

/** Fetches all site-wide data. Called from the root layout on every render. */
export async function getSiteData(): Promise<SiteData> {
  const safe = async <T,>(p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p
    } catch {
      return fallback
    }
  }

  const [admin, siteStatSummary, tags, topTenRes, topics, links, postTypes] =
    await Promise.all([
      safe(getAdminInfo(true), null),
      safe(getSiteStatSummary(true), null),
      safe(getTagList(true), { list: [] as SiteData['tagList'] }),
      safe(getTopTen(true), { list: [] as SiteData['topTen'] }),
      safe(getTopicList(true), { list: [] as SiteData['topicList'] }),
      safe(getBasicLinkList(true), { list: [] as SiteData['linkList'] }),
      safe(getPostType(true), { list: [] as SiteData['postTypes'] }),
    ])

  return {
    admin,
    siteStatSummary,
    tagList: tags.list || [],
    topTen: topTenRes.list || [],
    topicList: topics.list || [],
    linkList: links.list || [],
    postTypes: postTypes.list || [],
  }
}
