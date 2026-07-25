import { expect, type Page } from "@playwright/test";

/** Seed handles/ids from DEMO_STORES in src/app/demoData.ts (demo mode, real LNS catalog). */
export const DEMO_OWNED_SHOP = {
  handle: "nashvillecanvasloft",
  name: /Nashville Canvas Loft/i,
  id: "demo-nashvillecanvasloft",
} as const;

export const DEMO_FOLLOWABLE_SHOP = {
  handle: "maydel",
  name: /Maydel/i,
  id: "demo-maydel",
} as const;

export const STORE_FOLLOWS_KEY = "needle-point-project:storeFollows";

/** Vite HMR + `load` can stall; prefer domcontentloaded for smoke. */
const nav = { waitUntil: "domcontentloaded" as const, timeout: 30_000 };

export function followButton(page: Page) {
  return page.getByRole("button", { name: /^(Follow store|Following)$/i });
}

/** Deep-link to a known shop and wait for the detail hero. */
export async function openShopByHandle(page: Page, handle: string, name: RegExp) {
  await page.goto(`/stores/${handle}`, nav);
  await expect(page).toHaveURL(new RegExp(`/stores/${handle}`, "i"), { timeout: 15_000 });
  // Handle meta is unique on the detail hero; then assert the h1.
  await expect(page.getByText(new RegExp(`@${handle}`, "i")).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name })).toBeVisible({ timeout: 10_000 });
}

export async function readStoreFollows(page: Page): Promise<string[]> {
  return page.evaluate((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
    } catch {
      return [];
    }
  }, STORE_FOLLOWS_KEY);
}

/**
 * Write follows once, then reload so React state hydrates from localStorage.
 * Do NOT use addInitScript that re-writes on every navigation — that undoes
 * follow toggles before persistence assertions can run.
 */
export async function seedStoreFollows(page: Page, ids: string[]) {
  await page.goto("/", nav);
  await expect(page.getByRole("heading", { name: /Needlepoint Palace/i })).toBeVisible({ timeout: 25_000 });
  await page.evaluate(
    ({ key, next }) => {
      localStorage.setItem(key, JSON.stringify(next));
    },
    { key: STORE_FOLLOWS_KEY, next: ids },
  );
  await page.reload(nav);
  await expect(page.getByRole("heading", { name: /Needlepoint Palace/i })).toBeVisible({ timeout: 25_000 });
  await expect.poll(async () => readStoreFollows(page), { timeout: 5_000 }).toEqual(ids);
}

export async function reloadShopDetail(page: Page, handle: string, name: RegExp) {
  await page.reload(nav);
  await expect(page).toHaveURL(new RegExp(`/stores/${handle}`, "i"));
  await expect(page.getByText(new RegExp(`@${handle}`, "i")).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name })).toBeVisible({ timeout: 10_000 });
}
