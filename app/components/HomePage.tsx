import { Link } from "react-router";

import type { Article } from "../content/articles.server";
import type { SiteConfig } from "../site-config";

type HomePageProps = {
  site: SiteConfig;
  articles: Article[];
};

function formatDate(date: string) {
  return date.replaceAll("-", ".");
}

export function HomePage({ site, articles }: HomePageProps) {
  return (
    <main className="home-page">
      <header className="home-intro">
        <p className="home-eyebrow">{site.description}</p>
        <h1>{site.name}</h1>
        <p className="home-bio">{site.bio}</p>
        <nav className="social-links" aria-label="外部链接">
          {site.links.map((link) => (
            <a key={link.href} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              {link.label}
            </a>
          ))}
        </nav>
      </header>

      <section className="writing-list" aria-labelledby="writing-title">
        <div className="section-heading">
          <h2 id="writing-title">文章</h2>
          <span>{articles.length.toString().padStart(2, "0")} 篇</span>
        </div>
        <div className="article-list">
          {articles.map((article) => (
            <article className="article-entry" key={article.slug}>
              <time dateTime={article.date}>{formatDate(article.date)}</time>
              <div>
                <h3>
                  <Link to={`/articles/${article.slug}/`}>{article.title}</Link>
                </h3>
                <p>{article.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
