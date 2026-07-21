import { expect, test } from "@playwright/test";

test.describe("Private DMs smoke", () => {
  test("messages route loads for guests with sign-in empty state", async ({ page }) => {
    await page.goto("/messages");
    await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Sign in to message|No conversations yet|Private/i).first()).toBeVisible();
  });

  test("sidebar can open messages", async ({ page }) => {
    await page.goto("/");
    const messagesNav = page.getByRole("button", { name: /Messages/i });
    await expect(messagesNav.first()).toBeVisible({ timeout: 15000 });
    await messagesNav.first().click();
    await expect(page).toHaveURL(/\/messages/);
    await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
  });

  test("guests have no unread badge", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Messages/i }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("messages-unread-badge")).toHaveCount(0);
  });
});
