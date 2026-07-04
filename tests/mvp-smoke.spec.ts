import { expect, test } from "@playwright/test";

test("core MVP flows are usable", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Track the work/ })).toBeVisible();

  await page.getByRole("button", { name: /Discover/ }).click();
  await page.getByPlaceholder(/Try florals/).fill("bookshop");
  await expect(page.getByText("Bookshop Door Canvas").first()).toBeVisible();

  await page.getByRole("button", { name: /Journal/ }).click();
  await page.getByLabel("Title").fill("Sampler Test Canvas");
  await page.getByLabel("Notes").fill("Testing a new progress journal entry during smoke testing.");
  await page.getByRole("button", { name: /Save project/ }).click();
  await expect(page.getByRole("heading", { name: "Sampler Test Canvas" })).toBeVisible();

  await page.getByPlaceholder(/Log a stitch choice/).fill("Added the first row and chose a calmer green.");
  await page.getByRole("button", { name: /Add update/ }).click();
  await expect(page.getByText("Added the first row")).toBeVisible();

  await page.getByPlaceholder(/Comment on the latest update/).fill("Looks ready for the next pass.");
  await page.getByRole("button", { name: /^Comment$/ }).click();
  await expect(page.getByText("Looks ready for the next pass.")).toBeVisible();

  await page.getByRole("button", { name: /Stitch-along/ }).click();
  await page.getByRole("button", { name: /Join stitch-along/ }).click();
  await page.getByRole("button", { name: /Sampler Test Canvas/ }).click();
  await expect(page.getByRole("button", { name: /Sampler Test Canvas.*Submitted/ })).toBeVisible();
});
