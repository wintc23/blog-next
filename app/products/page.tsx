import type { Metadata } from 'next'
import Link from 'next/link'
import { getProducts } from '@/lib/api/products'
import { SITE } from '@/lib/config'
import type { Product } from '@/lib/schemas/product'

export const metadata: Metadata = {
  title: `作品集 - ${SITE.title}`,
  description: '我设计和开发的一些独立产品。',
}

export const dynamic = 'force-dynamic'

function ProductLogo({ product, large = false }: { product: Product; large?: boolean }) {
  const size = large ? 'h-16 w-16 rounded-2xl' : 'h-12 w-12 rounded-xl'
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
        <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[#666]">
          {product.platform}
        </span>
      )}
      {product.version && (
        <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[#666]">
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

function FeaturedProduct({ product }: { product: Product }) {
  return (
    <article className="ws overflow-hidden rounded-sm">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
          <div className="flex items-center gap-4">
            <ProductLogo product={product} large />
            <div>
              <h2 className="m-0 text-3xl font-bold text-[#222]">{product.name}</h2>
              <div className="mt-2">
                <ProductBadges product={product} />
              </div>
            </div>
          </div>

          {product.tagline && (
            <h3 className="mb-0 mt-7 text-2xl font-semibold leading-tight text-[#222]">
              {product.tagline}
            </h3>
          )}
          {product.summary && (
            <p className="mb-0 mt-4 text-base leading-7 text-[#666]">
              {product.summary}
            </p>
          )}

          {product.highlights.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {product.highlights.map((item) => (
                <span
                  key={item}
                  className="rounded-full px-3 py-1.5 text-sm"
                  style={{
                    color: product.accentColor,
                    backgroundColor: `${product.accentColor}12`,
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          )}

          <div className="mt-8">
            <Link
              href={`/products/${product.slug}`}
              className="inline-flex items-center rounded px-5 py-2.5 font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: product.accentColor }}
            >
              查看产品详情
              <span className="ml-2" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <Link
          href={`/products/${product.slug}`}
          className="relative flex min-h-64 items-center justify-center overflow-hidden bg-[#eef4ff] p-5 sm:p-8"
          style={{ backgroundColor: `${product.accentColor}0d` }}
        >
          {product.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.coverUrl}
              alt={`${product.name} 产品界面`}
              className="w-full rounded-lg shadow-xl transition duration-500 hover:scale-[1.015]"
            />
          ) : (
            <ProductLogo product={product} large />
          )}
        </Link>
      </div>
    </article>
  )
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="ws group block overflow-hidden rounded-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
    >
      {product.coverUrl && (
        <div
          className="aspect-[16/9] overflow-hidden p-4"
          style={{ backgroundColor: `${product.accentColor}0d` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.coverUrl}
            alt={`${product.name} 产品界面`}
            className="h-full w-full rounded object-cover shadow-sm transition duration-500 group-hover:scale-[1.02]"
          />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <ProductLogo product={product} />
          <div className="min-w-0">
            <h2 className="m-0 truncate text-xl font-bold text-[#222]">{product.name}</h2>
            <div className="mt-1"><ProductBadges product={product} /></div>
          </div>
        </div>
        {product.tagline && (
          <div className="mt-5 text-lg font-medium text-[#333]">{product.tagline}</div>
        )}
        {product.summary && (
          <p className="mb-0 mt-2 line-clamp-3 leading-6 text-[#666]">{product.summary}</p>
        )}
      </div>
    </Link>
  )
}

export default async function ProductsPage() {
  const { list } = await getProducts(true)
  const featured = list.find((item) => item.featured) || list[0]
  const others = featured ? list.filter((item) => item.id !== featured.id) : []

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-sm bg-[#101828] text-white shadow-[0_16px_45px_rgba(16,24,40,0.18)]">
        <div
          className="absolute -right-20 -top-32 h-96 w-96 rounded-full bg-[#2d8cf0]/30 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-[#7f56d9]/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 opacity-[0.08]"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative grid items-center gap-8 px-7 py-10 sm:px-12 sm:py-12 lg:grid-cols-[1fr_auto] lg:gap-16">
          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#84c5ff]">
              <span className="h-px w-8 bg-[#5baeff]" />
              Products · Portfolio
            </div>
            <h1 className="m-0 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[42px]">
              作品集
            </h1>
            <p className="mb-0 mt-4 max-w-xl text-base leading-7 text-white/65 sm:text-lg">
              从真实需求出发，把想法做成可以使用、值得持续打磨的作品。
            </p>
          </div>

          <div className="flex items-end justify-between gap-8 border-t border-white/10 pt-6 lg:min-w-[260px] lg:justify-end lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div>
              <div className="font-mono text-5xl font-semibold leading-none tracking-[-0.08em] text-white sm:text-6xl">
                {String(list.length).padStart(2, '0')}
              </div>
              <div className="mt-2 text-xs uppercase tracking-[0.16em] text-white/45">
                Products on show
              </div>
            </div>

            {list.length > 0 && (
              <div className="flex -space-x-2">
                {list.slice(0, 4).map((product) => (
                  <div
                    key={product.id}
                    title={product.name}
                    className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border-2 border-[#101828] bg-white text-sm font-bold text-white shadow-lg"
                    style={{ backgroundColor: product.accentColor }}
                  >
                    {product.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      product.name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {featured ? (
        <>
          <FeaturedProduct product={featured} />
          {others.length > 0 && (
            <section>
              <h2 className="mb-4 mt-8 text-xl text-[#333]">更多作品</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {others.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="ws rounded-sm px-6 py-16 text-center text-[#888]">
          作品正在整理中，稍后再来看看吧。
        </div>
      )}
    </div>
  )
}
