import type { PageContext } from 'vike/types'
import { createOnRenderClient } from 'vike-react/config'

export const onRenderClient = createOnRenderClient((pageContext: PageContext) => {
  // vike-react handles hydration automatically
})
