import { test, expect } from "@playwright/test";

test("board renders brand", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Docket" })).toBeVisible();
});
