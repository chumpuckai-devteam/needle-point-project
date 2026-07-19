import { normalizeStoreIdentifier } from "../api/stores";
import type { Store } from "../types";

/** Location state carried from browse → store detail for sensible back nav. */
export type StoresBrowseLocationState = {
  storesReturnTo?: string;
};

/** Canonical shareable store detail path (handle preferred over id). */
export function storeDetailPath(handleOrId: string): string {
  const normalized = normalizeStoreIdentifier(handleOrId);
  return normalized ? `/stores/${normalized}` : "/stores";
}

/** True when path is a safe in-app return target under /stores (browse or city query). */
export function isStoresBrowseReturnPath(path: string | null | undefined): boolean {
  if (!path || typeof path !== "string") return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  // Allow /stores and /stores?... only — not /stores/:handle detail.
  const [pathname] = path.split(/[?#]/);
  return pathname === "/stores";
}

export function resolveStoresReturnTo(state: unknown, fallback = "/stores"): string {
  if (!state || typeof state !== "object") return fallback;
  const candidate = (state as StoresBrowseLocationState).storesReturnTo;
  return isStoresBrowseReturnPath(candidate) ? (candidate as string) : fallback;
}

/** Match catalog entry by handle (case-insensitive) or stable UUID id. */
export function findStoreByIdentifier(stores: Store[], identifier: string): Store | undefined {
  const normalized = normalizeStoreIdentifier(identifier);
  if (!normalized) return undefined;
  return stores.find((store) => {
    const handle = (store.handle ?? "").trim().toLowerCase();
    const id = (store.id ?? "").trim().toLowerCase();
    return handle === normalized || id === normalized;
  });
}
