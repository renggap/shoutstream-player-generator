export { PlayerPage } from '../../components/PlayerPage';

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