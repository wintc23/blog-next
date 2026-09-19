/** Extract only fields used by the composer. Values stay in browser memory until explicitly applied. */
export type PhotoMetadata = { takenAt?: string; timeNote?: string; location?: string; latitude?: number; longitude?: number }
const text = (value: unknown) => typeof value === 'string' ? value.replace(/\0/g, '').trim() : ''

export function normalizePhotoMetadata(tags: Record<string, unknown>): PhotoMetadata {
  const result: PhotoMetadata = {}
  const original = text(tags.DateTimeOriginal), raw = original || text(tags.CreateDate)
  const parts = /^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.exec(raw)
  if (parts) {
    const [year, month, day, hour, minute, second] = parts.slice(1, 7).map(Number)
    const date = new Date(0); date.setUTCFullYear(year, month - 1, day); date.setUTCHours(hour, minute, second, 0)
    if (year >= 1000 && month >= 1 && month <= 12 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day && hour < 24 && minute < 60 && second < 60) {
      const offset = parts[7] || text(original ? tags.OffsetTimeOriginal : tags.OffsetTimeDigitized)
      const offsetMatch = /^([+-])(\d{2}):(\d{2})$/.exec(offset)
      const minutes = offsetMatch ? Number(offsetMatch[2]) * 60 + Number(offsetMatch[3]) : 0
      const knownZone = offset === 'Z' || !!(offsetMatch && Number(offsetMatch[3]) < 60 && minutes <= 840)
      if (knownZone) date.setTime(date.getTime() + (480 - (offsetMatch?.[1] === '-' ? -minutes : minutes)) * 60000)
      result.takenAt = date.toISOString().slice(0, 16)
      result.timeNote = knownZone ? '已换算为北京时间' : '照片未记录时区，按北京时间填入'
    }
  }
  const coordinate = (value: unknown, ref: unknown, limit: number) => {
    if (!Array.isArray(value) || value.length !== 3 || !value.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0) || value[1] >= 60 || value[2] >= 60) return undefined
    const direction = text(ref).toUpperCase()
    if (!(limit === 90 ? ['N', 'S'] : ['E', 'W']).includes(direction)) return undefined
    const number = value[0] + value[1] / 60 + value[2] / 3600
    return number <= limit ? number * (['S', 'W'].includes(direction) ? -1 : 1) : undefined
  }
  const latitude = coordinate(tags.GPSLatitude, tags.GPSLatitudeRef, 90), longitude = coordinate(tags.GPSLongitude, tags.GPSLongitudeRef, 180)
  const place = [...new Set(['Country', 'CountryName', 'State', 'ProvinceState', 'City', 'Location', 'Sublocation'].map(key => text(tags[key])).filter(Boolean))].join(' · ').slice(0, 60)
  if (latitude !== undefined && longitude !== undefined) {
    result.latitude = latitude; result.longitude = longitude
    result.location = `${latitude < 0 ? '南纬' : '北纬'} ${Math.abs(latitude).toFixed(5)}°，${longitude < 0 ? '西经' : '东经'} ${Math.abs(longitude).toFixed(5)}°`
  }
  if (place) result.location = place
  return result
}

export async function readPhotoMetadata(file: File): Promise<PhotoMetadata> {
  try {
    const { parse } = await import('exifr')
    const tags = await parse(file, { reviveValues: false, translateValues: false, xmp: true, iptc: true, icc: false,
      pick: ['DateTimeOriginal', 'CreateDate', 'OffsetTimeOriginal', 'OffsetTimeDigitized', 'GPSLatitude', 'GPSLatitudeRef', 'GPSLongitude', 'GPSLongitudeRef', 'Country', 'CountryName', 'State', 'ProvinceState', 'City', 'Location', 'Sublocation'] })
    return tags && typeof tags === 'object' ? normalizePhotoMetadata(tags) : {}
  } catch { return {} } // Missing/unsupported metadata must never block image upload.
}
