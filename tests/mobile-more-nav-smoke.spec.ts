import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("mobile More opens Saved boards", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("mobile-more-nav")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("mobile-more-nav").click();
  await expect(page.getByRole("dialog", { name: "More" })).toBeVisible();
  // Guest path may show Saved in primary bar instead; still offer Account etc.
  const saved = page.getByRole("button", { name: /Saved/i }).first();
  if (await saved.isVisible().catch(() => false)) {
    await saved.click();
  } else {
    await page.getByRole("button", { name: /Saved boards/i }).click();
  }
  await expect(page).toHaveURL(/\/collections/);
});
