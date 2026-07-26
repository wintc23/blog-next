import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProductSections from '@/components/ProductSections'
import { getProduct } from '@/lib/api/products'
import { ApiError } from '@/lib/api/client'
import { SITE } from '@/lib/config'

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
  const product = await loadProduct(slug)
  return {
    title: `${product.name} - 产品 - ${SITE.title}`,
    description: product.summary || product.tagline || SITE.description,
    openGraph: product.coverUrl ? { images: [product.coverUrl] } : undefined,
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const product = await loadProduct(slug)
  const accent = product.accentColor || '#2d8cf0'

  return (
    <div className="space-y-4">
      <section className="ws overflow-hidden rounded-sm">
        <div className="flex items-center gap-2 border-b border-[#edf0f4] px-5 py-3.5 text-sm sm:px-8">
          <Link
            href="/products"
            className="group inline-flex items-center gap-2 font-medium text-[#667085] transition hover:text-[#222]"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f2f4f7] text-[#667085] transition group-hover:-translate-x-0.5 group-hover:bg-[#e9edf2] group-hover:text-[#222]"
              aria-hidden="true"
            >
              ←
            </span>
            作品集
          </Link>
          <span className="text-[#d0d5dd]" aria-hidden="true">/</span>
          <span className="truncate text-[#98a2b3]">{product.name}</span>
        </div>
        <div
          className="grid lg:grid-cols-[0.85fr_1.15fr]"
          style={{ background: `linear-gradient(135deg, #fff 45%, ${accent}0d)` }}
        >
          <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
            <div className="flex items-center gap-4">
              {product.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.logoUrl} alt="" className="h-16 w-16 rounded-2xl shadow-sm" />
              ) : (
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {product.name.slice(0, 1)}
                </div>
              )}
              <div>
                <h1 className="m-0 text-4xl font-bold text-[#222]">{product.name}</h1>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#666]">
                  {product.platform && <span>{product.platform}</span>}
                  {product.version && <span>· v{product.version}</span>}
                  {product.statusLabel && <span>· {product.statusLabel}</span>}
                </div>
              </div>
            </div>

            {product.tagline && (
              <h2 className="mb-0 mt-8 text-2xl font-semibold text-[#222]">{product.tagline}</h2>
            )}
            {product.summary && (
              <p className="mb-0 mt-4 text-base leading-7 text-[#666]">{product.summary}</p>
            )}

            {product.links.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {product.links.map((link) => (
                  <a
                    key={`${link.label}-${link.url}`}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`rounded px-5 py-2.5 font-medium transition hover:opacity-90 ${
                      link.primary ? 'text-white' : 'border bg-white text-[#555]'
                    }`}
                    style={link.primary ? { backgroundColor: accent } : undefined}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="flex min-h-72 items-center justify-center p-5 sm:p-8 lg:p-10">
            {product.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.coverUrl}
                alt={`${product.name} 产品界面`}
                className="w-full rounded-lg shadow-xl"
              />
            )}
          </div>
        </div>
      </section>
      <ProductSections
        productName={product.name}
        accentColor={accent}
        sections={product.sections}
      />
    </div>
  )
}
