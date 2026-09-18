import { apiFetchServer } from '@/lib/api/client'
import { ToolsResult } from '@/lib/image-tools'
import ImageToolCatalog from '@/components/image-tools/Catalog'
import type { Metadata } from 'next'
import { getProducts } from '@/lib/api/products'
import type { Product } from '@/lib/schemas/product'
import { getSiteIdentity } from '@/lib/get-site-identity'
import { shareMetadata } from '@/lib/share-metadata'

export async function generateMetadata(): Promise<Metadata> {
  const identity = await getSiteIdentity()
  return shareMetadata({ title: '探索', description: '使用图片工具，浏览个人作品与项目。', path: '/products', siteName: identity.title })
}

export const dynamic = 'force-dynamic'

function ProductLogo({ product, large = false }: { product: Product; large?: boolean }) {
  const size = large
    ? 'h-12 w-12 shrink-0 rounded sm:h-16 sm:w-16 sm:rounded'
    : 'h-12 w-12 shrink-0 rounded'
  if (product.logoUrl) {
    return (
      // Product logos are managed URLs and may come from different CDNs.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.logoUrl}
        alt={`${product.name} Logo`}
        className={`${size} object-cover shadow-sm`}
      />
    )
  }
  return (
    <div
      className={`${size} flex items-center justify-center text-2xl font-bold text-white shadow-sm`}
      style={{ backgroundColor: product.accentColor }}
    >
      {product.name.slice(0, 1).toUpperCase()}
    </div>
  )
}

function ProductBadges({ product }: { product: Product }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {product.platform && (
        <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[var(--site-text-secondary)]">
          {product.platform}
        </span>
      )}
      {product.version && (
        <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[var(--site-text-secondary)]">
          v{product.version}
        </span>
      )}
      {product.statusLabel && (
        <span className="rounded-full bg-[#19be6b]/[0.10] px-2.5 py-1 text-[#19be6b]">
          {product.statusLabel}
        </span>
      )}
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  return (
    <a
      href={`/products/${product.slug}`}
      aria-label={`查看 ${product.name} 详情`}
      className="ws group block overflow-hidden rounded transition duration-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--site-primary)]"
    >
      {product.coverUrl && (
        <div
          className="aspect-[5/2] overflow-hidden"
          style={{ backgroundColor: `${product.accentColor}0d` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.coverUrl}
            alt={`${product.name} 作品概念封面`}
            className="block h-full w-full object-contain"
          />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <ProductLogo product={product} />
          <div className="min-w-0">
            <h3 className="m-0 truncate text-xl font-bold text-[var(--site-text)]">{product.name}</h3>
            <div className="mt-1"><ProductBadges product={product} /></div>
          </div>
        </div>
        {product.tagline && (
          <div className="mt-5 text-lg font-medium text-[var(--site-text)]">{product.tagline}</div>
        )}
        {product.summary && (
          <p className="mb-0 mt-2 line-clamp-3 leading-6 text-[var(--site-text-secondary)]">{product.summary}</p>
        )}
        <span
          className="mt-5 inline-flex items-center rounded bg-[var(--site-primary)] px-4 py-2 text-sm font-medium text-[var(--site-surface)] transition-colors group-hover:bg-[var(--site-primary-hover)] group-focus-visible:bg-[var(--site-primary-hover)] group-active:bg-[var(--site-primary-active)]"
        >
          查看详情
        </span>
      </div>
    </a>
  )
}

export default async function ProductsPage() {
  const [{ list }, toolData] = await Promise.all([
    getProducts(true),
    apiFetchServer('/image-tools/', { schema: ToolsResult }).catch(() => null),
  ])
  return (
    <div className="space-y-4">
      <header className="mb-6">
        <h1 className="m-0 text-2xl font-medium text-[var(--site-title)]">探索</h1>
      </header>
      <section id="image-tools" aria-label="图片工具" className="scroll-mt-36"><ImageToolCatalog compact initialTools={toolData?.tools} /></section>

      <section id="personal-works" aria-labelledby="products-heading" className="scroll-mt-36">
      <h2 id="products-heading" className="mb-5 mt-0 text-2xl font-medium text-[var(--site-primary)]">个人作品</h2>
      {list.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2">
          {list.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      ) : (
        <div className="ws rounded px-6 py-16 text-center text-[var(--site-text-secondary)]">
          作品正在整理中，稍后再来看看吧。
        </div>
      )}
      </section>
    </div>
  )
}
