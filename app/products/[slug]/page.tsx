import type { Metadata } from 'next'
import BackLink from '@/components/BackLink'
import { notFound } from 'next/navigation'
import ProductSections from '@/components/ProductSections'
import TrackedProductLink from '@/components/TrackedProductLink'
import { getProduct } from '@/lib/api/products'
import { ApiError } from '@/lib/api/client'
import { getSiteIdentity } from '@/lib/get-site-identity'
import { shareMetadata } from '@/lib/share-metadata'

type Props = { params: Promise<{ slug: string }> }

async function loadProduct(slug: string) {
  try {
    return await getProduct(slug, true)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [product, identity] = await Promise.all([loadProduct(slug), getSiteIdentity()])
  return shareMetadata({
    title: `${product.name.trim()} - 个人作品`,
    description: product.summary || product.tagline || identity.description,
    path: `/products/${encodeURIComponent(slug)}`, siteName: identity.title,
    image: product.coverUrl ? { url: product.coverUrl, alt: product.name } : undefined,
  })
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const product = await loadProduct(slug)
  const accent = product.accentColor || '#2d8cf0'
  const primaryLinkIndex = Math.max(0, product.links.findIndex((link) => link.primary))
  const primaryLink = product.links[primaryLinkIndex]

  return (
    <div className="space-y-4">
      <section className="ws overflow-hidden rounded-sm">
        <div className="flex items-center gap-2 border-b border-[var(--site-bg)] px-5 py-3.5 text-sm sm:px-8">
          <BackLink href="/products">返回个人作品</BackLink>
          <span className="text-[var(--site-border)]" aria-hidden="true">/</span>
          <span className="truncate text-[var(--site-text-secondary)]">{product.name}</span>
        </div>
        <div
          className="grid lg:grid-cols-2"
          style={{ background: `linear-gradient(135deg, #fff 45%, ${accent}0d)` }}
        >
          <div className="flex min-w-0 flex-col justify-center p-6 sm:p-10 lg:p-12">
            <div className="flex items-center gap-3 sm:gap-4">
              {product.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl shadow-sm sm:h-16 sm:w-16 sm:rounded-2xl" />
              ) : (
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl font-bold text-white sm:h-16 sm:w-16 sm:rounded-2xl"
                  style={{ backgroundColor: accent }}
                >
                  {product.name.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="m-0 break-words text-2xl font-bold text-[var(--site-text)] sm:text-3xl">{product.name}</h1>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--site-text-secondary)]">
                  {product.platform && <span>{product.platform}</span>}
                  {product.version && <span>· v{product.version}</span>}
                  {product.statusLabel && <span>· {product.statusLabel}</span>}
                </div>
              </div>
            </div>

            {product.tagline && (
              <h2 className="mb-0 mt-8 text-2xl font-semibold text-[var(--site-text)]">{product.tagline}</h2>
            )}
            {product.summary && (
              <p className="mb-0 mt-4 text-base leading-7 text-[var(--site-text-secondary)]">{product.summary}</p>
            )}

            {primaryLink && (
              <nav aria-label="作品相关链接" className="mt-7 flex flex-col items-start gap-2">
                <TrackedProductLink
                  productId={product.id}
                  productName={product.name}
                  linkKey={primaryLink.analyticsKey || `link-${primaryLinkIndex + 1}`}
                  label={primaryLink.label}
                  href={primaryLink.url}
                  location="hero"
                  className="inline-flex min-h-11 max-w-full items-center justify-center rounded bg-[var(--site-primary)] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--site-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--site-primary)]"
                >
                  <span className="min-w-0 break-words">{primaryLink.label}</span>
                </TrackedProductLink>
                {product.links.length > 1 && (
                  <div className="flex max-w-full flex-wrap gap-x-6 gap-y-1">
                    {product.links.map((link, index) => index !== primaryLinkIndex && (
                      <TrackedProductLink
                        key={`${link.label}-${link.url}`}
                        productId={product.id}
                        productName={product.name}
                        linkKey={link.analyticsKey || `link-${index + 1}`}
                        label={link.label}
                        href={link.url}
                        location="hero"
                        className="inline-flex min-h-11 max-w-full items-center rounded-sm text-sm text-[var(--site-text-secondary)] underline-offset-4 transition-colors hover:text-[var(--site-text)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--site-primary)]"
                      >
                        <span className="min-w-0 break-words">{link.label}</span>
                      </TrackedProductLink>
                    ))}
                  </div>
                )}
              </nav>
            )}
          </div>

          <div className="flex min-h-72 items-center justify-center p-5 sm:p-8 lg:p-10">
            {product.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.coverUrl}
                alt={`${product.name} 作品概念封面`}
                className="block aspect-[5/2] w-full rounded-lg object-contain shadow-xl"
              />
            )}
          </div>
        </div>
      </section>
      <ProductSections
        productId={product.id}
        productName={product.name}
        accentColor={accent}
        sections={product.sections}
      />
    </div>
  )
}
