import { Link } from "react-router";

export function meta() {
  return [{ title: "页面未找到 | 林间书页" }];
}

export default function NotFoundRoute() {
  return (
    <main className="not-found">
      <p>404</p>
      <h1>页面没有找到</h1>
      <span>这里没有可阅读的内容。</span>
      <Link to="/">返回文章列表</Link>
    </main>
  );
}
