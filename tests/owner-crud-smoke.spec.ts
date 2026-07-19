import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Owner product CRUD smoke against the demo session.
 *
 * Playwright webServer clears VITE_SUPABASE_* so the app boots offline with
 * the seeded demo owner (Canopy Canvas / meCreatorId c2). Unique product
 * names keep reruns isolated; delete leaves no leftover catalog junk.
 *
 * Demo catalog mutations live in React state (not localStorage). Prefer SPA
 * navigations over full reloads when asserting persistence mid-flow.
 */
function productCard(page: Page, name: string): Locator {
  return page.locator("article.product-card").filter({ hasText: name });
}

async function fillLabeledInput(form: Locator, label: RegExp, value: string) {
  await form.locator("label").filter({ hasText: label }).locator("input, textarea, select").first().fill(value);
}

async function openOwnedShop(page: Page) {
  await page.goto("/stores/canopycanvas", { waitUntil: "commit" });
  await expect(page.getByRole("heading", { name: /Canopy Canvas/i })).toBeVisible({ timeout: 20_000 });
}

async function spaBackToOwnedShop(page: Page) {
  await page.getByRole("button", { name: /All stores/i }).click();
  await expect(page).toHaveURL(/\/stores/);
  await page.locator(".store-card").filter({ hasText: /Canopy Canvas/i }).first().click();
  await expect(page).toHaveURL(/\/stores\/canopycanvas/);
  await expect(page.getByRole("heading", { name: /Canopy Canvas/i })).toBeVisible({ timeout: 15_000 });
}

test.describe("owner product CRUD smoke (demo owner)", () => {
  test("create → read → update → delete catalog item on owned shop", async ({ page }) => {
    const stamp = Date.now();
    const name = `QA Smoke Canvas ${stamp}`;
    const updatedName = `QA Smoke Canvas UPD ${stamp}`;
    const price = `from $${(stamp % 90) + 10}`;
    const updatedPrice = `from $${(stamp % 90) + 11}`;
    const externalUrl = `https://example.com/smoke/${stamp}`;
    const description = "Isolated smoke catalog item — delete on exit.";

    await openOwnedShop(page);
    await expect(page.getByText(/Your shop/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Add product/i })).toBeVisible();
    // Demo owner surface: Follow CTA stays hidden on owned shop.
    await expect(page.getByRole("button", { name: /Follow store|Following/i })).toHaveCount(0);

    // --- Create ---
    await page.getByRole("button", { name: /Add product/i }).click();
    const form = page.locator("form.store-product-form").filter({ hasText: /New catalog item|Edit catalog item/i });
    await expect(form).toBeVisible();
    await expect(form.getByText(/New catalog item/i)).toBeVisible();

    await fillLabeledInput(form, /^Name$/i, name);
    await fillLabeledInput(form, /^Description$/i, description);
    await fillLabeledInput(form, /Price label/i, price);
    // Category label text includes option labels — match on field-label, not /^Category$/ alone.
    await form.locator("label").filter({ has: page.locator(".field-label", { hasText: /^Category$/i }) }).locator("select").selectOption("canvas");
    await fillLabeledInput(form, /Shop link/i, externalUrl);

    await form.getByRole("button", { name: /Add to catalog/i }).click();
    await expect(form).toHaveCount(0, { timeout: 15_000 });

    // --- Read / detail assert after create ---
    const created = productCard(page, name);
    await expect(created).toBeVisible({ timeout: 15_000 });
    await expect(created.getByText(description)).toBeVisible();
    await expect(created.getByText(price)).toBeVisible();
    await expect(created.getByRole("link", { name: /Shop link/i })).toHaveAttribute("href", externalUrl);
    await expect(created.getByRole("button", { name: /^Edit$/i })).toBeVisible();
    await expect(created.getByRole("button", { name: /^Delete$/i })).toBeVisible();

    // --- Update ---
    await created.getByRole("button", { name: /^Edit$/i }).click();
    const editForm = page.locator("form.store-product-form").filter({ hasText: /Edit catalog item/i });
    await expect(editForm).toBeVisible();
    await fillLabeledInput(editForm, /^Name$/i, updatedName);
    await fillLabeledInput(editForm, /Price label/i, updatedPrice);
    await editForm.getByRole("button", { name: /Save changes/i }).click();
    await expect(editForm).toHaveCount(0, { timeout: 15_000 });

    const updated = productCard(page, updatedName);
    await expect(updated).toBeVisible({ timeout: 15_000 });
    await expect(updated.getByText(updatedPrice)).toBeVisible();
    await expect(productCard(page, name)).toHaveCount(0);

    // Persistence across SPA navigation (demo catalog is React state).
    await spaBackToOwnedShop(page);
    await expect(productCard(page, updatedName)).toBeVisible({ timeout: 15_000 });
    await expect(productCard(page, updatedName).getByText(updatedPrice)).toBeVisible();

    // --- Delete ---
    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("confirm");
      expect(dialog.message()).toMatch(/Remove/i);
      void dialog.accept();
    });
    await productCard(page, updatedName).getByRole("button", { name: /^Delete$/i }).click();
    await expect(productCard(page, updatedName)).toHaveCount(0, { timeout: 15_000 });
    await expect(productCard(page, name)).toHaveCount(0);

    // Absence after another SPA round-trip — no leftover smoke junk.
    await spaBackToOwnedShop(page);
    await expect(productCard(page, updatedName)).toHaveCount(0);
    await expect(productCard(page, name)).toHaveCount(0);
  });
});
