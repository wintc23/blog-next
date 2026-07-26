import { z } from 'zod'

export const ProductFeatureSchema = z.object({
  title: z.string(),
  description: z.string().default(''),
})

export const ProductStepSchema = z.object({
  title: z.string(),
  description: z.string().default(''),
})

export const ProductScreenshotSchema = z.object({
  type: z.enum(['image', 'video']).default('image'),
  url: z.string(),
  alt: z.string().default(''),
  caption: z.string().default(''),
  poster: z.string().default(''),
})

export const ProductLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
  primary: z.boolean().default(false),
})

export const ProductSectionSchema = z.object({
  id: z.number().default(0),
  productId: z.number().nullish(),
  type: z.string(),
  title: z.string().nullish(),
  subtitle: z.string().nullish(),
  layout: z.string().default('default'),
  content: z.record(z.string(), z.unknown()).default({}),
  visible: z.boolean().default(true),
  sort: z.number().default(0),
  createdAt: z.number().nullish(),
  updatedAt: z.number().nullish(),
})

export const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  tagline: z.string().nullish(),
  summary: z.string().nullish(),
  platform: z.string().nullish(),
  version: z.string().nullish(),
  status: z.string().default('developing'),
  statusLabel: z.string().nullish(),
  logoUrl: z.string().nullish(),
  coverUrl: z.string().nullish(),
  accentColor: z.string().default('#2d8cf0'),
  highlights: z.array(z.string()).default([]),
  features: z.array(ProductFeatureSchema).default([]),
  steps: z.array(ProductStepSchema).default([]),
  screenshots: z.array(ProductScreenshotSchema).default([]),
  links: z.array(ProductLinkSchema).default([]),
  storyHtml: z.string().nullish(),
  sections: z.array(ProductSectionSchema).default([]),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  sort: z.number().default(0),
  createdAt: z.number().nullish(),
  updatedAt: z.number().nullish(),
})

export type Product = z.infer<typeof ProductSchema>
export type ProductFeature = z.infer<typeof ProductFeatureSchema>
export type ProductStep = z.infer<typeof ProductStepSchema>
export type ProductScreenshot = z.infer<typeof ProductScreenshotSchema>
export type ProductLink = z.infer<typeof ProductLinkSchema>
export type ProductSection = z.infer<typeof ProductSectionSchema>
