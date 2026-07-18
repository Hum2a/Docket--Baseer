import { test, expect } from "@playwright/test";

test("login page renders brand", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Docket" })).toBeVisible();
  await expect(page.getByPlaceholder("Email")).toBeVisible();
});
