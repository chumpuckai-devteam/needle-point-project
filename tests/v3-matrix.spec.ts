import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shotDir = path.resolve(__dirname, "../dogfood-output/screenshots");

async function shot(page: Page, name: string) {
  // Viewport shot only — full-page screenshots time out with the national shop catalog.
  await page.screenshot({ path: path.join(shotDir, `${name}.png`), fullPage: false, timeout: 10_000 });
}

async function dismissGeoIfAny(page: Page) {
  // App may request geolocation; grant or deny should not crash.
  try {
    await page.context().grantPermissions([]);
  } catch {
    /* ignore */
  }
}

test.describe("V3 acceptance matrix", () => {
  test("1 stores list + 2 store detail catalog + follow CTA", async ({ page }) => {
    await dismissGeoIfAny(page);
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(`console: ${msg.text()}`);
    });

    await page.goto("/stores");
    await expect(page.getByRole("heading", { name: /shops|stores|local shops/i }).first()).toBeVisible({ timeout: 20_000 });
    await shot(page, "01-stores");

    // Expect three named stores somewhere on the page
    await expect(page.getByText(/Canopy Canvas/i).first()).toBeVisible();
    await expect(page.getByText(/Thread & Tonic|Thread and Tonic/i).first()).toBeVisible();
    await expect(page.getByText(/Bookshop Windows/i).first()).toBeVisible();

    // Owned demo shop (Canopy): CRUD visible, Follow hidden
    await page.locator(".store-card").filter({ hasText: /Canopy Canvas/i }).first().locator("a.store-card-main").click();
    await expect(page).toHaveURL(/\/stores\/canopycanvas/i, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Canopy Canvas/i })).toBeVisible();
    await expect(page.getByText(/Your shop/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Add product/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Follow store|Following/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Catalog/i }).or(page.getByText(/^Catalog$/i))).toBeVisible();

    // ≥2 catalog products
    const productCards = page.locator(".product-card");
    await expect(productCards.first()).toBeVisible({ timeout: 15_000 });
    expect(await productCards.count()).toBeGreaterThanOrEqual(2);

    // Projects section present
    await expect(page.getByText(/Projects available here/i)).toBeVisible();
    await shot(page, "02-store-detail-canopy");

    // Non-owned demo shop: Follow visible, owner CRUD hidden
    await page.goto("/stores");
    await page.locator(".store-card").filter({ hasText: /Thread & Tonic|Thread and Tonic/i }).first().click();
    await expect(page).toHaveURL(/\/stores\/threadandtonic/i, { timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Follow store|Following/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add product/i })).toHaveCount(0);
    await shot(page, "02-store-detail-threadandtonic");

    // Soft assert: no hard page errors
    const hard = consoleErrors.filter((e) => !/favicon|ResizeObserver|net::ERR/i.test(e));
    expect(hard, hard.join("\n")).toEqual([]);
  });

  test("3 project detail Shop the look when tagged", async ({ page }) => {
    await page.goto("/discover");
    const search = page.getByPlaceholder(/Try florals|Search/i);
    await expect(search).toBeVisible({ timeout: 20_000 });

    // Prefer Bookshop Door Canvas which is seeded with store tags
    await search.fill("bookshop");
    await expect(page.getByText(/Bookshop Door Canvas/i).first()).toBeVisible({ timeout: 15_000 });
    await page.getByText(/Bookshop Door Canvas/i).first().click();
    await expect(page).toHaveURL(/\/projects\//);
    await expect(page.getByRole("heading", { name: /Bookshop Door Canvas/i })).toBeVisible();

    // Available at chips and Shop the look
    await expect(page.getByText(/Available at/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Shop the look/i).first()).toBeVisible();
    const shopLinks = page.locator(".shop-the-look a, .shop-look-card a");
    await expect(shopLinks.first()).toBeVisible();
    // Link-out only — help copy may include "No checkout"; assert no cart CTA chrome
    await expect(page.getByRole("button", { name: /\b(cart|checkout|buy now)\b/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /\b(cart|checkout)\b/i })).toHaveCount(0);
    await shot(page, "03-project-shop-the-look");
  });

  test("4 follow store demo toggle persists in session state", async ({ page }) => {
    // Use a non-owned shop — Canopy is demo-owned and hides Follow
    await page.goto("/stores/threadandtonic");
    const followBtn = page.getByRole("button", { name: /Follow store|Following/i });
    await expect(followBtn).toBeVisible({ timeout: 20_000 });
    const before = (await followBtn.textContent())?.trim() ?? "";
    await followBtn.click();
    // After click should flip label (demo mode has session; prod may require auth)
    await page.waitForTimeout(800);
    const after = (await followBtn.textContent())?.trim() ?? "";
    await shot(page, "04-follow-toggle");

    // Accept either: toggled successfully OR auth gate message for prod signed-out
    const authGate = page.getByText(/sign in to follow/i);
    if (await authGate.count()) {
      await expect(authGate.first()).toBeVisible();
    } else {
      expect(after).not.toEqual(before);
      // Demo path must write needle-point-project:storeFollows without a network round-trip.
      const stored = await page.evaluate(() => {
        try {
          return JSON.parse(localStorage.getItem("needle-point-project:storeFollows") || "null");
        } catch {
          return null;
        }
      });
      expect(Array.isArray(stored)).toBeTruthy();
      const following = /following/i.test(after);
      if (following) {
        expect(stored).toContain("store-online-1");
      } else {
        expect(stored).not.toContain("store-online-1");
      }
      // refresh and expect persistence in demo/localStorage or online
      await page.reload();
      await expect(page.getByRole("button", { name: new RegExp(after, "i") })).toBeVisible({ timeout: 20_000 });
    }
  });

  test("5 journal Available at picker present", async ({ page }) => {
    await page.goto("/journal");
    await expect(page.getByLabel(/Title/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Available at/i).first()).toBeVisible();
    // store checkboxes or labels
    await expect(page.getByText(/Canopy Canvas|Thread & Tonic|Bookshop Windows/i).first()).toBeVisible();
    await shot(page, "05-journal-available-at");
  });

  test("6 auth separate screens + footer switch", async ({ page }) => {
    await page.goto("/auth");
    await expect(page).toHaveURL(/\/auth$/);
    // Should not be dual tabs in either demo or online mode
    await expect(page.getByRole("tab", { name: /sign up|create/i })).toHaveCount(0);

    // Demo smoke server: always-on local session (full happy path covered by auth-smoke.spec.ts)
    const demoHeading = page.getByRole("heading", { name: /Demo mode active/i });
    if (await demoHeading.isVisible().catch(() => false)) {
      await expect(demoHeading).toBeVisible();
      await expect(page.getByRole("button", { name: /^Sign in$/i })).toBeVisible();
      await shot(page, "06-auth-demo");
      return;
    }

    await expect(page.getByRole("heading", { name: /sign in|log in|welcome back/i }).or(page.getByText(/sign in/i).first())).toBeVisible({
      timeout: 15_000,
    });
    await shot(page, "06-auth-signin");

    // Footer switch uses text buttons (not <a> links)
    const toSignup = page.getByRole("button", { name: /create an account|create account|sign up|join/i });
    await expect(toSignup.first()).toBeVisible();
    await toSignup.first().click();
    await expect(page).toHaveURL(/\/auth\/signup/);
    await shot(page, "06-auth-signup");

    const toSignin = page.getByRole("button", { name: /sign in|log in|already have/i });
    await expect(toSignin.first()).toBeVisible();
  });

  test("8 mobile viewport no critical horizontal overflow on store/project", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/stores/canopycanvas");
    await expect(page.getByRole("heading", { name: /Canopy Canvas/i })).toBeVisible({ timeout: 20_000 });
    const storeOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
    });
    await shot(page, "08-mobile-store");
    expect(storeOverflow.scrollWidth - storeOverflow.clientWidth).toBeLessThanOrEqual(8);

    await page.goto("/discover");
    const search = page.getByPlaceholder(/Try florals|Search/i);
    if (await search.count()) await search.fill("bookshop");
    await page.getByText(/Bookshop Door Canvas/i).first().click();
    await expect(page).toHaveURL(/\/projects\//);
    await page.waitForTimeout(500);
    const projectOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
    });
    await shot(page, "08-mobile-project");
    expect(projectOverflow.scrollWidth - projectOverflow.clientWidth).toBeLessThanOrEqual(8);
  });
});
