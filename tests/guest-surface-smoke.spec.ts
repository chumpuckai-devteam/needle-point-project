import { expect, test } from "@playwright/test";

/**
 * Guest/demo surface smoke for claim UX, shop chrome, and comment affordances.
 * Playwright webServer clears VITE_SUPABASE_* → demo mode (interactive).
 */
test.describe("guest / auth surface smoke", () => {
  test("studio shows feed chrome with primary nav", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Needlepoint Palace/i })).toBeVisible();
    const feed = page.locator('[aria-label="Needlepoint Palace feed"]');
    await expect(feed).toBeVisible();
    await expect(page.getByRole("button", { name: /Palace|Needlepoint Palace/i }).first()).toBeVisible();
    // Demo is signed-in path: New post present.
    await expect(
      page.getByRole("navigation", { name: /Primary navigation/i }).getByRole("button", { name: /New post/i }),
    ).toBeVisible();
  });

  test("unowned shop shows follow + request-to-claim; demo claim becomes owner", async ({ page }) => {
    await page.goto("/stores/threadandtonic");
    await expect(page.getByRole("heading", { name: /Thread/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Follow store|Following/i })).toBeVisible();
    const claim = page.getByRole("button", { name: /Request to claim shop|Claim pending review/i });
    await expect(claim).toBeVisible();
    await claim.click();
    // Demo path: instant ownership for dogfood.
    await expect(page.getByText(/Your shop|now the owner/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /Add product/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Edit shop profile/i })).toBeVisible();
  });

  test("project detail has comment affordance", async ({ page }) => {
    await page.goto("/projects/p1");
    await expect(page.getByRole("heading", { name: /Persimmon Garden Pillow/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Comment|Sign in to comment/i })).toBeVisible();
  });

  test("stitch-along list route loads", async ({ page }) => {
    await page.goto("/stitch-along");
    await expect(page).toHaveURL(/\/stitch-along/);
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 });
  });
});
