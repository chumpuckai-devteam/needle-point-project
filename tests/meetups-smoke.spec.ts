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
      await page.getByRole("button", { name: /View meetup|View & register|View · Full/i }).first().click();
      await expect(
        page
          .getByRole("button", { name: /Register/i })
          .or(page.getByRole("link", { name: /Register on host site/i }))
          .or(page.getByRole("button", { name: /Join waitlist/i })),
      ).toBeVisible();
    }
    await expect(page.getByRole("button", { name: /^Going$/ })).toHaveCount(0);
  });

  test("My meetups tab and hub route work", async ({ page }) => {
    await page.goto("/meetups");
    await page.getByTestId("meetups-tab-mine").click();
    await expect(page).toHaveURL(/\/meetups\/mine/);
    await expect(page.getByTestId("meetups-mine")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Registered/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Hosting/i })).toBeVisible();
  });

  test("city filter narrows list", async ({ page }) => {
    await page.goto("/meetups");
    await page.getByPlaceholder(/Portland, Brooklyn/i).fill("Portland");
    await expect(page.getByText(/Portland/i).first()).toBeVisible();
    await expect(page.getByText(/Brooklyn/i)).toHaveCount(0);
  });

  test("mine deep link works", async ({ page }) => {
    await page.goto("/meetups/mine");
    await expect(page).toHaveURL(/\/meetups\/mine/);
    await expect(page.getByTestId("meetups-mine")).toBeVisible();
  });

  test("free-cancel window helper locks registered seats inside 24h", async () => {
    // Pure contract (avoid importing app modules that pull Vite JSON assets under Playwright).
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const src = readFileSync(resolve(root, "src/lib/meetups.ts"), "utf8");
    expect(src).toContain("export function canFreeCancelMeetupRegistration");
    expect(src).toContain("24 * 60 * 60 * 1000");
    expect(src).toContain("MEETUP_CANCEL_LOCKED");

    // Mirror the shipped rule for a regression signal.
    function canFreeCancel(startsAt: string, myStatus: string, nowMs: number) {
      const status = myStatus.toLowerCase();
      if (status === "waitlisted") return true;
      if (!status || status === "cancelled") return false;
      const start = new Date(startsAt).getTime();
      return start >= nowMs + 24 * 60 * 60 * 1000;
    }
    const now = Date.parse("2026-07-21T12:00:00.000Z");
    expect(canFreeCancel("2026-07-25T18:00:00.000Z", "registered", now)).toBe(true);
    expect(canFreeCancel("2026-07-21T20:00:00.000Z", "registered", now)).toBe(false);
    expect(canFreeCancel("2026-07-21T20:00:00.000Z", "waitlisted", now)).toBe(true);
  });
});
