'use client'

import '@ant-design/v5-patch-for-react-19'
import { ConfigProvider, App as AntdApp } from 'antd'
import { fontSizes, siteColors } from '@/lib/visual-tokens'
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
          fontSize: fontSizes.ui,
          fontSizeSM: fontSizes.meta,
          fontSizeLG: fontSizes.body,
          fontSizeHeading1: fontSizes.heading,
          fontSizeHeading2: fontSizes.title,
          fontSizeHeading3: fontSizes.section,
          fontSizeHeading4: fontSizes.subtitle,
          fontSizeHeading5: fontSizes.body,
          lineHeight: 1.5,
          colorPrimary: siteColors.primary,
          colorLink: siteColors.primary,
          colorLinkHover: siteColors.hover,
          colorLinkActive: siteColors.active,
          borderRadius: 4,
          borderRadiusLG: 4,
          borderRadiusSM: 4,
          borderRadiusXS: 4,
          colorBgLayout: siteColors.background,
          colorBgContainer: siteColors.surface,
          colorBorderSecondary: siteColors.border,
          colorText: siteColors.text,
          colorTextHeading: siteColors.title,
          colorTextTertiary: siteColors.secondary,
          colorTextQuaternary: siteColors.disabled,
          colorBorder: siteColors.border,
          colorTextSecondary: siteColors.secondary,
        },
        components: {
          Input: {
            borderRadius: 4,
            borderRadiusLG: 4,
            borderRadiusSM: 4,
            activeBorderColor: siteColors.primary,
            hoverBorderColor: siteColors.hover,
            activeShadow: 'none',
          },
          Button: {
            borderRadius: 4,
            borderRadiusLG: 4,
            borderRadiusSM: 4,
            primaryShadow: 'none',
          },
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
