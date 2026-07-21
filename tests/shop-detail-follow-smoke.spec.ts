import { expect, test } from "@playwright/test";
import {
  DEMO_FOLLOWABLE_SHOP,
  DEMO_OWNED_SHOP,
  followButton,
  openShopByHandle,
  readStoreFollows,
  reloadShopDetail,
  seedStoreFollows,
} from "./helpers/shops";

/**
 * Shop detail + follow-store smoke (demo mode).
 *
 * Playwright webServer clears VITE_SUPABASE_* (see playwright.config.ts) so
 * seed shops, demo ownership (Canopy), and localStorage storeFollows stay
 * deterministic without live credentials.
 */
test.describe("shop detail smoke", () => {
  test("owned shop detail shows critical UI and hides Follow", async ({ page }) => {
    await openShopByHandle(page, DEMO_OWNED_SHOP.handle, DEMO_OWNED_SHOP.name);

    await expect(page.getByText(/Your shop/i).first()).toBeVisible();
    await expect(page.getByText(/@canopycanvas/i).first()).toBeVisible();
    await expect(page.getByText(/Portland, OR|Ships nationwide/i).first()).toBeVisible();

    await expect(page.getByRole("heading", { name: /^Catalog$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Projects available here/i })).toBeVisible();

    const productCards = page.locator("article.product-card");
    await expect(productCards.first()).toBeVisible();
    expect(await productCards.count()).toBeGreaterThanOrEqual(2);
    await expect(page.getByText(/Persimmon|Bookshop Door|Hydrangea/i).first()).toBeVisible();

    await expect(page.getByRole("button", { name: /Add product/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Edit shop profile/i })).toBeVisible();
    await expect(followButton(page)).toHaveCount(0);

    await expect(page.getByRole("button", { name: /All stores/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Visit website/i })).toBeVisible();
    await expect(page.getByTestId("store-maps-links")).toBeVisible();
    await expect(page.getByRole("link", { name: /Apple Maps/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Google Maps/i })).toBeVisible();
    const appleHref = await page.getByRole("link", { name: /Apple Maps/i }).getAttribute("href");
    const googleHref = await page.getByRole("link", { name: /Google Maps/i }).getAttribute("href");
    expect(appleHref).toMatch(/maps\.apple\.com/);
    expect(googleHref).toMatch(/google\.com\/maps/);
  });

  test("followable shop detail shows Follow CTA and catalog", async ({ page }) => {
    await openShopByHandle(page, DEMO_FOLLOWABLE_SHOP.handle, DEMO_FOLLOWABLE_SHOP.name);

    await expect(page.getByText(/^Store$/i).first()).toBeVisible();
    await expect(page.getByText(/@threadandtonic/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Catalog$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Projects available here/i })).toBeVisible();

    const productCards = page.locator("article.product-card");
    await expect(productCards.first()).toBeVisible();
    expect(await productCards.count()).toBeGreaterThanOrEqual(2);

    await expect(followButton(page)).toBeVisible();
    await expect(page.getByRole("button", { name: /Add product/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Edit shop profile/i })).toHaveCount(0);
  });

  test("navigates from shops list into known seed shop", async ({ page }) => {
    await page.goto("/stores", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Local shops near you|Shops|Top online/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(DEMO_FOLLOWABLE_SHOP.name).first()).toBeVisible();
    await page.getByText(DEMO_FOLLOWABLE_SHOP.name).first().click();
    await expect(page).toHaveURL(new RegExp(`/stores/${DEMO_FOLLOWABLE_SHOP.handle}`, "i"), { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: DEMO_FOLLOWABLE_SHOP.name })).toBeVisible();
  });
});

test.describe("follow store smoke", () => {
  test("follow then unfollow is idempotent and persists in demo storage", async ({ page }) => {
    // Baseline: not following Thread & Tonic (keep Canopy in the default seed set).
    await seedStoreFollows(page, [DEMO_OWNED_SHOP.id]);

    await openShopByHandle(page, DEMO_FOLLOWABLE_SHOP.handle, DEMO_FOLLOWABLE_SHOP.name);
    const btn = followButton(page);
    await expect(btn).toBeVisible({ timeout: 20_000 });
    await expect(btn).toHaveText(/^Follow store$/i);

    // --- Follow ---
    await btn.click();
    await expect(btn).toHaveText(/^Following$/i);
    await expect(btn).toHaveClass(/selected/);
    await expect
      .poll(async () => readStoreFollows(page), { timeout: 5_000 })
      .toEqual(expect.arrayContaining([DEMO_FOLLOWABLE_SHOP.id]));

    // Hard reload — localStorage path (no soft-nav detour; less flake under Vite).
    await reloadShopDetail(page, DEMO_FOLLOWABLE_SHOP.handle, DEMO_FOLLOWABLE_SHOP.name);
    await expect(followButton(page)).toHaveText(/^Following$/i);
    expect(await readStoreFollows(page)).toContain(DEMO_FOLLOWABLE_SHOP.id);

    // --- Unfollow ---
    await followButton(page).click();
    await expect(followButton(page)).toHaveText(/^Follow store$/i);
    await expect
      .poll(async () => readStoreFollows(page), { timeout: 5_000 })
      .not.toEqual(expect.arrayContaining([DEMO_FOLLOWABLE_SHOP.id]));

    await reloadShopDetail(page, DEMO_FOLLOWABLE_SHOP.handle, DEMO_FOLLOWABLE_SHOP.name);
    await expect(followButton(page)).toHaveText(/^Follow store$/i);
    expect(await readStoreFollows(page)).not.toContain(DEMO_FOLLOWABLE_SHOP.id);

    // Cycle once more — still toggleable after persistence.
    await followButton(page).click();
    await expect(followButton(page)).toHaveText(/^Following$/i);
    await followButton(page).click();
    await expect(followButton(page)).toHaveText(/^Follow store$/i);
  });
});
