import { z } from 'zod'
import { apiFetch, apiFetchServer } from './client'
import { listEnvelope } from '@/lib/schemas'
import { ProductSchema, type Product } from '@/lib/schemas/product'

const ProductListSchema = listEnvelope(ProductSchema)

export function getProducts(server = false, manage = false) {
  const call = server ? apiFetchServer : apiFetch
  return call('/products/', {
    params: manage ? { manage: 1 } : undefined,
    schema: ProductListSchema,
  })
}

export function getProduct(slug: string, server = false) {
  const call = server ? apiFetchServer : apiFetch
  return call(`/products/${encodeURIComponent(slug)}/`, {
    schema: ProductSchema,
  })
}

export function createProduct(data: Partial<Product>) {
  return apiFetch('/products/', {
    method: 'POST',
    data,
    schema: ProductSchema,
  })
}

export function updateProduct(id: number, data: Partial<Product>) {
  return apiFetch(`/products/${id}/`, {
    method: 'PUT',
    data,
    schema: ProductSchema,
  })
}

export function deleteProduct(id: number) {
  return apiFetch(`/products/${id}/`, {
    method: 'DELETE',
    schema: z.object({ id: z.number(), message: z.string() }),
  })
}
