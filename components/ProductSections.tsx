import ArticleContent from '@/components/ArticleContent'
import ProductScreenshotGallery from '@/components/ProductScreenshotGallery'
import TrackedProductLink from '@/components/TrackedProductLink'
import type {
  ProductFeature,
  ProductLink,
  ProductScreenshot,
  ProductSection,
  ProductStep,
} from '@/lib/schemas/product'

interface Props {
  productId: number
  productName: string
  accentColor: string
  sections: ProductSection[]
}

function itemsFrom<T>(section: ProductSection): T[] {
  const items = section.content.items
  return Array.isArray(items) ? (items as T[]) : []
}

function gridClass(layout: string, fallback: string) {
  if (layout === 'columns-4') return 'sm:grid-cols-2 lg:grid-cols-4'
  if (layout === 'columns-3') return 'sm:grid-cols-3'
  if (layout === 'columns-2') return 'sm:grid-cols-2'
  if (layout === 'columns-1') return 'grid-cols-1'
  return fallback
}

function SectionHeading({
  section,
  accentColor,
}: {
  section: ProductSection
  accentColor: string
}) {
  if (!section.title && !section.subtitle) return null
  return (
    <div className="mb-7">
      {section.subtitle && (
        <div
          className="text-sm font-medium uppercase tracking-[0.14em]"
          style={{ color: accentColor }}
        >
          {section.subtitle}
        </div>
      )}
      {section.title && (
        <h2 className={`mb-0 text-2xl text-[#222] ${section.subtitle ? 'mt-2' : 'mt-0'}`}>
          {section.title}
        </h2>
      )}
    </div>
  )
}

