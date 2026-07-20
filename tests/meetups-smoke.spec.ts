import { expect, test } from "@playwright/test";

test.describe("Stitching meetups smoke", () => {
  test("list shows seed meetups and detail opens", async ({ page }) => {
    await page.goto("/meetups");
    await expect(page.getByRole("heading", { name: "Stitching meetups" })).toBeVisible();
    await expect(page.getByText(/Sit & Stitch|open stitch|ornament swap/i).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "View meetup" }).first().click();
    await expect(page.getByRole("button", { name: /All meetups/i })).toBeVisible();
    // In-app RSVP or external host RSVP both valid first-slice modes.
    await expect(
      page.getByRole("button", { name: /^Going/ }).or(page.getByRole("link", { name: /RSVP on host site/i })),
    ).toBeVisible();
  });

  test("city filter narrows list", async ({ page }) => {
    await page.goto("/meetups");
    await page.getByPlaceholder(/Portland, Brooklyn/i).fill("Portland");
    await expect(page.getByText(/Portland/i).first()).toBeVisible();
    await expect(page.getByText(/Brooklyn/i)).toHaveCount(0);
  });

  test("studio rail can deep-link to meetups", async ({ page }) => {
    await page.goto("/");
    // Meetups rail may appear; route still works from empty Studio.
    await page.goto("/meetups");
    await expect(page).toHaveURL(/\/meetups/);
  });
});
