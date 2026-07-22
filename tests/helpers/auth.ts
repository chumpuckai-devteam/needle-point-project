import { expect, type Page } from "@playwright/test";

/** Prefill values from AuthForm sign-in defaults (demo path). */
export const DEMO_EMAIL = "threadandtonic@example.com";
export const DEMO_PASSWORD = "demo-password";
export const DEMO_HANDLE = "threadandtonic";

/** Wait until AuthPage finishes session loading. */
export async function waitForAuthReady(page: Page) {
  await page.goto("/auth");
  await expect(page.getByText(/Loading your session/i)).toHaveCount(0, { timeout: 15_000 });
}

export async function expectPrimaryNav(page: Page) {
  const nav = page.getByRole("navigation", { name: /Primary navigation/i });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("button", { name: /^Palace$/i })).toBeVisible();
  await expect(nav.getByRole("button", { name: /^Account$/i })).toBeVisible();
}

/** Authenticated chrome: Needlepoint Palace home + primary nav Account entry. */
export async function goHomeExpectStudio(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Needlepoint Palace/i })).toBeVisible({ timeout: 15_000 });
  await expectPrimaryNav(page);
}

export async function submitSignIn(page: Page, email = DEMO_EMAIL, password = DEMO_PASSWORD) {
  await page.getByLabel(/^Email$/i).fill(email);
  await page.getByLabel(/^Password$/i).fill(password);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
}
