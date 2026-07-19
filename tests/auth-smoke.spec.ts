import { expect, test } from "@playwright/test";
import {
  DEMO_EMAIL,
  DEMO_HANDLE,
  DEMO_PASSWORD,
  expectPrimaryNav,
  goHomeExpectStudio,
  submitSignIn,
  waitForAuthReady,
} from "./helpers/auth";

/**
 * Auth happy-path smoke against offline demo mode (playwright.config clears
 * VITE_SUPABASE_* so the suite stays CI-safe and idempotent — no live auth side effects).
 *
 * Online password login against real Supabase is out of scope here; demo is the
 * project’s offline session path (prefilled threadandtonic@example.com / demo-password).
 */
test.describe("auth happy path (demo session)", () => {
  test("lands on Studio with authenticated primary chrome", async ({ page }) => {
    await goHomeExpectStudio(page);
  });

  test("Account shows demo session; sign-in form succeeds", async ({ page }) => {
    await waitForAuthReady(page);

    await expect(
      page.getByRole("heading", { name: new RegExp(`Demo mode active as @${DEMO_HANDLE}`, "i") }),
    ).toBeVisible();
    await expect(page.getByText(/local demo session/i)).toBeVisible();

    // Prefills are the documented demo login path
    await expect(page.getByLabel(/^Email$/i)).toHaveValue(DEMO_EMAIL);
    await expect(page.getByLabel(/^Password$/i)).toHaveValue(DEMO_PASSWORD);

    await submitSignIn(page);

    await expect(page.getByText(new RegExp(`Demo session active as @${DEMO_HANDLE}`, "i"))).toBeVisible({
      timeout: 10_000,
    });

    // Still authenticated chrome after successful demo sign-in
    await goHomeExpectStudio(page);
  });

  test("session restores after reload", async ({ page }) => {
    await goHomeExpectStudio(page);

    await page.reload();
    await expect(page.getByRole("heading", { name: /Studio/i })).toBeVisible({ timeout: 15_000 });
    await expectPrimaryNav(page);

    await page.goto("/auth");
    await expect(
      page.getByRole("heading", { name: new RegExp(`Demo mode active as @${DEMO_HANDLE}`, "i") }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Account nav reaches session surface", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Studio/i })).toBeVisible({ timeout: 15_000 });

    await page
      .getByRole("navigation", { name: /Primary navigation/i })
      .getByRole("button", { name: /^Account$/i })
      .click();

    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole("heading", { name: /Demo mode active/i })).toBeVisible({ timeout: 15_000 });
  });

  test("auth/signup deep link keeps demo session usable", async ({ page }) => {
    // Demo builds always expose the local session (no dual-tab online signup UI).
    await page.goto("/auth/signup");
    await expect(page.getByText(/Loading your session/i)).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Demo mode active/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Sign in$/i })).toBeVisible();
    await goHomeExpectStudio(page);
  });
});
