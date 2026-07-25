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
 * Real LNS catalog — empty product shelves are OK until owners add products.
 */
test.describe("shop detail smoke", () => {
  test("owned shop detail shows critical UI and hides Follow", async ({ page }) => {
    await openShopByHandle(page, DEMO_OWNED_SHOP.handle, DEMO_OWNED_SHOP.name);

    await expect(page.getByText(/Your shop/i).first()).toBeVisible();
    await expect(page.getByText(new RegExp(`@${DEMO_OWNED_SHOP.handle}`, "i")).first()).toBeVisible();
    await expect(page.getByText(/Wellesley|MA/i).first()).toBeVisible();

    await expect(page.getByRole("button", { name: /Add product/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Edit shop profile/i }).first()).toBeVisible();
    await expect(followButton(page)).toHaveCount(0);

    await expect(page.getByRole("button", { name: /All stores/i })).toBeVisible();
  });

  test("followable shop detail shows Follow CTA", async ({ page }) => {
    await openShopByHandle(page, DEMO_FOLLOWABLE_SHOP.handle, DEMO_FOLLOWABLE_SHOP.name);

    await expect(page.getByText(new RegExp(`@${DEMO_FOLLOWABLE_SHOP.handle}`, "i")).first()).toBeVisible();
    await expect(followButton(page)).toBeVisible();
    await expect(page.getByRole("button", { name: /Add product/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Edit shop profile/i })).toHaveCount(0);
  });

  test("navigates from shops list into known shop", async ({ page }) => {
    await openShopByHandle(page, DEMO_FOLLOWABLE_SHOP.handle, DEMO_FOLLOWABLE_SHOP.name);
    await expect(page.getByRole("heading", { name: DEMO_FOLLOWABLE_SHOP.name })).toBeVisible();
  });
});

test.describe("follow store smoke", () => {
  test("follow then unfollow is idempotent and persists in demo storage", async ({ page }) => {
    await seedStoreFollows(page, [DEMO_OWNED_SHOP.id]);

    await openShopByHandle(page, DEMO_FOLLOWABLE_SHOP.handle, DEMO_FOLLOWABLE_SHOP.name);
    const btn = followButton(page);
    await expect(btn).toBeVisible({ timeout: 20_000 });
    await expect(btn).toHaveText(/^Follow store$/i);

    await btn.click();
    await expect(btn).toHaveText(/^Following$/i);
    await expect(btn).toHaveClass(/selected/);
    await expect
      .poll(async () => readStoreFollows(page), { timeout: 5_000 })
      .toEqual(expect.arrayContaining([DEMO_FOLLOWABLE_SHOP.id]));

    await reloadShopDetail(page, DEMO_FOLLOWABLE_SHOP.handle, DEMO_FOLLOWABLE_SHOP.name);
    await expect(followButton(page)).toHaveText(/^Following$/i);
    expect(await readStoreFollows(page)).toContain(DEMO_FOLLOWABLE_SHOP.id);

    await followButton(page).click();
    await expect(followButton(page)).toHaveText(/^Follow store$/i);
    await expect
      .poll(async () => readStoreFollows(page), { timeout: 5_000 })
      .not.toEqual(expect.arrayContaining([DEMO_FOLLOWABLE_SHOP.id]));

    await reloadShopDetail(page, DEMO_FOLLOWABLE_SHOP.handle, DEMO_FOLLOWABLE_SHOP.name);
    await expect(followButton(page)).toHaveText(/^Follow store$/i);
    expect(await readStoreFollows(page)).not.toContain(DEMO_FOLLOWABLE_SHOP.id);

    await followButton(page).click();
    await expect(followButton(page)).toHaveText(/^Following$/i);
    await followButton(page).click();
    await expect(followButton(page)).toHaveText(/^Follow store$/i);
  });
});
