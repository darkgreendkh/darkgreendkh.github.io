import { expect, test } from "@playwright/test";

test("homepage leads into a prerendered article reading view", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "绿屋" })).toBeVisible();
  await expect(page.getByRole("link", { name: "为阅读留一片安静的空间" })).toBeVisible();
  await page.getByRole("link", { name: "为阅读留一片安静的空间" }).click();

  await expect(page).toHaveURL(/\/articles\/designing-a-reading-space\/$/);
  await expect(page.getByRole("heading", { name: "为阅读留一片安静的空间", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "从内容开始", level: 2 })).toBeVisible();

  if (testInfo.project.name === "desktop") {
    await expect(page.getByRole("navigation", { name: "文章归档", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "文章大纲", exact: true })).toBeVisible();
  }
});

test("desktop reader sidebars resize and persist their widths", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop resize behavior");
  await page.goto("/articles/designing-a-reading-space/");

  const article = page.getByRole("article");
  const leftSidebar = page.locator(".reader-sidebar-left");
  const rightSidebar = page.locator(".reader-sidebar-right");
  const leftHandle = page.getByRole("separator", { name: "调整文章归档宽度" });
  const rightHandle = page.getByRole("separator", { name: "调整文章大纲宽度" });

  await expect(article).toBeVisible();
  await expect(leftHandle).toBeVisible();
  await expect(rightHandle).toBeVisible();

  const initialLeftWidth = (await leftSidebar.boundingBox())?.width ?? 0;
  const initialRightWidth = (await rightSidebar.boundingBox())?.width ?? 0;
  const leftHandleBox = await leftHandle.boundingBox();
  const rightHandleBox = await rightHandle.boundingBox();

  expect(initialLeftWidth).toBeGreaterThan(0);
  expect(initialRightWidth).toBeGreaterThan(0);
  expect(leftHandleBox).not.toBeNull();
  expect(rightHandleBox).not.toBeNull();

  await page.mouse.move(leftHandleBox!.x + leftHandleBox!.width / 2, leftHandleBox!.y + leftHandleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(leftHandleBox!.x + leftHandleBox!.width / 2 + 80, leftHandleBox!.y + leftHandleBox!.height / 2);
  await page.mouse.up();

  await page.mouse.move(rightHandleBox!.x + rightHandleBox!.width / 2, rightHandleBox!.y + rightHandleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(rightHandleBox!.x + rightHandleBox!.width / 2 - 60, rightHandleBox!.y + rightHandleBox!.height / 2);
  await page.mouse.up();

  const resizedLeftWidth = (await leftSidebar.boundingBox())?.width ?? 0;
  const resizedRightWidth = (await rightSidebar.boundingBox())?.width ?? 0;

  expect(resizedLeftWidth).toBeGreaterThan(initialLeftWidth + 40);
  expect(resizedRightWidth).toBeGreaterThan(initialRightWidth + 30);
  await expect(article).toBeVisible();

  await page.reload();

  const persistedLeftWidth = (await leftSidebar.boundingBox())?.width ?? 0;
  const persistedRightWidth = (await rightSidebar.boundingBox())?.width ?? 0;

  expect(Math.abs(persistedLeftWidth - resizedLeftWidth)).toBeLessThan(2);
  expect(Math.abs(persistedRightWidth - resizedRightWidth)).toBeLessThan(2);
  await expect(article).toBeVisible();
});

test("mobile reader exposes archive and outline drawers", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile drawer behavior");
  await page.goto("/articles/designing-a-reading-space/");

  await expect(page.getByRole("separator", { name: "调整文章归档宽度" })).toBeHidden();
  await expect(page.getByRole("separator", { name: "调整文章大纲宽度" })).toBeHidden();

  await page.getByRole("button", { name: "打开文章目录" }).click();
  await expect(page.getByRole("dialog", { name: "文章目录" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "文章目录" })).toBeHidden();

  await page.getByRole("button", { name: "打开文章大纲" }).click();
  await expect(page.getByRole("dialog", { name: "文章大纲" })).toBeVisible();
  await page.getByRole("button", { name: "关闭文章大纲" }).click();
  await expect(page.getByRole("dialog", { name: "文章大纲" })).toBeHidden();
});
