import { test, expect } from "@playwright/test";
test("basic test", async ({ page }) => {
  await page.goto("/");
  expect(true).toBe(true);
});
