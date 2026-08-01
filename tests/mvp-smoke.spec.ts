import { expect, test } from "@playwright/test";

async function dismissHelpCoach(page: import("@playwright/test").Page) {
  const skip = page.getByRole("button", { name: /Skip|Got it|Dismiss|Not now/i }).first();
  if (await skip.isVisible().catch(() => false)) {
    await skip.click({ force: true }).catch(() => undefined);
  }
  await page
    .locator(".help-coach")
    .evaluateAll((nodes) => nodes.forEach((n) => n.remove()))
    .catch(() => undefined);
}

test("core MVP flows are usable through router paths", async ({ page }) => {
  await page.goto("/");
  await dismissHelpCoach(page);

  await expect(page.getByRole("heading", { name: /Needlepoint Palace|Palace/i })).toBeVisible();

  await page.goto("/discover");
  await expect(page).toHaveURL(/\/discover$/);
  await page.getByPlaceholder(/Try florals/).fill("bookshop");
  await expect(page.getByText("Bookshop Door Canvas").first()).toBeVisible();

  await page.getByText("Bookshop Door Canvas").first().click();
  await expect(page).toHaveURL(/\/projects\//);
  await expect(page.getByRole("heading", { name: /Bookshop Door Canvas/i })).toBeVisible();

  await page.goto("/stores");
  await expect(page).toHaveURL(/\/stores/);
  await expect(page.getByRole("heading", { name: /Local shops near you|Shops|Browse/i }).first()).toBeVisible();

  await page.goto("/stores/maydel");
  await expect(page).toHaveURL(/\/stores\/maydel/);
  await expect(page.getByRole("heading", { name: /Maydel/i })).toBeVisible();

  await page.goto("/stores/nashvilleneedleworks");
  await expect(page).toHaveURL(/\/stores\/nashvilleneedleworks/);
  await expect(page.getByRole("heading", { name: /Nashville Needleworks/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Follow store|Following/i })).toBeVisible();

  await page.goto("/journal");
  await expect(page).toHaveURL(/\/journal$/);
  await expect(page.getByLabel("Title")).toBeVisible();

  await page.goto("/stitch-along");
  await expect(page).toHaveURL(/\/stitch-along$/);
});
