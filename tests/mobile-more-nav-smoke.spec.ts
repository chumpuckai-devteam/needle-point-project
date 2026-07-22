import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("mobile bar shows 4 labeled slots with no scroll; More opens sheet", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator(".sidebar-nav-mobile");
  await expect(nav).toBeVisible({ timeout: 15_000 });

  const buttons = nav.getByRole("button");
  await expect(buttons).toHaveCount(4);

  for (const name of [/Studio/i, /Discover/i, /Shops/i, /More/i]) {
    const btn = nav.getByRole("button", { name });
    await expect(btn).toBeVisible();
    const box = await btn.boundingBox();
    expect(box).toBeTruthy();
    // fully on-screen (not clipped off the right edge)
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390 + 1);
  }

  // no horizontal overflow on the bar
  const overflow = await nav.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

  await nav.getByTestId("mobile-more-nav").click();
  const sheet = page.getByRole("dialog", { name: "More" });
  await expect(sheet).toBeVisible();
  const saved = sheet.getByRole("button", { name: /Saved boards/i });
  await expect(saved).toBeVisible();
  const color = await saved.evaluate((el) => getComputedStyle(el).color);
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  expect(m).toBeTruthy();
  const [, r, g, b] = m!.map(Number);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  expect(luminance).toBeLessThan(0.45);
  await saved.click();
  await expect(page).toHaveURL(/\/collections/);
});
