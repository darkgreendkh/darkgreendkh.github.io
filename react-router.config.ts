import type { Config } from "@react-router/dev/config";
import { join } from "node:path";

import { readArticles } from "./app/content/articles.server";

export default {
  ssr: false,
  async prerender() {
    const articles = await readArticles(join(process.cwd(), "content/articles"));
    return ["/", ...articles.map((article) => `/articles/${article.slug}/`)];
  }
} satisfies Config;
