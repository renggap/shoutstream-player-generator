import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("player/:slug", "routes/player.$slug.tsx"),
  route("api/proxy", "routes/api.proxy.ts"),
] satisfies RouteConfig;
