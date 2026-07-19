import { expect, test } from "@playwright/test";

test.describe("Epic P density smoke", () => {
  test("collections page can create a new board in demo", async ({ page }) => {
    await page.goto("/collections");
    await expect(page.getByRole("heading", { name: /Saved projects and inspiration boards/i })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: /New board/i }).click();
    await page.getByPlaceholder(/Holiday finishing/i).fill(`QA Board ${Date.now()}`);
    await page.getByRole("button", { name: /Create board/i }).click();
    await expect(page.getByRole("heading", { name: /QA Board/i })).toBeVisible({ timeout: 10_000 });
  });

  test("project detail exposes Report for non-owned project", async ({ page }) => {
    // p1 is Mara's public project; demo user is c2
    await page.goto("/projects/p1");
    await expect(page.getByRole("heading", { name: /Persimmon Garden Pillow/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /^Report$/i })).toBeVisible();
    await page.getByRole("button", { name: /^Report$/i }).click();
    await expect(page.getByRole("button", { name: /Submit report/i })).toBeVisible();
    await page.getByRole("button", { name: /Submit report/i }).click();
    await expect(page.getByText(/Thanks — report queued/i)).toBeVisible({ timeout: 8_000 });
  });

  test("stitch-along list shows host create for demo", async ({ page }) => {
    await page.goto("/stitch-along");
    await expect(page.getByRole("heading", { name: /Stitch-alongs/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Host|Create/i }).first()).toBeVisible();
  });

  test("private project not found for wrong id still empty chrome", async ({ page }) => {
    await page.goto("/projects/does-not-exist");
    await expect(page.getByText(/Project not (found|available)/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
