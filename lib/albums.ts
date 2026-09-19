import { z } from 'zod'
import { apiFetch } from './api/client'
import { BASE_URL } from './config'
export const SourceSchema = z.object({ type: z.enum(['photo', 'moment', 'generated', 'media']), id: z.string(), index: z.number().optional() })
export type PhotoSource = z.infer<typeof SourceSchema>
export const PhotoSchema = z.object({ id: z.string(), url: z.string(), name: z.string(), width: z.number(), height: z.number() })
export type AlbumPhoto = z.infer<typeof PhotoSchema>
export const AlbumSchema = z.object({ id: z.string(), title: z.string(), description: z.string(), visibility: z.enum(['private', 'public']), version: z.number(), count: z.number(), editable: z.boolean(), cover: PhotoSchema.nullable(), photos: z.array(PhotoSchema).default([]) })
export type Album = z.infer<typeof AlbumSchema>
export const AlbumsSchema = z.object({ list: z.array(AlbumSchema), total: z.number(), perPage: z.number() })
export const SourcesSchema = z.object({ list: z.array(PhotoSchema.extend({ source: SourceSchema })), total: z.number(), perPage: z.number() })
export const photoUrl = (photo: AlbumPhoto) => /^https?:\/\//.test(photo.url) ? photo.url : `${BASE_URL}${photo.url}`
export const sourceKey = (source: PhotoSource) => `${source.type}:${source.id}:${source.index ?? ''}`
export const addPhotos = (id: string, sources: PhotoSource[]) => apiFetch(`/albums/${id}/photos/`, { method: 'POST', data: { sources }, schema: AlbumSchema })
export async function uploadAlbumPhoto(raw: File, notice: (text: string) => void) {
  const { prepareToolImage } = await import('./prepare-tool-image')
  const file = await prepareToolImage(raw, { maxBytes: 5 * 1024 * 1024, maxPixels: 24_000_000, maxEdge: 12000, processingMaxEdge: 2048 }, notice)
  const grant = await apiFetch('/album-uploads/', { method: 'POST', data: { action: 'authorize', size: file.size, mime: file.type }, schema: z.object({ ticket: z.string(), key: z.string(), token: z.string(), uploadUrl: z.string() }) })
  const form = new FormData(); form.append('key', grant.key); form.append('token', grant.token); form.append('file', file)
  const result = await fetch(grant.uploadUrl, { method: 'POST', body: form })
  if (!result.ok) throw new Error('图片上传失败，请重试')
  return apiFetch('/album-uploads/', { method: 'POST', data: { action: 'complete', ticket: grant.ticket }, schema: PhotoSchema })
}
