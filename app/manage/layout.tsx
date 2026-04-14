import ManageLayoutClient from './ManageLayoutClient'

export const dynamic = 'force-dynamic'

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  return <ManageLayoutClient>{children}</ManageLayoutClient>
}
