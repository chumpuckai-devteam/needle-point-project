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

    // City-first browse: local shops via city cards; online rail still present
    await expect(page.getByRole("heading", { name: /Browse by city/i }).or(page.getByText(/Online shops/i)).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.locator(".store-city-card, .store-card").filter({ hasText: /Portland|Canopy|Thread|Austin|Bookshop/i }).first(),
    ).toBeVisible({ timeout: 15_000 });

    // After a ZIP search, map should mount real OSM tiles (Leaflet)
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
    const cityBtn = page.locator("button").filter({ hasText: /Portland|Austin|Charleston/i }).first();
    if ((await cityBtn.count()) > 0) {
      await cityBtn.click();
      await expect(page.locator("main")).toBeVisible();
    } else {
      await expect(page.getByText(/city directory|Browse|online shops|Local shops/i).first()).toBeVisible();
    }
  });

  test("browse card deep-links to store detail and returns to city context", async ({ page }) => {
    await page.goto("/stores");
    await expect(page.getByRole("heading", { name: /Local shops near you/i })).toBeVisible({ timeout: 15_000 });

    const cityBtn = page.locator("button.store-city-card").filter({ hasText: /Portland/i }).first();
    if ((await cityBtn.count()) > 0) {
      await cityBtn.click();
      await expect(page).toHaveURL(/[?&]city=/i, { timeout: 10_000 });
    }

    const card = page.locator(".store-card").filter({ hasText: /Canopy Canvas/i }).first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    const mainLink = card.locator("a.store-card-main");
    await expect(mainLink).toHaveAttribute("href", /\/stores\/canopycanvas/i);
    // Maps shortcuts on mappable local cards
    await expect(card.getByTestId("store-card-maps")).toBeVisible();
    await expect(card.getByRole("link", { name: /Apple Maps/i })).toBeVisible();
    await expect(card.getByRole("link", { name: /Google Maps/i })).toBeVisible();
    await mainLink.click();

    await expect(page).toHaveURL(/\/stores\/canopycanvas/i, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Canopy Canvas/i })).toBeVisible();

    const back = page.getByRole("button", { name: /Back to shops|All stores/i });
    await expect(back).toBeVisible();
    await back.click();
    await expect(page).toHaveURL(/\/stores/i, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Local shops near you/i })).toBeVisible();
  });

  test("direct store detail cold open and unknown handle recovery", async ({ page }) => {
    await page.goto("/stores/bookshopwindows");
    await expect(page).toHaveURL(/\/stores\/bookshopwindows/i);
    await expect(page.getByRole("heading", { name: /Bookshop Windows/i })).toBeVisible({ timeout: 15_000 });

    await page.goto("/stores/not-a-real-shop-xyz");
    await expect(page.getByText(/not found|can't find|couldn't find|unknown shop|shop not found/i).first()).toBeVisible({
      timeout: 15_000,
    });
    const recover = page.getByRole("button", { name: /Browse|All stores|shops/i }).first();
    await expect(recover).toBeVisible();
    await recover.click();
    await expect(page).toHaveURL(/\/stores\/?(\?.*)?$/i, { timeout: 15_000 });
  });

  test("store id deep link canonicalizes to handle when present in catalog", async ({ page }) => {
    await page.goto("/stores/store-local-1");
    await expect(page).toHaveURL(/\/stores\/canopycanvas/i, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Canopy Canvas/i })).toBeVisible();
  });
});
