import type { PageContext } from 'vike/types'
import type { ReactNode } from 'react'

export default function Layout({ pageProps, children }: { pageProps: Record<string, unknown>, children: ReactNode }) {
  return (
    <div id="page-view">
      {children}
    </div>
  )
}
