import { expect, test, type Page } from "@playwright/test";

/**
 * Critical-path e2e coverage gaps beyond existing smoke slices
 * (auth, owner CRUD, available-at, shop follow, V3 matrix).
 *
 * Runs against Playwright webServer demo mode (VITE_SUPABASE_* cleared).
 * Prefer role/label selectors + UI waits — no fixed sleeps.
 */

const nav = { waitUntil: "domcontentloaded" as const, timeout: 30_000 };

async function goStudio(page: Page) {
  await page.goto("/", nav);
  await expect(page.getByRole("heading", { name: /Needlepoint Palace/i })).toBeVisible({ timeout: 20_000 });
}

async function openNav(page: Page, label: RegExp) {
  await page
    .getByRole("navigation", { name: /Primary navigation/i })
    .getByRole("button", { name: label })
    .click();
}

async function openSeededDiscoverProject(page: Page, query: string, title: RegExp) {
  await page.goto("/discover", nav);
  const search = page.getByPlaceholder(/Try florals|Search/i);
  await expect(search).toBeVisible({ timeout: 20_000 });
  await search.fill(query);
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 });
  await page.getByText(title).first().click();
  await expect(page).toHaveURL(/\/projects\//);
  await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 15_000 });
}

test.describe("Needlepoint Palace feed critical path", () => {
  test("loads feed posts and opens a project from the timeline", async ({ page }) => {
    await goStudio(page);

    const feed = page.getByRole("region", { name: /Needlepoint Palace feed/i }).or(page.locator(".feed-timeline[aria-label='Needlepoint Palace feed']"));
    await expect(feed.first()).toBeVisible({ timeout: 15_000 });

    // Seeded public projects appear (private Midnight Sampler must not).
    await expect(page.getByText(/Persimmon Garden Pillow|Tiny Ski Lodge|Bookshop Door|Blue Hydrangea/i).first()).toBeVisible();
    await expect(page.getByText(/Midnight Sampler/i)).toHaveCount(0);

    // Open via media or title control inside the first feed post.
    const firstPost = page.locator("article.feed-post").first();
    await expect(firstPost).toBeVisible();
    await firstPost.locator("button.feed-media, button.feed-post-text").first().click();
    await expect(page).toHaveURL(/\/projects\//);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("like toggle flips pressed state on a feed post", async ({ page }) => {
    await goStudio(page);

    const likeBtn = page.locator("article.feed-post").first().getByRole("button", { name: /^(Like|Unlike)$/i });
    await expect(likeBtn).toBeVisible({ timeout: 15_000 });

    const beforePressed = await likeBtn.getAttribute("aria-pressed");
    await likeBtn.click();
    await expect(likeBtn).toHaveAttribute("aria-pressed", beforePressed === "true" ? "false" : "true");

    // Toggle back for isolation within the same SPA session.
    await likeBtn.click();
    await expect(likeBtn).toHaveAttribute("aria-pressed", beforePressed ?? "false");
  });
});

test.describe("Discover list + empty path", () => {
  test("search hit then empty nonsense query shows empty state and reset", async ({ page }) => {
    await page.goto("/discover", nav);
    const search = page.getByPlaceholder(/Try florals|Search/i);
    await expect(search).toBeVisible({ timeout: 20_000 });

    await search.fill("bookshop");
    await expect(page.getByText(/Bookshop Door Canvas/i).first()).toBeVisible({ timeout: 15_000 });

    // Failure / empty path
    await search.fill(`zzznomatch-${Date.now()}`);
    await expect(page.getByText(/No matching projects/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Try a broader stitch/i)).toBeVisible();

    await page.getByRole("button", { name: /Reset filters/i }).click();
    await expect(page.getByText(/No matching projects/i)).toHaveCount(0);
    await expect(page.locator(".feed-timeline.discover-feed article, article.feed-post").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("private demo draft never appears in Discover results", async ({ page }) => {
    await page.goto("/discover", nav);
    const search = page.getByPlaceholder(/Try florals|Search/i);
    await expect(search).toBeVisible({ timeout: 20_000 });
    await search.fill("Midnight Sampler");
    await expect(page.getByText(/No matching projects/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Midnight Sampler/i)).toHaveCount(0);
  });
});

test.describe("Journal create / edit", () => {
  test("empty title keeps Save disabled (validation path)", async ({ page }) => {
    await page.goto("/journal", nav);
    await expect(page.getByRole("heading", { name: /Create a project entry/i })).toBeVisible({ timeout: 20_000 });

    const title = page.getByLabel(/^Title/i).first();
    await expect(title).toBeVisible();
    await title.fill("");
    // Clear any residual draft value from controlled input.
    await title.fill(" ");
    await title.fill("");

    const save = page.getByRole("button", { name: /Save project/i });
    await expect(save).toBeDisabled();
  });

  test("create project lands on detail and appears in Your journal", async ({ page }) => {
    const stamp = Date.now();
    const title = `QA Journal Canvas ${stamp}`;
    const notes = `Smoke create notes ${stamp}`;

    await page.goto("/journal", nav);
    await expect(page.getByRole("heading", { name: /Create a project entry/i })).toBeVisible({ timeout: 20_000 });

    await page.getByLabel(/^Title/i).first().fill(title);
    await page.locator("#project-notes").fill(notes);
    await page.locator("#project-status").selectOption("in progress");
    await page.locator("#project-difficulty").selectOption("beginner");

    // Tag a store so Available at stays wired on the new project.
    const storeSearch = page.getByTestId("journal-store-search");
    if (await storeSearch.count()) {
      await storeSearch.getByPlaceholder(/Search shops/i).fill("Maydel");
      const hit = storeSearch.locator(".store-search-result").filter({ hasText: /Maydel/i }).first();
      if (await hit.count()) await hit.click();
    }

    await page.getByRole("button", { name: /Save project/i }).click();

    await expect(page).toHaveURL(/\/projects\//, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(notes).first()).toBeVisible();
    // Owner chrome
    await expect(page.getByRole("button", { name: /Edit project/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add update/i })).toBeVisible();

    if (await page.locator(".available-at").count()) {
      await expect(page.locator(".available-at button.store-chip").filter({ hasText: /Maydel/i })).toBeVisible();
    }

    // Side journal list after SPA nav back to form
    await openNav(page, /New post/i);
    await expect(page).toHaveURL(/\/journal/);
    await expect(page.getByRole("heading", { name: /Your journal|Create a project entry/i }).first()).toBeVisible();
    await expect(page.locator("button.mini-update").filter({ hasText: title })).toBeVisible({ timeout: 15_000 });
  });

  test("owner edits project title and it persists after SPA round-trip", async ({ page }) => {
    // Demo owner is c2 — owns Tiny Ski Lodge Ornament (p2).
    await page.goto("/discover", nav);
    const search = page.getByPlaceholder(/Try florals|Search/i);
    await expect(search).toBeVisible({ timeout: 20_000 });
    await search.fill("ski lodge");
    await expect(page.getByText(/Tiny Ski Lodge Ornament/i).first()).toBeVisible({ timeout: 15_000 });
    await page.getByText(/Tiny Ski Lodge Ornament/i).first().click();
    await expect(page).toHaveURL(/\/projects\//);

    const stamp = Date.now();
    const nextTitle = `Tiny Ski Lodge QA ${stamp}`;

    await page.getByRole("button", { name: /Edit project/i }).click();
    const titleField = page.getByLabel(/^Title/i).first();
    await expect(titleField).toBeVisible();
    await titleField.fill(nextTitle);
    await page.getByRole("button", { name: /Save changes/i }).click();

    await expect(page.getByRole("heading", { name: nextTitle })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Edit project/i })).toBeVisible();

    // SPA navigate away and back via journal mini list or discover
    await openNav(page, /New post/i);
    await page.locator("button.mini-update").filter({ hasText: nextTitle }).click();
    await expect(page).toHaveURL(/\/projects\//);
    await expect(page.getByRole("heading", { name: nextTitle })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Project social + progress", () => {
  test("owner posts a progress update on owned project", async ({ page }) => {
    await openSeededDiscoverProject(page, "ski lodge", /Tiny Ski Lodge Ornament/i);

    const stamp = Date.now();
    const milestone = `QA milestone ${stamp}`;
    const note = `QA progress note ${stamp}`;

    await page.locator("#update-milestone").fill(milestone);
    await page.getByPlaceholder(/Log a stitch choice/i).fill(note);
    const add = page.getByRole("button", { name: /Add update/i });
    await expect(add).toBeEnabled();
    await add.click();

    await expect(page.locator("article.timeline").filter({ hasText: milestone })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("article.timeline").filter({ hasText: note })).toBeVisible();
  });

  test("comment on latest update is accepted", async ({ page }) => {
    await openSeededDiscoverProject(page, "ski lodge", /Tiny Ski Lodge Ornament/i);

    const body = `QA comment ${Date.now()}`;
    await page.getByPlaceholder(/Comment on the latest update/i).fill(body);
    await page.getByRole("button", { name: /^Comment$/i }).click();
    await expect(page.locator("p.comment").filter({ hasText: body })).toBeVisible({ timeout: 15_000 });
  });

  test("save toggles into Collections board and can unsave", async ({ page }) => {
    // p4 Blue Hydrangea Belt starts unsaved in seed.
    await openSeededDiscoverProject(page, "hydrangea", /Blue Hydrangea Belt/i);

    // Prefer the project detail bookmark control (contains "Save" text).
    const detailSave = page.locator(".card-actions button").filter({ hasText: /Save/i }).first();
    await expect(detailSave).toBeVisible({ timeout: 15_000 });

    const wasSelected = await detailSave.evaluate((el) => el.classList.contains("selected"));
    if (wasSelected) {
      await detailSave.click();
      await expect(detailSave).not.toHaveClass(/selected/);
    }

    await detailSave.click();
    await expect(detailSave).toHaveClass(/selected/);

    await page.goto("/collections", nav);
    await expect(page.getByRole("heading", { name: /Saved projects/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Blue Hydrangea Belt/i).first()).toBeVisible({ timeout: 15_000 });

    // Unsave from collections tile → project detail → Save again
    await page.getByRole("button", { name: /Blue Hydrangea Belt/i }).first().click();
    await expect(page).toHaveURL(/\/projects\//);
    const saveAgain = page.locator(".card-actions button").filter({ hasText: /Save/i }).first();
    await expect(saveAgain).toHaveClass(/selected/);
    await saveAgain.click();
    await expect(saveAgain).not.toHaveClass(/selected/);

    await page.goto("/collections", nav);
    // Board may still list other seeds; this title should leave the default board.
    const hydrangeaTiles = page.locator("button.saved-tile").filter({ hasText: /Blue Hydrangea Belt/i });
    await expect(hydrangeaTiles).toHaveCount(0);
  });
});

test.describe("Stitch-along + profile", () => {
  test("list, open detail, join toggle", async ({ page }) => {
    await page.goto("/stitch-along", nav);
    await expect(page.getByRole("heading", { name: /Stitch-alongs/i })).toBeVisible({ timeout: 20_000 });

    // Multi-SAL demo catalog
    await expect(page.getByText(/July Bookshop Windows Stitch-Along/i).first()).toBeVisible();
    await expect(page.locator("button.sal-card").first()).toBeVisible();

    await page.locator("button.sal-card").filter({ hasText: /July Bookshop Windows/i }).first().click();
    await expect(page).toHaveURL(/\/stitch-along\//);
    await expect(page.getByRole("heading", { name: /July Bookshop Windows/i })).toBeVisible({ timeout: 15_000 });

    const join = page.getByRole("button", { name: /Join stitch-along|Joined/i });
    await expect(join).toBeVisible();
    const before = (await join.textContent())?.trim() ?? "";
    await join.click();
    await expect(join).not.toHaveText(before, { timeout: 10_000 });
    // Prefer ending on Joined for demo
    if (/^Join /i.test((await join.textContent()) ?? "")) {
      await join.click();
    }
    await expect(join).toHaveText(/Joined/i);

    await page.getByRole("button", { name: /All stitch-alongs/i }).click();
    await expect(page).toHaveURL(/\/stitch-along\/?$/);
  });

  test("profile deep link shows creator grid and follow toggle", async ({ page }) => {
    await page.goto("/u/mara_stitches", nav);
    await expect(page.getByRole("heading", { name: /Mara Chen/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/@mara_stitches/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Projects$/i })).toBeVisible();

    const grid = page.getByLabel(/Profile project grid/i);
    await expect(grid).toBeVisible();
    await expect(grid.locator("button.ig-grid-cell").first()).toBeVisible();

    const follow = page.getByRole("button", { name: /^(Follow|Following)$/i });
    await expect(follow).toBeVisible();
    const before = (await follow.textContent())?.trim() ?? "";
    await follow.click();
    await expect(follow).not.toHaveText(before);
  });
});

test.describe("Routing empty / unknown paths", () => {
  test("missing project id shows empty chrome without leaking title", async ({ page }) => {
    await page.goto("/projects/does-not-exist-xyz", nav);
    await expect(page.getByRole("strong").filter({ hasText: /Project not (found|available)/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator(".state-block-body")).toContainText(/private|moved|no longer shared|not available/i);
    await page.getByRole("button", { name: /Back to [Dd]iscover/i }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("unknown path redirects to Needlepoint Palace home", async ({ page }) => {
    await page.goto("/this-route-is-not-real", nav);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: /Needlepoint Palace/i })).toBeVisible({ timeout: 20_000 });
  });
});
