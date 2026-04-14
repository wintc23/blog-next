'use client'

import { ConfigProvider, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { SWRConfig } from 'swr'
import { StoreProvider } from '@/lib/store'
import type { SiteData, User } from '@/lib/types'
import { Suspense, type ReactNode } from 'react'
import SocketClient from './SocketClient'
import PageViewTracker from './PageViewTracker'

export function Providers({
  siteData,
  initialUser,
  children,
}: {
  siteData: SiteData
  initialUser: User | null
  children: ReactNode
}) {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#2d8cf0',
          borderRadius: 4,
        },
      }}
    >
      <AntdApp>
        <SWRConfig value={{ revalidateOnFocus: false }}>
          <StoreProvider initial={{ user: initialUser, site: siteData }}>
            {children}
            <SocketClient />
            <Suspense fallback={null}>
              <PageViewTracker />
            </Suspense>
          </StoreProvider>
        </SWRConfig>
      </AntdApp>
    </ConfigProvider>
  )
}
