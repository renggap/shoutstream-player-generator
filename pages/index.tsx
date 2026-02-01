export { HomePage } from '../components/HomePage';

export default function HomePage() {
  return <HomePage />;
}

export const onBeforeRender = async () => {
  return {
    pageContext: {}
  }
}