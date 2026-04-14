/**
 * Legacy type barrel. Types now live next to their Zod schemas in
 * `lib/schemas/*`. This file only re-exports the entity types for
 * convenience and defines a couple of composite types that aren't
 * directly backed by a single backend endpoint.
 */
export type {
  User,
  UserDetail,
  Comment,
  Message,
  Post,
  PostType,
  Tag,
  Topic,
  Link,
  SiteStatSummary,
  StatReport,
  StatReportRow,
  StatReportSummary,
  LoginResponse,
} from './schemas'

import type {
  Post,
  PostType,
  Tag,
  Topic,
  Link,
  User,
  SiteStatSummary,
} from './schemas'

export interface Paginated<T> {
  list: T[]
  total: number
  page: number
  perPage: number
}

export interface SiteData {
  admin: User | null
  siteStatSummary: SiteStatSummary | null
  topTen: Post[]
  tagList: Tag[]
  topicList: Topic[]
  linkList: Link[]
  postTypes: PostType[]
}
