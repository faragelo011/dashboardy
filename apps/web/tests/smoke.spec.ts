import { expect, test } from "@playwright/test";

test("public /about page loads without auth redirect", async ({ page }) => {
  await page.goto("/about");
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
});

