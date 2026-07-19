import { expect, test } from "@playwright/test";

async function navigateByLabel(page: import("@playwright/test").Page, label: RegExp) {
  await page.locator("nav[aria-label='Primary navigation'] button, nav[aria-label='Primary navigation'] a").filter({ hasText: label }).first().click();
}

test("core MVP flows are usable through router paths", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Studio/i })).toBeVisible();

  await navigateByLabel(page, /^Discover$/);
  await expect(page).toHaveURL(/\/discover$/);
  await page.getByPlaceholder(/Try florals/).fill("bookshop");
  await expect(page.getByText("Bookshop Door Canvas").first()).toBeVisible();

  // Open a seeded project and expect Available at / Shop the look when stores are tagged
  await page.getByText("Bookshop Door Canvas").first().click();
  await expect(page).toHaveURL(/\/projects\//);
  await expect(page.getByRole("heading", { name: /Bookshop Door Canvas/i })).toBeVisible();

  await navigateByLabel(page, /^Shops$/);
  await expect(page).toHaveURL(/\/stores/);
  await expect(page.getByRole("heading", { name: /Local shops near you|Shops|Browse/i }).first()).toBeVisible();

  // Click the store card (not city directory examples that also mention the name)
  await page.locator(".store-card").filter({ hasText: /Canopy Canvas/i }).first().click();
  await expect(page).toHaveURL(/\/stores\/canopycanvas/);
  await expect(page.getByRole("heading", { name: /Canopy Canvas/i })).toBeVisible();
  await expect(page.getByText(/Your shop/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Add product/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Follow store|Following/i })).toHaveCount(0);

  await navigateByLabel(page, /^Shops$/);
  await page.locator(".store-card").filter({ hasText: /Thread & Tonic|Thread and Tonic/i }).first().click();
  await expect(page).toHaveURL(/\/stores\/threadandtonic/);
  await expect(page.getByRole("button", { name: /Follow store|Following/i })).toBeVisible();

  await navigateByLabel(page, /New post/);
  await expect(page).toHaveURL(/\/journal$/);
  await expect(page.getByLabel("Title")).toBeVisible();

  await navigateByLabel(page, /Stitch-along/);
  await expect(page).toHaveURL(/\/stitch-along$/);
});
