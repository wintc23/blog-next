import type { Metadata } from 'next'
import './globals.css'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { Providers } from '@/components/Providers'
import AppShell from '@/components/AppShell'
import LoginModal from '@/components/layout/LoginModal'
import UserInfoDrawer from '@/components/layout/UserInfoDrawer'
import { getSiteData } from '@/lib/get-site-data'
import { getCurrentUser } from '@/lib/get-current-user'
import { getSiteIdentity } from '@/lib/get-site-identity'
import { SITE } from '@/lib/config'

export async function generateMetadata(): Promise<Metadata> {
  const identity = await getSiteIdentity()
  return {
    title: [identity.title, identity.slogon].filter(Boolean).join(' - '),
    description: identity.description,
    keywords: identity.keywords,
    icons: { icon: SITE.icon },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [siteData, initialUser] = await Promise.all([
    getSiteData(),
    getCurrentUser(),
  ])

  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <Providers siteData={siteData} initialUser={initialUser}>
            <AppShell>{children}</AppShell>
            <LoginModal />
            <UserInfoDrawer />
          </Providers>
        </AntdRegistry>
      </body>
    </html>
  )
}
