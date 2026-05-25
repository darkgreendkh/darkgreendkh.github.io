import { expect, test } from "@playwright/test";

test("homepage leads into a prerendered article reading view", async ({ page }, testInfo) => {
  await page.goto("/my_website/");

  await expect(page.getByRole("heading", { name: "林间书页" })).toBeVisible();
  await expect(page.getByRole("link", { name: "为阅读留一片安静的空间" })).toBeVisible();
  await page.getByRole("link", { name: "为阅读留一片安静的空间" }).click();

  await expect(page).toHaveURL(/\/my_website\/articles\/designing-a-reading-space\/$/);
  await expect(page.getByRole("heading", { name: "为阅读留一片安静的空间", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "从内容开始", level: 2 })).toBeVisible();

  if (testInfo.project.name === "desktop") {
    await expect(page.getByRole("navigation", { name: "文章归档", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "文章大纲", exact: true })).toBeVisible();
  }
});

test("mobile reader exposes archive and outline drawers", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile drawer behavior");
  await page.goto("/my_website/articles/designing-a-reading-space/");

  await page.getByRole("button", { name: "打开文章目录" }).click();
  await expect(page.getByRole("dialog", { name: "文章目录" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "文章目录" })).toBeHidden();

  await page.getByRole("button", { name: "打开文章大纲" }).click();
  await expect(page.getByRole("dialog", { name: "文章大纲" })).toBeVisible();
  await page.getByRole("button", { name: "关闭文章大纲" }).click();
  await expect(page.getByRole("dialog", { name: "文章大纲" })).toBeHidden();
});
