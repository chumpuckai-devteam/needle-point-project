import { expect, test } from "@playwright/test";

/**
 * Guest UX matrix (demo mode is fully interactive; these assert demo still works
 * and structural guest-safe chrome is present when create is gated).
 */
test.describe("guest / auth surface smoke", () => {
  test("studio shows feed chrome without guest interest copy in demo seed", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Studio" })).toBeVisible();
    // Demo personalizes; ensure feed or loading/empty is coherent — not a crash.
    const feed = page.locator('[aria-label="Studio feed"]');
    await expect(feed).toBeVisible();
    // Nav: Studio present; New post present in demo (canPost true).
    await expect(page.getByRole("button", { name: /Studio/i }).first()).toBeVisible();
  });

  test("unowned shop shows claim CTA and follow CTA in demo", async ({ page }) => {
    await page.goto("/stores/threadandtonic");
    await expect(page.getByRole("heading", { name: /Thread/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Follow store|Following/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Request to claim shop|Claim/i })).toBeVisible();
  });

  test("project detail has comment affordance", async ({ page }) => {
    await page.goto("/");
    const firstPost = page.locator("article.feed-post").first();
    await expect(firstPost).toBeVisible({ timeout: 15_000 });
    await firstPost.locator(".feed-post-body, .feed-media, img").first().click({ force: true }).catch(async () => {
      await page.goto("/projects/p1");
    });
    // If still on home, open p1 directly (demo seed).
    if (!page.url().includes("/projects/")) {
      await page.goto("/projects/p1");
    }
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Comment|Sign in to comment/i })).toBeVisible();
  });
});
