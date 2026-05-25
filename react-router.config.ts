import type { Config } from "@react-router/dev/config";
import { cp, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

import { readArticles } from "./app/content/articles.server";

export default {
  basename: "/my_website/",
  ssr: false,
  async prerender() {
    const articles = await readArticles(join(process.cwd(), "content/articles"));
    return ["/", ...articles.map((article) => `/articles/${article.slug}/`)];
  },
  async buildEnd() {
    const clientDirectory = join(process.cwd(), "build/client");
    const prefixedDirectory = join(clientDirectory, "my_website");
    for (const entry of await readdir(prefixedDirectory)) {
      await cp(join(prefixedDirectory, entry), join(clientDirectory, entry), {
        force: true,
        recursive: true
      });
    }
    await rm(prefixedDirectory, { recursive: true, force: true });
  }
} satisfies Config;
