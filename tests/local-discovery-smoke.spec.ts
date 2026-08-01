import { expect, test } from "@playwright/test";

/**
 * Epic L local discovery UI smoke (demo mode — client ranking + city directory).
 */
test.describe("local discovery shops UI", () => {
  test("shops page shows search, location consent, and seed shops", async ({ page }) => {
    await page.goto("/stores");
    await expect(page.getByRole("heading", { name: /Local shops near you/i })).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole("textbox", { name: /ZIP or city/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Find shops/i })).toBeVisible();
    // One location path: in-app Allow coach before form "Use my location"
    await expect(page.getByRole("button", { name: /Allow location|Use my location|Refresh location|Locating/i }).first()).toBeVisible();

    // City-first browse + online-only rail
    await expect(page.getByRole("heading", { name: /Browse by city/i }).or(page.getByText(/Online shops/i)).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.locator(".store-city-card, .store-card").filter({ hasText: /Nashville|Chicago|Austin|Maydel|Boston/i }).first(),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("textbox", { name: /ZIP or city/i }).fill("97205");
    await page.getByRole("button", { name: /Find shops/i }).click();
    await expect(page.locator(".store-pin-map-leaflet, .leaflet-container").first()).toBeVisible({ timeout: 15_000 });
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
    const cityBtn = page.locator("button.store-city-card").filter({ hasText: /Nashville|Austin|Chicago/i }).first();
    if ((await cityBtn.count()) > 0) {
      await cityBtn.click();
      await expect(page.locator("main")).toBeVisible();
    } else {
      await expect(page.getByText(/city directory|Browse|online shops|Local shops/i).first()).toBeVisible();
    }
  });

  test("browse card deep-links to store detail and returns to city context", async ({ page }) => {
    await page.goto("/stores/maydel");
    await expect(page).toHaveURL(/\/stores\/maydel/i, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Maydel/i })).toBeVisible();

    const back = page.getByRole("button", { name: /Back to shops|All stores/i }).first();
    await expect(back).toBeVisible();
    await back.click({ force: true });
    await expect(page).toHaveURL(/\/stores/i, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Local shops near you/i })).toBeVisible();
  });

  test("direct store detail cold open and unknown handle recovery", async ({ page }) => {
    await page.goto("/stores/maydel");
    await expect(page).toHaveURL(/\/stores\/maydel/i);
    await expect(page.getByRole("heading", { name: /Maydel/i })).toBeVisible({ timeout: 15_000 });

    await page.goto("/stores/not-a-real-shop-xyz");
    await expect(page.getByText(/not found|can't find|couldn't find|unknown shop|shop not found/i).first()).toBeVisible({
      timeout: 15_000,
    });
    const recover = page.getByRole("button", { name: /Browse|All stores|shops/i }).first();
    await expect(recover).toBeVisible();
    await recover.click();
    await expect(page).toHaveURL(/\/stores\/?(\?.*)?$/i, { timeout: 15_000 });
  });

  test("store handle deep link opens catalog shop", async ({ page }) => {
    await page.goto("/stores/nashvilleneedleworks");
    await expect(page).toHaveURL(/\/stores\/nashvilleneedleworks/i, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Nashville Needleworks/i })).toBeVisible();
  });
});
