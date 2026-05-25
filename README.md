# 林间书页

一个使用 React Router + Vite 构建的静态个人文章网站，页面以暖色、低干扰的阅读体验为主，并可发布到 GitHub Pages。

## 本地运行

```bash
npm install
npm run dev
```

生产验证命令：

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
```

## 替换个人信息

编辑 `app/site-config.ts` 中的站点名称、简介和外部链接。首页及文章阅读页会自动使用同一份配置。

## 发布文章

在 `content/articles/` 下新建 Markdown 文件，文件名即文章 URL 中的 slug：

```md
---
title: 文章标题
date: 2026-05-25
summary: 显示在文章列表中的摘要。
---

## 第一节

文章正文。
```

- `date` 必须为 `YYYY-MM-DD`。
- 添加 `draft: true` 可保留草稿但不发布。
- `##` 与 `###` 标题会自动生成右侧文章大纲。
- 支持图片、链接、引用、列表及带语法高亮的代码块。

## GitHub Pages

该站点当前按项目仓库 `darkgreendkh/my_website` 部署，发布地址为 `https://darkgreendkh.github.io/my_website/`。推送至 `main` 后，`.github/workflows/deploy-pages.yml` 会测试、构建并发布 `build/client` 的静态页面。

在仓库 `Settings -> Pages` 中将发布源设置为 **GitHub Actions**。如果以后绑定独立域名，需将 `vite.config.ts` 与 `react-router.config.ts` 的站点基路径改回根路径 `/`。
