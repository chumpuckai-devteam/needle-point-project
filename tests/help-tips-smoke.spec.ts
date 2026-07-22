import { expect, test } from "@playwright/test";

test("help coach auto-starts, advances, and can be skipped", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("needle-point-project:helpTips"));
  await page.reload();
  const coach = page.getByTestId("help-coach");
  await expect(coach).toBeVisible({ timeout: 5000 });
  await expect(coach.getByRole("heading", { name: /Needlepoint Palace|Studio/i })).toBeVisible();
  await page.getByTestId("help-coach-next").click();
  await expect(coach.getByRole("heading", { name: /Discover/i })).toBeVisible();
  await coach.getByRole("button", { name: /Skip tips/i }).click();
  await expect(coach).toHaveCount(0);
  const stored = await page.evaluate(() => localStorage.getItem("needle-point-project:helpTips"));
  expect(stored).toBeTruthy();
  expect(stored).toMatch(/"completed":\s*true/);
  // Reload without clearing — should not auto-start again
  await page.reload();
  await page.waitForTimeout(1200);
  await expect(page.getByTestId("help-coach")).toHaveCount(0);
});
