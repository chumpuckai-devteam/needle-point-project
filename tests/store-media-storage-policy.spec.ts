import { expect, test } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

const root = cwd();
const migrationsDir = join(root, "supabase", "migrations");

function readMigrations(): string {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(join(migrationsDir, name), "utf8"))
    .join("\n");
}

test("store profile media storage bucket is public-read and owner-write only", () => {
  const sql = readMigrations();

  expect(sql).toContain("store-profile-images");
  expect(sql).toContain("Store profile images are owner insertable");
  expect(sql).toContain("Store profile images are owner updatable");
  expect(sql).toContain("Store profile images are owner deletable");
  expect(sql).toContain("public.stores s");
  expect(sql).toContain("s.owner_user_id = (select auth.uid())");
  expect(sql).toContain("allowed_mime_types");
  expect(sql).toContain("file_size_limit");
});

test("store API uploads and removes avatar or cover while syncing store URL fields", () => {
  const storesApi = readFileSync(join(root, "src", "api", "stores.ts"), "utf8");

  expect(storesApi).toContain("uploadStoreProfileImage");
  expect(storesApi).toContain("removeStoreProfileImage");
  expect(storesApi).toContain("store-profile-images");
  expect(storesApi).toContain("avatar_url");
  expect(storesApi).toContain("cover_image_url");
  expect(storesApi).toContain("validateStoreProfileImageFile");
});

test("store product media bucket uses public URLs without broad object listing", () => {
  const sql = readMigrations();
  const storesApi = readFileSync(join(root, "src", "api", "stores.ts"), "utf8");

  expect(sql).toContain("store-product-images");
  expect(sql).toContain('drop policy if exists "Store product images are public readable" on storage.objects');
  expect(sql).toContain("Store product images are owner selectable");
  expect(sql).toContain("Store product images are owner insertable");
  expect(sql).toContain("Store product images are owner updatable");
  expect(sql).toContain("Store product images are owner deletable");
  expect(sql).toContain("from public.store_products sp");
  expect(sql).toContain("join public.stores s on s.id = sp.store_id");
  expect(sql).toContain("sp.id::text = (storage.foldername(storage.objects.name))[2]");
  expect(sql).toContain("s.owner_user_id = (select auth.uid())");
  expect(storesApi).toContain("STORE_PRODUCT_IMAGES_BUCKET");
  expect(storesApi).toContain("uploadStoreProductImage");
  expect(storesApi).toContain("validateStoreProductImageFile");
});

test("storage listing hardening drops legacy public object metadata select policies", () => {
  const hardeningSql = readFileSync(
    join(migrationsDir, "20260719205500_tighten_storage_listing_rls.sql"),
    "utf8",
  );

  expect(hardeningSql).toContain('drop policy if exists "Public read project images" on storage.objects');
  expect(hardeningSql).toContain('drop policy if exists "Store product images are public readable" on storage.objects');
  expect(hardeningSql).toContain("Project images are owner selectable");
  expect(hardeningSql).toContain("Store product images are owner selectable");
  expect(hardeningSql).not.toContain("for select\n  to anon");
  expect(hardeningSql).not.toContain("using (bucket_id = 'store-product-images')");
});
