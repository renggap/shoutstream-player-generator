import type { PageContext } from 'vike/types'
import { escapeInject } from 'vike/server'
import vikeReact from 'vike-react'

export function onRenderHtml(pageContext: PageContext) {
  const { Page } = pageContext

  return escapeInject`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ShoutStream Player Generator</title>
      </head>
      <body>
        <div id="react-root">${vikeReact.renderToStream(<Page {...pageProps} />)}</div>
      </body>
    </html>`
}
