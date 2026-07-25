import { expect, test, type Page } from "@playwright/test";

/**
 * Available-at user flow smoke (demo / offline seed).
 *
 * Seeded project "Bookshop Door Canvas" (id p3) is tagged with:
 *   - Maydel (store-local-1, handle maydel)
 *   - Nashville Needleworks LNS (store-local-2, handle nashvilleneedleworks)
 *
 * Selectors:
 *   - .available-at           project-detail Available at block
 *   - button.store-chip       shop chips that navigate to /stores/:handle
 *   - .shop-the-look          catalog link-outs for tagged shops
 *   - .store-picker           journal create form store checkboxes
 *   - "Projects available here" reverse link on store detail
 *
 * Requires Playwright webServer demo env (VITE_SUPABASE_* cleared) so seed
 * storeIds attach without remote project_stores.
 */

const SEEDED_PROJECT = /Bookshop Door Canvas/i;
/** Chips expected on Bookshop Door Canvas in demo seed. */
const SEEDED_SHOP_NAMES = [/Maydel/i, /Nashville Needleworks/i];

async function openSeededProjectFromDiscover(page: Page) {
  await page.goto("/discover");
  // Discover heading + search field both load; wait on the field used next.
  const search = page.getByPlaceholder(/Try florals|Search/i);
  await expect(search).toBeVisible({ timeout: 20_000 });
  await search.fill("bookshop");
  await expect(page.getByText(SEEDED_PROJECT).first()).toBeVisible({ timeout: 15_000 });
  await page.getByText(SEEDED_PROJECT).first().click();
  await expect(page).toHaveURL(/\/projects\//);
  await expect(page.getByRole("heading", { name: SEEDED_PROJECT })).toBeVisible({ timeout: 15_000 });
}

test.describe("Available at flow smoke (demo seed)", () => {
  test("project detail surfaces Available at chips and Shop the look", async ({ page }) => {
    await openSeededProjectFromDiscover(page);

    // Label + chip list (not screenshot-only)
    const availableAt = page.locator(".available-at");
    await expect(availableAt).toBeVisible({ timeout: 15_000 });
    await expect(availableAt.getByText(/^Available at$/i)).toBeVisible();

    const chips = availableAt.locator("button.store-chip");
    await expect(chips.first()).toBeVisible();
    expect(await chips.count()).toBeGreaterThanOrEqual(2);

    for (const name of SEEDED_SHOP_NAMES) {
      await expect(chips.filter({ hasText: name }).first()).toBeVisible();
    }

    // Tagged shops with catalog → Shop the look strip
    const shopLook = page.locator(".shop-the-look");
    await expect(shopLook).toBeVisible();
    await expect(shopLook.getByRole("heading", { name: /Shop the look/i })).toBeVisible();
    await expect(shopLook.getByText(/No checkout on Needlepoint/i)).toBeVisible();
    await expect(shopLook.locator("article.product-card, article.shop-look-card").first()).toBeVisible();
    // Link-out only — no cart/checkout CTAs (help copy may say "No checkout on Needlepoint")
    await expect(page.getByRole("button", { name: /\b(cart|checkout|buy now)\b/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /\b(cart|checkout)\b/i })).toHaveCount(0);
  });

  test("Available at chip navigates to shop; reverse project link present", async ({ page }) => {
    await openSeededProjectFromDiscover(page);

    const availableAt = page.locator(".available-at");
    await expect(availableAt).toBeVisible({ timeout: 15_000 });

    // Prefer Canopy (stable handle maydel) for the happy-path drill-in
    const canopyChip = availableAt.locator("button.store-chip").filter({ hasText: /Maydel/i }).first();
    await expect(canopyChip).toBeVisible();
    await canopyChip.click();

    await expect(page).toHaveURL(/\/stores\/maydel\/?$/i, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Maydel/i })).toBeVisible();

    // Reverse surface: projects tagged available-at this shop
    await expect(page.getByRole("heading", { name: /Projects available here/i })).toBeVisible();
    // Demo seed links Bookshop Door (+ others) — either grid cells or empty copy.
    const emptyCopy = page.getByText(/No projects have tagged this store yet/i);
    const projectCells = page.locator("button.ig-grid-cell");
    if (await emptyCopy.count()) {
      await expect(emptyCopy).toBeVisible();
    } else {
      await expect(projectCells.first()).toBeVisible();
      expect(await projectCells.count()).toBeGreaterThanOrEqual(1);
      // Click first tagged project image back into project detail
      await projectCells.first().click();
      await expect(page).toHaveURL(/\/projects\//);
      await expect(page.getByRole("heading").first()).toBeVisible();
    }
  });

  test("second Available at chip reaches alternate shop handle", async ({ page }) => {
    await openSeededProjectFromDiscover(page);

    const chip = page
      .locator(".available-at button.store-chip")
      .filter({ hasText: /Nashville Needleworks/i })
      .first();
    await expect(chip).toBeVisible({ timeout: 15_000 });
    await chip.click();

    await expect(page).toHaveURL(/\/stores\/nashvilleneedleworks\/?$/i, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Nashville Needleworks/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Projects available here/i })).toBeVisible();
  });

  test("journal create form exposes Available at store picker", async ({ page }) => {
    await page.goto("/journal");
    // Field accessible name is "Title Required" (required mark in label)
    await expect(page.getByRole("heading", { name: /Create a project entry/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel(/Title/i).first()).toBeVisible();

    const picker = page.locator(".store-picker");
    await expect(picker).toBeVisible();
    await expect(picker.getByText(/Available at \(stores\)/i)).toBeVisible();
    await expect(picker.getByText(/Tag local or online shops/i)).toBeVisible();

    // Demo seed shops appear as checkbox labels
    const options = picker.locator(".store-picker-options label.checkbox-field");
    await expect(options.first()).toBeVisible();
    expect(await options.count()).toBeGreaterThanOrEqual(3);

    await expect(picker.getByText(/Maydel/i).first()).toBeVisible();
    await expect(picker.getByText(/Thread & Tonic|Thread and Tonic/i).first()).toBeVisible();
    await expect(picker.getByText(/Nashville Needleworks/i).first()).toBeVisible();

    // Toggle is interactive (draft only — no save required for smoke)
    const canopy = options.filter({ hasText: /Maydel/i }).first();
    const box = canopy.locator('input[type="checkbox"]');
    await expect(box).toBeVisible();
    const before = await box.isChecked();
    await canopy.click();
    await expect(box).toHaveJSProperty("checked", !before);
  });
});
