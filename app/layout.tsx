import type { Metadata } from 'next'
import './globals.css'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { Providers } from '@/components/Providers'
import AppShell from '@/components/AppShell'
import LoginModal from '@/components/layout/LoginModal'
import UserInfoDrawer from '@/components/layout/UserInfoDrawer'
import { getSiteData } from '@/lib/get-site-data'
import { getCurrentUser } from '@/lib/get-current-user'
import { getPersonalProfile } from '@/lib/api/personal-profile'
import { SITE } from '@/lib/config'

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getPersonalProfile(true).catch(() => null)
  return {
    title: `${SITE.title} - ${SITE.slogon}`,
    description: SITE.description,
    keywords: [SITE.keywords, profile?.displayName].filter(Boolean).join(','),
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
