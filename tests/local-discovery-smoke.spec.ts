import { expect, test } from "@playwright/test";

/**
 * Epic L local discovery UI smoke (demo mode — client ranking + city directory).
 */
test.describe("local discovery shops UI", () => {
  test("shops page shows search, location CTA, and seed shops", async ({ page }) => {
    await page.goto("/stores");
    await expect(page.getByRole("heading", { name: /Local shops near you/i })).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole("textbox", { name: /ZIP or city/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Find shops/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Use my location|Refresh location|Locating/i }).first()).toBeVisible();

    await expect(page.locator(".store-card").filter({ hasText: /Canopy Canvas|Thread|Bookshop/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("ZIP search keeps page usable", async ({ page }) => {
    await page.goto("/stores");
    await page.getByRole("textbox", { name: /ZIP or city/i }).fill("97205");
    await page.getByRole("button", { name: /Find shops/i }).click();
    await expect(page.getByRole("heading", { name: /Local shops near you/i })).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
  });

  test("unrecognized place shows coaching empty state", async ({ page }) => {
    await page.goto("/stores");
    await page.getByRole("textbox", { name: /ZIP or city/i }).fill("xyz");
    await page.getByRole("button", { name: /Find shops/i }).click();
    await expect(page.getByText(/couldn't place that search|Try a nearby city or ZIP/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: /Browse online shops|Try a city or ZIP/i }).first()).toBeVisible();
  });

  test("city directory or browse remains interactive", async ({ page }) => {
    await page.goto("/stores");
    const cityBtn = page.locator("button").filter({ hasText: /Portland|Austin|Charleston/i }).first();
    if ((await cityBtn.count()) > 0) {
      await cityBtn.click();
      await expect(page.locator("main")).toBeVisible();
    } else {
      await expect(page.getByText(/city directory|Browse|online shops|Local shops/i).first()).toBeVisible();
    }
  });
});
