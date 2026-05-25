import { join } from "node:path";
import { data, isRouteErrorResponse, Link, useLoaderData, useRouteError } from "react-router";

import { ReaderWorkspace } from "../components/ReaderWorkspace";
import { buildArchive, readArticles } from "../content/articles.server";
import { siteConfig } from "../site-config";

export async function loader({ params }: { params: { slug?: string } }) {
  const articles = await readArticles(join(process.cwd(), "content/articles"));
  const article = articles.find((entry) => entry.slug === params.slug);
  if (!article) {
    throw data(null, { status: 404 });
  }
  return {
    site: siteConfig,
    article,
    archive: buildArchive(articles)
  };
}

export function meta({ data: loaderData }: { data?: Awaited<ReturnType<typeof loader>> }) {
  if (!loaderData) {
    return [{ title: `文章未找到 | ${siteConfig.name}` }];
  }
  return [
    { title: `${loaderData.article.title} | ${siteConfig.name}` },
    { name: "description", content: loaderData.article.summary }
  ];
}

export default function ArticleRoute() {
  const routeData = useLoaderData<typeof loader>();
  return <ReaderWorkspace {...routeData} />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <main className="not-found">
        <p>404</p>
        <h1>这篇文章不存在</h1>
        <Link to="/">返回文章列表</Link>
      </main>
    );
  }
  throw error;
}
