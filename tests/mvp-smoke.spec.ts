import { expect, test } from "@playwright/test";

async function navigateByLabel(page: import("@playwright/test").Page, label: RegExp) {
  await page.locator("nav[aria-label='Primary navigation'] button, nav[aria-label='Primary navigation'] a").filter({ hasText: label }).first().click();
}

test("core MVP flows are usable through router paths", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Needlepoint Palace|Palace/i })).toBeVisible();

  await navigateByLabel(page, /^Discover$/);
  await expect(page).toHaveURL(/\/discover$/);
  await page.getByPlaceholder(/Try florals/).fill("bookshop");
  await expect(page.getByText("Bookshop Door Canvas").first()).toBeVisible();

  // Open a seeded project and expect Available at / Shop the look when stores are tagged
  await page.getByText("Bookshop Door Canvas").first().click();
  await expect(page).toHaveURL(/\/projects\//);
  await expect(page.getByRole("heading", { name: /Bookshop Door Canvas/i })).toBeVisible();

  await page.goto("/stores");
  await expect(page).toHaveURL(/\/stores/);
  await expect(page.getByRole("heading", { name: /Local shops near you|Shops|Browse/i }).first()).toBeVisible();

  // City-first browse: open known real shops by handle
  await page.goto("/stores/maydel");
  await expect(page).toHaveURL(/\/stores\/maydel/);
  await expect(page.getByRole("heading", { name: /Maydel/i })).toBeVisible();

  await page.goto("/stores/nashvilleneedleworks");
  await expect(page).toHaveURL(/\/stores\/nashvilleneedleworks/);
  await expect(page.getByRole("heading", { name: /Nashville Needleworks/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Follow store|Following/i })).toBeVisible();

  await navigateByLabel(page, /New post/);
  await expect(page).toHaveURL(/\/journal$/);
  await expect(page.getByLabel("Title")).toBeVisible();

  await page.goto("/stitch-along");
  await expect(page).toHaveURL(/\/stitch-along$/);
});
