export type SiteConfig = {
  name: string;
  description: string;
  bio: string;
  links: Array<{ label: string; href: string }>;
};

export const siteConfig: SiteConfig = {
  name: "绿屋",
  description: "写作、技术与日常观察",
  bio: "在这里整理我写过的文章，记录值得反复阅读的想法与实践。",
  links: [
    { label: "GitHub", href: "https://github.com/" },
    { label: "Email", href: "mailto:hello@example.com" }
  ]
};
