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

  test("DM errors stay human-readable and list_dm_messages conflict fix is documented", async () => {
    const { readFileSync, readdirSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const dms = readFileSync(resolve(root, "src/api/dms.ts"), "utf8");
    expect(dms).toContain("friendlyDmError");
    expect(dms).toContain("ambiguous");
    const { friendlyDmError } = await import("../src/api/dms");
    expect(
      friendlyDmError(
        { message: 'column reference "thread_id" is ambiguous' },
        "Could not load conversation",
      ),
    ).toBe("Could not load conversation");
    expect(friendlyDmError({ message: "Message cannot be empty" }, "fallback")).toBe("Message cannot be empty");
    const migrations = readdirSync(resolve(root, "supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .map((n) => readFileSync(resolve(root, "supabase/migrations", n), "utf8"))
      .join("\n");
    expect(migrations).toMatch(/list_dm_messages[\s\S]*variable_conflict use_column|fix_list_dm_messages_thread_id/);
  });

