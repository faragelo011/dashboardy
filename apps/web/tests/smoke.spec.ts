import { expect, test } from "@playwright/test";

test("unauthenticated user is sent to sign-in from /", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in/);
});

