import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("mobile bar is 4 items and More sheet text is visible", async ({ page }) => {
  await page.goto("/");
  const more = page.getByTestId("mobile-more-nav");
  await expect(more).toBeVisible({ timeout: 15_000 });

  // Primary should not include New post in the bottom bar when More is used
  const mobileNav = page.locator(".sidebar-nav-mobile");
  await expect(mobileNav.getByRole("button", { name: /Studio/i })).toBeVisible();
  await expect(mobileNav.getByRole("button", { name: /Discover/i })).toBeVisible();
  await expect(mobileNav.getByRole("button", { name: /Shops/i })).toBeVisible();
  await expect(mobileNav.getByRole("button", { name: /More/i })).toBeVisible();
  await expect(mobileNav.getByRole("button", { name: /New post/i })).toHaveCount(0);

  await more.click();
  const sheet = page.getByRole("dialog", { name: "More" });
  await expect(sheet).toBeVisible();

  const saved = sheet.getByRole("button", { name: /Saved boards/i });
  await expect(saved).toBeVisible();
  // Contrast check: computed color should be dark, not near-white
  const color = await saved.evaluate((el) => getComputedStyle(el).color);
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  expect(m).toBeTruthy();
  const [, r, g, b] = m!.map(Number);
  // dark ink ~ #1f2a24 — luminance should be low
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  expect(luminance).toBeLessThan(0.45);

  await saved.click();
  await expect(page).toHaveURL(/\/collections/);
});
