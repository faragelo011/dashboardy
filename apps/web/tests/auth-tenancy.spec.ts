import { expect, test } from "@playwright/test";

test("signed-out visitor is redirected away from protected home", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
