import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

import stylesheet from "./styles/global.css?url";

export function links() {
  return [{ rel: "stylesheet", href: stylesheet }];
}

export function meta() {
  return [
    { title: "綠屋 | 写作、技术与日常观察" },
    { name: "description", content: "一个安静、极简的个人文章网站。" }
  ];
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
