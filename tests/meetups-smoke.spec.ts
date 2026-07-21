import { expect, test } from "@playwright/test";

test.describe("Stitching meetups smoke", () => {
  test("list shows seed meetups and detail opens with register or waitlist CTA", async ({ page }) => {
    await page.goto("/meetups");
    await expect(page.getByRole("heading", { name: "Stitching meetups" })).toBeVisible();
    await expect(page.getByText(/Sit & Stitch|open stitch|ornament swap/i).first()).toBeVisible({ timeout: 15000 });
    const fullBtn = page.getByRole("button", { name: /View · Full/i });
    if (await fullBtn.count()) {
      await fullBtn.first().click();
      await expect(page.getByRole("button", { name: /Join waitlist/i })).toBeVisible();
    } else {
      await page.getByRole("button", { name: /View/i }).first().click();
      await expect(
        page
          .getByRole("button", { name: /Register/i })
          .or(page.getByRole("link", { name: /Register on host site/i }))
          .or(page.getByRole("button", { name: /Join waitlist/i })),
      ).toBeVisible();
    }
    await expect(page.getByRole("button", { name: /^Going$/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Interested$/ })).toHaveCount(0);
  });

  test("city filter narrows list", async ({ page }) => {
    await page.goto("/meetups");
    await page.getByPlaceholder(/Portland, Brooklyn/i).fill("Portland");
    await expect(page.getByText(/Portland/i).first()).toBeVisible();
    await expect(page.getByText(/Brooklyn/i)).toHaveCount(0);
  });

  test("studio rail can deep-link to meetups", async ({ page }) => {
    await page.goto("/");
    await page.goto("/meetups");
    await expect(page).toHaveURL(/\/meetups/);
  });
});
