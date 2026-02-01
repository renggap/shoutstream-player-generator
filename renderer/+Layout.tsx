import type { ReactNode } from 'react'

interface LayoutProps {
  pageProps: Record<string, unknown>
  children: ReactNode
}

export default function Layout({ pageProps, children }: LayoutProps) {
  return (
    <div id="page-view">
      {children}
    </div>
  )
}
