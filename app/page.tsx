import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getProducts } from '@/lib/api/products'
import { getPersonalProfile } from '@/lib/api/personal-profile'
import type { Metadata } from 'next'
import { getSiteIdentity } from '@/lib/get-site-identity'
import { formatSiteTitle } from '@/lib/site-identity'
import styles from '@/components/home/Home.module.css'
import HomeProfile from '@/components/home/HomeProfile'
import ProductCarousel from '@/components/home/ProductCarousel'
import HomeAiNews from '@/components/home/HomeAiNews'
import ImageToolCatalog from '@/components/image-tools/Catalog'
import { getAiNewsHome } from '@/lib/api/ai-news'
import { getLifeMoments } from '@/lib/api/life-moments'
import { shareMetadata } from '@/lib/share-metadata'

export async function generateMetadata(): Promise<Metadata> {
  const identity = await getSiteIdentity()
  return {
    ...shareMetadata({ title: '个人主页', description: '个人作品、AI 应用、技术笔记与日常记录。', path: '/', siteName: identity.title }),
    // A root page does not inherit its own segment's title template.
    title: { absolute: formatSiteTitle('个人主页', identity.title) },
    description: '个人作品、AI 应用、技术笔记与日常记录。',
  }
}

export const dynamic = 'force-dynamic'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  // Preserve bookmarks to the old blog pagination.
  if (page) redirect(`/article?page=${encodeURIComponent(page)}`)

  const [products, profile, moments, news] = await Promise.all([
    getProducts(true),
    getPersonalProfile(true),
    getLifeMoments(1, 2, true),
    getAiNewsHome().catch((error) => {
      console.error('Unable to load homepage AI news:', error instanceof Error ? error.message : 'Unknown error')
      return null
    }),
  ])
  const latestProducts = [...products.list]
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0) || b.id - a.id)
    .slice(0, 5)
    .map(({ id, name, slug, tagline, summary, platform, statusLabel, logoUrl, coverUrl, highlights }) => ({
      id, name, slug, tagline, summary, platform, statusLabel, logoUrl, coverUrl, highlights,
    }))

  return (
    <div className={styles.home}>
      <HomeProfile profile={profile} moments={moments.list} />
      <div className={styles.discoveryColumns}>
        <ImageToolCatalog column />
        <section aria-labelledby="work-title">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="work-title">个人作品</h2>
            </div>
            <Link href="/products" className={styles.textLink}>
              全部作品
            </Link>
          </div>
          {profile.portfolioIntroduction && <p className={styles.sectionIntroduction}>{profile.portfolioIntroduction}</p>}
          <ProductCarousel products={latestProducts} />
        </section>
      </div>
      {news && <HomeAiNews data={news} />}
    </div>
  )
}