function FeatureGrid({ section, accentColor }: { section: ProductSection; accentColor: string }) {
  const items = itemsFrom<ProductFeature>(section)
  if (!items.length) return null
  return (
    <section className="ws rounded-sm p-7 sm:p-10">
      <SectionHeading section={section} accentColor={accentColor} />
      <div className={`grid gap-4 ${gridClass(section.layout, 'sm:grid-cols-2')}`}>
        {items.map((feature, index) => (
          <div key={`${feature.title}-${index}`} className="rounded-lg border border-[#edf0f4] p-5">
            <div
              className="mb-4 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
              style={{ color: accentColor, backgroundColor: `${accentColor}12` }}
            >
              {String(index + 1).padStart(2, '0')}
            </div>
            <h3 className="m-0 text-lg text-[#222]">{feature.title}</h3>
            {feature.description && (
              <p className="mb-0 mt-2 leading-6 text-[#666]">{feature.description}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function Steps({ section, accentColor }: { section: ProductSection; accentColor: string }) {
  const items = itemsFrom<ProductStep>(section)
  if (!items.length) return null
  return (
    <section className="ws rounded-sm p-7 sm:p-10">
      <SectionHeading section={section} accentColor={accentColor} />
      <div className={`grid gap-6 ${gridClass(section.layout, 'sm:grid-cols-3')}`}>
        {items.map((step, index) => (
          <div key={`${step.title}-${index}`}>
            <div className="text-4xl font-bold opacity-20" style={{ color: accentColor }}>
              {String(index + 1).padStart(2, '0')}
            </div>
            <h3 className="mb-0 mt-2 text-lg text-[#222]">{step.title}</h3>
            {step.description && (
              <p className="mb-0 mt-2 leading-6 text-[#666]">{step.description}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function Gallery({
  section,
  productName,
  accentColor,
}: {
  section: ProductSection
  productName: string
  accentColor: string
}) {
  const items = itemsFrom<ProductScreenshot>(section)
  if (!items.length) return null
  return (
    <section className="ws rounded-sm p-7 sm:p-10">
      <ProductScreenshotGallery
        productName={productName}
        accentColor={accentColor}
        screenshots={items}
        title={section.title}
        subtitle={section.subtitle}
      />
    </section>
  )
}

function RichText({ section, accentColor }: { section: ProductSection; accentColor: string }) {
  const html = typeof section.content.html === 'string' ? section.content.html : ''
  if (!html) return null
  return (
    <section className="ws rounded-sm p-7 sm:p-10">
      <SectionHeading section={section} accentColor={accentColor} />
      <ArticleContent html={html} />
    </section>
  )
}

function ImageText({ section, accentColor }: { section: ProductSection; accentColor: string }) {
  const imageUrl = typeof section.content.imageUrl === 'string' ? section.content.imageUrl : ''
  const imageAlt = typeof section.content.imageAlt === 'string' ? section.content.imageAlt : ''
  const html = typeof section.content.html === 'string' ? section.content.html : ''
  const imageRight = section.layout === 'image-right'
  if (!imageUrl && !html) return null
  return (
    <section className="ws overflow-hidden rounded-sm">
      <div className="grid items-center lg:grid-cols-2">
        <div className={`p-7 sm:p-10 ${imageRight ? 'lg:order-1' : 'lg:order-2'}`}>
          <SectionHeading section={section} accentColor={accentColor} />
          {html && <ArticleContent html={html} />}
        </div>
        {imageUrl && (
          <div
            className={`flex min-h-64 items-center justify-center p-6 sm:p-10 ${imageRight ? 'lg:order-2' : 'lg:order-1'}`}
            style={{ backgroundColor: `${accentColor}0a` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={imageAlt} className="max-h-[520px] w-full rounded-lg object-contain shadow-lg" />
          </div>
        )}
      </div>
    </section>
  )
}

function Links({ section, accentColor, productId, productName }: { section: ProductSection; accentColor: string; productId: number; productName: string }) {
  const items = itemsFrom<ProductLink>(section)
  if (!items.length) return null
  return (
    <section className="ws rounded-sm p-7 sm:p-10">
      <SectionHeading section={section} accentColor={accentColor} />
      <div className="flex flex-wrap gap-3">
        {items.map((link, index) => (
          <TrackedProductLink
            key={`${link.url}-${index}`}
            productId={productId}
            productName={productName}
            linkKey={link.analyticsKey || `section-${section.id || section.sort}-link-${index + 1}`}
            label={link.label}
            href={link.url}
            location={`section-${section.id || section.sort}`}
            className={`rounded px-5 py-2.5 font-medium transition hover:opacity-90 ${
              link.primary ? 'text-white' : 'border bg-white text-[#555]'
            }`}
            style={link.primary ? { backgroundColor: accentColor } : undefined}
          >
            {link.label}
          </TrackedProductLink>
        ))}
      </div>
    </section>
  )
}

function Callout({ section, accentColor }: { section: ProductSection; accentColor: string }) {
  const text = typeof section.content.text === 'string' ? section.content.text : ''
  if (!text && !section.title) return null
  return (
    <section
      className="rounded-sm border p-7 sm:p-10"
      style={{ borderColor: `${accentColor}26`, backgroundColor: `${accentColor}0d` }}
    >
      <SectionHeading section={section} accentColor={accentColor} />
      {text && <p className="m-0 text-lg leading-8 text-[#475467]">{text}</p>}
    </section>
  )
}

export default function ProductSections({ productId, productName, accentColor, sections }: Props) {
  const visible = sections
    .filter((section) => section.visible)
    .slice()
    .sort((a, b) => a.sort - b.sort)

  return (
    <>
      {visible.map((section) => {
        const key = section.id || `${section.type}-${section.sort}`
        if (section.type === 'feature_grid') return <FeatureGrid key={key} section={section} accentColor={accentColor} />
        if (section.type === 'steps') return <Steps key={key} section={section} accentColor={accentColor} />
        if (section.type === 'gallery') return <Gallery key={key} section={section} productName={productName} accentColor={accentColor} />
        if (section.type === 'rich_text') return <RichText key={key} section={section} accentColor={accentColor} />
        if (section.type === 'image_text') return <ImageText key={key} section={section} accentColor={accentColor} />
        if (section.type === 'links') return <Links key={key} section={section} accentColor={accentColor} productId={productId} productName={productName} />
        if (section.type === 'callout') return <Callout key={key} section={section} accentColor={accentColor} />
        return null
      })}
    </>
  )
}
