import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("articles/:slug/", "routes/article.tsx"),
  route("*", "routes/not-found.tsx")
] satisfies RouteConfig;
