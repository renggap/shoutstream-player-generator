import type { Config } from 'vike/types'
import vikeReact from 'vike-react/config'

export default {
  extends: [vikeReact],
  passToClient: ['pageProps'],
  clientRouting: false,
  // Use vike-react's built-in HTML renderer
  // No need for custom +onRenderHtml when using vike-react
} satisfies Config
