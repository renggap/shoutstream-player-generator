// Placeholder - will be updated in Task 7 with actual PlayerPage component
export default function PlayerPage() {
  return <div>PlayerPage - Coming Soon</div>
}

export const onBeforeRender = async (pageContext: { routeParams: { slug: string } }) => {
  const { slug } = pageContext.routeParams

  // TODO: In Task 7, fetch slug config and metadata here
  return {
    pageContext: {
      pageProps: {
        slug
      }
    }
  }
}