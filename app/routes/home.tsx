import { join } from "node:path";
import { useLoaderData } from "react-router";

import { HomePage } from "../components/HomePage";
import { readArticles } from "../content/articles.server";
import { siteConfig } from "../site-config";

export async function loader() {
  return {
    articles: await readArticles(join(process.cwd(), "content/articles")),
    site: siteConfig
  };
}

export default function HomeRoute() {
  const data = useLoaderData<typeof loader>();
  return <HomePage site={data.site} articles={data.articles} />;
}
