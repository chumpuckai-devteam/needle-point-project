import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";
import type { Store, StoreProduct, StoreRole } from "../types";

const STORE_PROFILE_IMAGES_BUCKET = "store-profile-images";
const STORE_PROFILE_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const STORE_PROFILE_IMAGE_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export const STORE_PRODUCT_IMAGES_BUCKET = "store-product-images";
const STORE_PRODUCT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const STORE_PRODUCT_IMAGE_ALLOWED_TYPES = STORE_PROFILE_IMAGE_ALLOWED_TYPES;

export type StoreProfileImageKind = "avatar" | "cover";

type DbStore = {
  id: string;
  owner_user_id: string | null;
  name: string;
  handle: string;
  store_type: "local" | "online" | "both";
  description: string;
  avatar_url: string;
  cover_image_url: string;
  website_url: string;
  location: string;
  city: string;
  region: string;
  country: string;
  ships_nationwide: boolean;
  specialties: string[] | null;
  latitude: number | null;
  longitude: number | null;
  postal_code?: string | null;
};

type DbStoreDetail = DbStore & {
  project_count: number | string | null;
  follower_count: number | string | null;
};

type DbStoreCityDirectoryEntry = {
  city: string;
  region: string;
  country: string;
  city_slug: string;
  region_slug: string;
  country_slug: string;
  shop_count: number | string;
  specialty_preview: string[] | null;
  example_shop_names: string[] | null;
  example_shop_handles: string[] | null;
};

type DbFollowedStore = DbStore & {
  followed_at: string;
  follower_count: number | string | null;
};


export type FollowedStore = Store & {
  /** When the signed-in user followed this shop. */
  followedAt: string;
};

export type StoreFollowConnectionState = {
  storeId: string;
  isFollowing: boolean;
  followedAt: string | null;
  followerCount: number;
};

export type StoreCityDirectoryEntry = {
  city: string;
  region: string;
  country: string;
  citySlug: string;
  regionSlug: string;
  countrySlug: string;
  shopCount: number;
  specialtyPreview: string[];
  exampleShopNames: string[];
  exampleShopHandles: string[];
};

export type StoreFollower = {
  profileId: string;
  name: string;
  handle: string;
  avatarUrl: string;
  followedAt: string;
};

type DbStoreFollowConnectionState = {
  store_id: string;
  is_following: boolean;
  followed_at: string | null;
  follower_count: number | string | null;
};

type DbStoreFollower = {
  profile_id: string;
  name: string;
  handle: string;
  avatar_url: string;
  followed_at: string;
};

function mapStoreFollowConnectionState(row: DbStoreFollowConnectionState): StoreFollowConnectionState {
  return {
    storeId: row.store_id,
    isFollowing: Boolean(row.is_following),
    followedAt: row.followed_at,
    followerCount: Number(row.follower_count) || 0,
  };
}

function mapStoreFollower(row: DbStoreFollower): StoreFollower {
  return {
    profileId: row.profile_id,
    name: row.name,
    handle: row.handle,
    avatarUrl: row.avatar_url || "/assets/needlepoint-hero.png",
    followedAt: row.followed_at,
  };
}

function mapStoreCityDirectoryEntry(row: DbStoreCityDirectoryEntry): StoreCityDirectoryEntry {
  return {
    city: row.city,
    region: row.region,
    country: row.country,
    citySlug: row.city_slug,
    regionSlug: row.region_slug,
    countrySlug: row.country_slug,
    shopCount: Number(row.shop_count) || 0,
    specialtyPreview: row.specialty_preview ?? [],
    exampleShopNames: row.example_shop_names ?? [],
    exampleShopHandles: row.example_shop_handles ?? [],
  };
}

/** Stable frontend query key for the signed-in user's Studio followed-shops rail. */
export const FOLLOWED_STORES_QUERY_KEY = ["stores", "followed", "me"] as const;

type DbProduct = {
  id: string;
  store_id: string;
  name: string;
  description: string;
  image_url: string;
  price_label: string;
  external_url: string;
  category: string;
  sort_order: number;
};

function storeProfileImagePath(storeId: string, kind: StoreProfileImageKind): string {
  return `${storeId}/${kind}`;
}

function storeProfileImageField(kind: StoreProfileImageKind): "avatar_url" | "cover_image_url" {
  return kind === "avatar" ? "avatar_url" : "cover_image_url";
}

export function validateStoreProfileImageFile(file: File): string | null {
  if (!file) return "Choose a shop profile image.";
  if (file.size > STORE_PROFILE_IMAGE_MAX_BYTES) return "Shop profile image must be 4MB or smaller.";
  if (file.type && !STORE_PROFILE_IMAGE_ALLOWED_TYPES.has(file.type)) {
    return "Use a JPG, PNG, WebP, GIF, HEIC, or HEIF image.";
  }
  return null;
}

function storeProductImagePath(storeId: string, productId: string, file: File): string {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safeProduct = productId.replace(/[^a-zA-Z0-9_-]/g, "") || "product";
  return `${storeId}/${safeProduct}/${crypto.randomUUID()}.${ext}`;
}

export function validateStoreProductImageFile(file: File): string | null {
  if (!file) return "Choose a product image.";
  if (file.size > STORE_PRODUCT_IMAGE_MAX_BYTES) return "Product image must be 8MB or smaller.";
  if (file.type && !STORE_PRODUCT_IMAGE_ALLOWED_TYPES.has(file.type)) {
    return "Use a JPG, PNG, WebP, GIF, HEIC, or HEIF image.";
  }
  return null;
}

async function setStoreProfileImageUrl(storeId: string, kind: StoreProfileImageKind, publicUrl: string): Promise<void> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("stores")
    .update({ [storeProfileImageField(kind)]: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", storeId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Only the shop owner can update shop profile images.");
}

function mapStore(
  row: DbStore,
  products: StoreProduct[] = [],
  projectCount = 0,
  followerCount = 0,
): Store {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    handle: row.handle,
    storeType: row.store_type,
    description: row.description,
    avatar: row.avatar_url || "/assets/needlepoint-hero.png",
    coverImage: row.cover_image_url || "/assets/needlepoint-hero.png",
    websiteUrl: row.website_url,
    location: row.location || [row.city, row.region].filter(Boolean).join(", "),
    city: row.city,
    region: row.region,
    country: row.country,
    shipsNationwide: row.ships_nationwide,
    specialties: row.specialties ?? [],
    products,
    projectCount,
    followerCount,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    postalCode: row.postal_code ?? "",
  };
}

function mapProduct(row: DbProduct): StoreProduct {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    description: row.description,
    image: row.image_url || "/assets/needlepoint-hero.png",
    priceLabel: row.price_label,
    externalUrl: row.external_url,
    category: row.category,
  };
}


/** Optional location search params for shop discovery without GPS. */
export type StoreSearchQuery = {
  zip?: string;
  city?: string;
  region?: string;
};

export type NormalizedStoreSearchQuery = {
  city: string;
  region: string;
  zip: string;
};

/** Normalize a store deep-link identifier before public.store_detail lookup. */
export function normalizeStoreIdentifier(identifier: string): string {
  const trimmed = (identifier ?? "").trim();
  const pathless = trimmed
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/stores\//i, "")
    .replace(/^@/, "")
    .split(/[?#]/)[0]
    .trim();
  return pathless.toLowerCase();
}

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type StoreDiscoveryInput =
  | { mode: "zip"; zip: string; radiusMiles?: 60 | 100 | 150 }
  | { mode: "city"; city: string; region?: string; country?: string; radiusMiles?: 60 | 100 | 150 }
  | { mode: "point"; lat: number; lng: number; radiusMiles?: 60 | 100 | 150; source: "location" | "map" | "city-geocode" }
  | { mode: "browse"; cityKey?: string; bounds?: MapBounds; radiusMiles?: 60 | 100 | 150 };

export type CityCandidate = {
  city: string;
  region: string;
  country: string;
  displayLabel: string;
  center?: { lat: number; lng: number };
  shopCount?: number;
};

export type StoreDiscoveryListItem = {
  id: string;
  handle: string;
  name: string;
  storeType: "local" | "online" | "both";
  avatarUrl: string;
  coverImageUrl: string;
  location: string;
  city: string;
  region: string;
  country: string;
  shipsNationwide: boolean;
  specialties: string[];
  projectCount: number;
  followerCount?: number;
  websiteUrl?: string;
  distanceMiles?: number | null;
  proximityRank: "nearby" | "online" | "far";
  detailUrl: string;
};

export type StoreDiscoveryMapPin = {
  storeId: string;
  handle: string;
  name: string;
  lat: number;
  lng: number;
  proximityRank: "nearby" | "far" | "online";
  distanceMiles?: number | null;
  detailUrl: string;
};

export type StoreDiscoveryResponse = {
  query: {
    mode: "zip" | "city" | "point" | "browse";
    displayLabel: string;
    zip?: string;
    city?: string;
    region?: string;
    country?: string;
    center?: { lat: number; lng: number };
    radiusMiles: number;
    expandedFromRadiusMiles?: number;
  };
  status: "ok" | "invalid-input" | "ambiguous-city" | "zero-local" | "geocode-unavailable";
  message?: string;
  cityCandidates?: CityCandidate[];
  list: StoreDiscoveryListItem[];
  mapPins: StoreDiscoveryMapPin[];
  onlineFallback: StoreDiscoveryListItem[];
  counts: {
    totalList: number;
    localWithinRadius: number;
    localOutsideRadius: number;
    onlineFallback: number;
    mapPins: number;
  };
};

type NormalizedStoreDiscoveryInput =
  | { ok: true; input: StoreDiscoveryInput & { radiusMiles: 60 | 100 | 150 } }
  | { ok: false; status: StoreDiscoveryResponse["status"]; message: string; response: StoreDiscoveryResponse };

export const DISCOVERY_RADIUS_VALUES = [60, 100, 150] as const;

function clampDiscoveryRadiusMiles(value: number | undefined): 60 | 100 | 150 {
  if (value == null) return 60;
  if (value <= 60) return 60;
  if (value <= 100) return 100;
  return 150;
}

// Keep export for callers that want the allowed set (eslint: used via type).
export type DiscoveryRadiusOption = (typeof DISCOVERY_RADIUS_VALUES)[number];

function titleCasePlace(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function emptyDiscoveryResponse(
  input: Pick<StoreDiscoveryInput, "mode"> & Partial<StoreDiscoveryInput>,
  status: StoreDiscoveryResponse["status"],
  message: string,
): StoreDiscoveryResponse {
  const radiusMiles = clampDiscoveryRadiusMiles("radiusMiles" in input ? input.radiusMiles : undefined);
  return {
    query: { mode: input.mode, displayLabel: "", radiusMiles },
    status,
    message,
    list: [],
    mapPins: [],
    onlineFallback: [],
    counts: { totalList: 0, localWithinRadius: 0, localOutsideRadius: 0, onlineFallback: 0, mapPins: 0 },
  };
}

export function normalizeStoreDiscoveryInput(input: StoreDiscoveryInput): NormalizedStoreDiscoveryInput {
  const radiusMiles = clampDiscoveryRadiusMiles(input.radiusMiles);
  if (input.mode === "zip") {
    const zip = input.zip.trim().match(/^(\d{5})(?:-?\d{4})?$/)?.[1] ?? "";
    if (!zip) {
      return { ok: false, status: "invalid-input", message: "Enter a 5-digit ZIP code.", response: emptyDiscoveryResponse(input, "invalid-input", "Enter a 5-digit ZIP code.") };
    }
    return { ok: true, input: { mode: "zip", zip, radiusMiles } };
  }

  if (input.mode === "city") {
    const normalized = normalizeStoreSearchQuery({ city: input.city, region: input.region });
    const city = titleCasePlace(normalized.city);
    const region = normalized.region.toUpperCase();
    const country = (input.country ?? "US").trim().toUpperCase() || "US";
    if (!city) {
      return { ok: false, status: "invalid-input", message: "Enter a ZIP or city to search.", response: emptyDiscoveryResponse(input, "invalid-input", "Enter a ZIP or city to search.") };
    }
    if (country !== "US") {
      return { ok: false, status: "invalid-input", message: "Local search is US-only for this beta. Try browsing online shops that ship.", response: emptyDiscoveryResponse(input, "invalid-input", "Local search is US-only for this beta. Try browsing online shops that ship.") };
    }
    return { ok: true, input: { mode: "city", city, region, country, radiusMiles } };
  }

  if (input.mode === "point") {
    const lat = Number(input.lat);
    const lng = Number(input.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { ok: false, status: "invalid-input", message: "Choose a valid map location.", response: emptyDiscoveryResponse(input, "invalid-input", "Choose a valid map location.") };
    }
    return { ok: true, input: { mode: "point", lat, lng, source: input.source, radiusMiles } };
  }

  if (input.bounds) {
    const { north, south, east, west } = input.bounds;
    if (![north, south, east, west].every(Number.isFinite) || north < south || north > 90 || south < -90 || east > 180 || west < -180) {
      return { ok: false, status: "invalid-input", message: "Choose a valid map area.", response: emptyDiscoveryResponse(input, "invalid-input", "Choose a valid map area.") };
    }
  }
  return { ok: true, input: { ...input, radiusMiles } };
}

/**
 * Normalize zip/city/region before search_stores RPC or client ranking.
 * - city/region: trim + lowercase
 * - zip: US 5-digit, strips ZIP+4; invalid tokens become empty
 * - "City, ST" in the city field splits into city + region when region omitted
 * - bare ZIP typed into city is promoted to zip
 */
export function normalizeStoreSearchQuery(query: StoreSearchQuery = {}): NormalizedStoreSearchQuery {
  let cityRaw = (query.city ?? "").trim();
  let regionRaw = (query.region ?? "").trim();
  let zipRaw = (query.zip ?? "").trim();

  if (!zipRaw && /^\d{5}(?:-?\d{4})?$/.test(cityRaw)) {
    zipRaw = cityRaw;
    cityRaw = "";
  }

  if (cityRaw.includes(",") && !regionRaw) {
    const [left, ...rest] = cityRaw.split(",");
    cityRaw = (left ?? "").trim();
    regionRaw = rest.join(",").trim();
  }

  const city = cityRaw.toLowerCase();
  const region = regionRaw.toLowerCase();
  const zipMatch = zipRaw.match(/^(\d{5})(?:-?\d{4})?$/);
  const zip = zipMatch?.[1] ?? "";

  return { city, region, zip };
}

function isLocalStore(store: Store): boolean {
  return store.storeType === "local" || store.storeType === "both";
}

function isOnlineStore(store: Store): boolean {
  return store.storeType === "online" || store.storeType === "both" || store.shipsNationwide;
}

function onlineDiscoveryScore(store: Store): number {
  return (store.projectCount ?? 0) * 10 + (store.shipsNationwide ? 5 : 0) + (store.products?.length ?? 0);
}

function haversineDiscoveryMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.min(1, Math.sqrt(h)));
}

function discoveryCenter(input: StoreDiscoveryInput): { lat: number; lng: number } | null {
  if (input.mode === "point") return { lat: input.lat, lng: input.lng };
  return null;
}

function discoveryLabel(input: StoreDiscoveryInput): string {
  if (input.mode === "zip") return input.zip;
  if (input.mode === "city") return [input.city, input.region].filter(Boolean).join(", ");
  if (input.mode === "point") return input.source === "location" ? "your location" : "selected area";
  return "Browse shops";
}

function mapDiscoveryItem(
  store: Store,
  proximityRank: StoreDiscoveryListItem["proximityRank"],
  distanceMiles: number | null = null,
): StoreDiscoveryListItem {
  return {
    id: store.id,
    handle: store.handle,
    name: store.name,
    storeType: store.storeType,
    avatarUrl: store.avatar,
    coverImageUrl: store.coverImage,
    location: store.location,
    city: store.city,
    region: store.region,
    country: store.country,
    shipsNationwide: store.shipsNationwide,
    specialties: store.specialties,
    projectCount: store.projectCount,
    followerCount: store.followerCount,
    websiteUrl: store.websiteUrl,
    distanceMiles,
    proximityRank,
    detailUrl: `/stores/${store.handle}`,
  };
}

export function storeDiscoveryResponseFromStores(input: StoreDiscoveryInput, stores: Store[]): StoreDiscoveryResponse {
  const normalized = normalizeStoreDiscoveryInput(input);
  if (!normalized.ok) return normalized.response;
  const cleanInput = normalized.input;
  const radiusMiles = cleanInput.radiusMiles;
  const center = discoveryCenter(cleanInput);

  const localWithDistance = stores
    .filter(isLocalStore)
    .map((store) => {
      const hasCoords = store.latitude != null && store.longitude != null;
      const distanceMiles = center && hasCoords ? haversineDiscoveryMiles(center, { lat: store.latitude as number, lng: store.longitude as number }) : null;
      const inBounds =
        cleanInput.mode !== "browse" ||
        !cleanInput.bounds ||
        (hasCoords &&
          (store.latitude as number) <= cleanInput.bounds.north &&
          (store.latitude as number) >= cleanInput.bounds.south &&
          (store.longitude as number) <= cleanInput.bounds.east &&
          (store.longitude as number) >= cleanInput.bounds.west);
      return { store, distanceMiles, inBounds };
    })
    .filter(({ inBounds }) => inBounds);

  const nearby = center
    ? localWithDistance
        .filter(({ distanceMiles }) => distanceMiles != null && distanceMiles <= radiusMiles)
        .sort((a, b) => (a.distanceMiles ?? Number.POSITIVE_INFINITY) - (b.distanceMiles ?? Number.POSITIVE_INFINITY))
    : localWithDistance.sort((a, b) => a.store.name.localeCompare(b.store.name));
  const far = center ? localWithDistance.filter(({ distanceMiles }) => distanceMiles == null || distanceMiles > radiusMiles) : [];

  const onlineFallback = stores
    .filter((store) => isOnlineStore(store) && !nearby.some((near) => near.store.id === store.id))
    .sort((a, b) => {
      const scoreDiff = onlineDiscoveryScore(b) - onlineDiscoveryScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return a.name.localeCompare(b.name);
    })
    .map((store) => mapDiscoveryItem(store, "online", null));

  const list = center
    ? nearby.map(({ store, distanceMiles }) => mapDiscoveryItem(store, "nearby", distanceMiles))
    : nearby.map(({ store }) => mapDiscoveryItem(store, isOnlineStore(store) && !isLocalStore(store) ? "online" : "nearby", null));

  const mapPins = localWithDistance
    .filter(({ store }) => store.latitude != null && store.longitude != null)
    .map(({ store, distanceMiles }) => ({
      storeId: store.id,
      handle: store.handle,
      name: store.name,
      lat: store.latitude as number,
      lng: store.longitude as number,
      proximityRank: center && distanceMiles != null && distanceMiles <= radiusMiles ? ("nearby" as const) : ("far" as const),
      distanceMiles,
      detailUrl: `/stores/${store.handle}`,
    }));

  const label = discoveryLabel(cleanInput);
  const zeroLocal = Boolean(center && nearby.length === 0);
  return {
    query: {
      mode: cleanInput.mode,
      displayLabel: label,
      ...(cleanInput.mode === "zip" ? { zip: cleanInput.zip } : {}),
      ...(cleanInput.mode === "city" ? { city: cleanInput.city, region: cleanInput.region, country: cleanInput.country } : {}),
      ...(center ? { center } : {}),
      radiusMiles,
    },
    status: zeroLocal ? "zero-local" : "ok",
    message: zeroLocal ? `No local shops within ${radiusMiles} miles of ${label}` : undefined,
    list,
    mapPins,
    onlineFallback,
    counts: {
      totalList: list.length,
      localWithinRadius: nearby.length,
      localOutsideRadius: far.length,
      onlineFallback: onlineFallback.length,
      mapPins: mapPins.length,
    },
  };
}

function isStoreDiscoveryResponse(value: unknown): value is StoreDiscoveryResponse {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<StoreDiscoveryResponse>;
  return Boolean(maybe.query && maybe.counts && Array.isArray(maybe.list) && Array.isArray(maybe.mapPins) && Array.isArray(maybe.onlineFallback));
}

export async function searchStoreDiscovery(input: StoreDiscoveryInput, limit = 50): Promise<StoreDiscoveryResponse> {
  const normalized = normalizeStoreDiscoveryInput(input);
  if (!normalized.ok) return normalized.response;
  if (!isSupabaseConfigured) return storeDiscoveryResponseFromStores(normalized.input, []);

  const client = requireSupabase();
  const cleanInput = normalized.input;
  const { data, error } = await client.rpc("search_store_discovery", {
    p_mode: cleanInput.mode,
    p_zip: cleanInput.mode === "zip" ? cleanInput.zip : "",
    p_city: cleanInput.mode === "city" ? cleanInput.city : "",
    p_region: cleanInput.mode === "city" ? cleanInput.region ?? "" : "",
    p_country: cleanInput.mode === "city" ? cleanInput.country ?? "US" : "US",
    p_lat: cleanInput.mode === "point" ? cleanInput.lat : null,
    p_lng: cleanInput.mode === "point" ? cleanInput.lng : null,
    p_radius_miles: cleanInput.radiusMiles,
    p_bounds: cleanInput.mode === "browse" && cleanInput.bounds ? cleanInput.bounds : null,
    p_limit: limit,
  });
  if (error) throw error;
  if (isStoreDiscoveryResponse(data)) return data;
  return storeDiscoveryResponseFromStores(normalized.input, await fetchStores({ limit }));
}

/**
 * Server-side shop search when the client has no lat/lng.
 * Contract: public.search_stores(p_zip, p_city, p_region, p_limit)
 * — location matches first, then online/catalog fallback strength.
 * Only calls the RPC when zip, city, or region is non-empty after normalize.
 */
export async function searchStores(query: StoreSearchQuery = {}, limit = 50): Promise<Store[]> {
  const normalized = normalizeStoreSearchQuery(query);
  if (!normalized.zip && !normalized.city && !normalized.region) {
    return fetchStores();
  }
  if (!isSupabaseConfigured) return [];

  const client = requireSupabase();
  const { data: rows, error } = await client.rpc("search_stores", {
    p_zip: normalized.zip,
    p_city: normalized.city,
    p_region: normalized.region,
    p_limit: limit,
  });
  if (error) throw error;
  if (!rows?.length) return [];

  const ids = (rows as DbStore[]).map((r) => r.id as string);
  const [{ data: products }, { data: links }, { data: followCounts }] = await Promise.all([
    client.from("store_products").select("*").in("store_id", ids).order("sort_order"),
    client.from("project_stores").select("store_id"),
    client.rpc("store_follow_counts"),
  ]);

  const productsByStore = new Map<string, StoreProduct[]>();
  for (const p of (products as DbProduct[] | null) ?? []) {
    const list = productsByStore.get(p.store_id) ?? [];
    list.push(mapProduct(p));
    productsByStore.set(p.store_id, list);
  }
  const projectCounts = new Map<string, number>();
  for (const link of links ?? []) {
    projectCounts.set(link.store_id as string, (projectCounts.get(link.store_id as string) ?? 0) + 1);
  }
  const followerCounts = new Map<string, number>();
  for (const row of (followCounts as { store_id: string; follower_count: number }[] | null) ?? []) {
    followerCounts.set(row.store_id, Number(row.follower_count) || 0);
  }

  const byId = new Map(
    (rows as DbStore[]).map((row) => [
      row.id,
      mapStore(row, productsByStore.get(row.id) ?? [], projectCounts.get(row.id) ?? 0, followerCounts.get(row.id) ?? 0),
    ]),
  );

  // Preserve RPC rank order.
  return ids.map((id) => byId.get(id)).filter((store): store is Store => Boolean(store));
}

/** Load shops; with zip/city/region delegates to search_stores RPC (docs/supabase-setup.md §9). */
export async function fetchStores(query?: StoreSearchQuery & { limit?: number }): Promise<Store[]> {
  if (query) {
    const normalized = normalizeStoreSearchQuery(query);
    if (normalized.zip || normalized.city || normalized.region) {
      return searchStores(query, query.limit ?? 50);
    }
  }
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data: rows, error } = await client.from("stores").select("*").order("name");
  if (error) throw error;
  if (!rows?.length) return [];

  const ids = rows.map((r) => r.id as string);
  const [{ data: products }, { data: links }, { data: followCounts, error: followCountError }] = await Promise.all([
    client.from("store_products").select("*").in("store_id", ids).order("sort_order"),
    client.from("project_stores").select("store_id"),
    client.rpc("store_follow_counts"),
  ]);
  if (followCountError) {
    // Older DBs without the RPC still work without follower counts
  }

  const productsByStore = new Map<string, StoreProduct[]>();
  for (const p of (products as DbProduct[] | null) ?? []) {
    const list = productsByStore.get(p.store_id) ?? [];
    list.push(mapProduct(p));
    productsByStore.set(p.store_id, list);
  }
  const projectCounts = new Map<string, number>();
  for (const link of links ?? []) {
    projectCounts.set(link.store_id, (projectCounts.get(link.store_id) ?? 0) + 1);
  }
  const followerCounts = new Map<string, number>();
  for (const row of (followCounts as { store_id: string; follower_count: number }[] | null) ?? []) {
    followerCounts.set(row.store_id, Number(row.follower_count) || 0);
  }

  return (rows as DbStore[]).map((row) =>
    mapStore(
      row,
      productsByStore.get(row.id) ?? [],
      projectCounts.get(row.id) ?? 0,
      followerCounts.get(row.id) ?? 0,
    ),
  );
}

/**
 * Public no-GPS city directory for /stores browse.
 * Supabase RPC: public.store_city_directory(p_limit)
 * Shape: city/region/country + URL slugs, local/hybrid shop count, specialties, and example shops.
 */
export async function fetchStoreCityDirectory(limit = 100): Promise<StoreCityDirectoryEntry[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data, error } = await client.rpc("store_city_directory", { p_limit: limit });
  if (error) throw error;
  return ((data as DbStoreCityDirectoryEntry[] | null) ?? []).map(mapStoreCityDirectoryEntry);
}

/** Public stable store detail fetch for /stores/:handle or UUID-backed routes. */
export async function fetchStoreByIdentifier(identifier: string): Promise<Store | null> {
  if (!isSupabaseConfigured) return null;
  const normalizedIdentifier = normalizeStoreIdentifier(identifier);
  if (!normalizedIdentifier) return null;

  const client = requireSupabase();
  const { data, error } = await client.rpc("store_detail", { p_identifier: normalizeStoreIdentifier(identifier) }).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as DbStoreDetail;
  const { data: products } = await client
    .from("store_products")
    .select("*")
    .eq("store_id", row.id)
    .order("sort_order");

  return mapStore(
    row,
    ((products as DbProduct[] | null) ?? []).map(mapProduct),
    Number(row.project_count) || 0,
    Number(row.follower_count) || 0,
  );
}

export const fetchStoreBySlug = fetchStoreByIdentifier;

export async function fetchStoreByHandle(handle: string): Promise<Store | null> {
  return fetchStoreByIdentifier(handle);
}

export async function fetchStoresForProject(projectId: string): Promise<{ store: Store; role: StoreRole }[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data: links, error } = await client.from("project_stores").select("store_id, role").eq("project_id", projectId);
  if (error) throw error;
  if (!links?.length) return [];

  const ids = links.map((l) => l.store_id as string);
  const { data: stores, error: storeError } = await client.from("stores").select("*").in("id", ids);
  if (storeError) throw storeError;

  const { data: products } = await client.from("store_products").select("*").in("store_id", ids).order("sort_order");
  const productsByStore = new Map<string, StoreProduct[]>();
  for (const p of (products as DbProduct[] | null) ?? []) {
    const list = productsByStore.get(p.store_id) ?? [];
    list.push(mapProduct(p));
    productsByStore.set(p.store_id, list);
  }

  const byId = new Map(
    ((stores as DbStore[] | null) ?? []).map((s) => [s.id, mapStore(s, productsByStore.get(s.id) ?? [])]),
  );

  return links
    .map((link) => {
      const store = byId.get(link.store_id);
      if (!store) return null;
      return { store, role: link.role as StoreRole };
    })
    .filter((item): item is { store: Store; role: StoreRole } => Boolean(item));
}

export async function setProjectStores(projectId: string, storeIds: string[], role: StoreRole = "available_at") {
  if (!isSupabaseConfigured) return;
  const client = requireSupabase();
  await client.from("project_stores").delete().eq("project_id", projectId).eq("role", role);
  if (!storeIds.length) return;
  const { error } = await client.from("project_stores").insert(
    storeIds.map((store_id) => ({ project_id: projectId, store_id, role })),
  );
  if (error) throw error;
}

export async function fetchProjectIdsForStore(storeId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data, error } = await client.from("project_stores").select("project_id").eq("store_id", storeId);
  if (error) throw error;
  return (data ?? []).map((row) => row.project_id as string);
}

/**
 * Authenticated Studio rail fetch.
 *
 * Supabase RPC: public.my_followed_stores()
 * Query key: FOLLOWED_STORES_QUERY_KEY / ["stores", "followed", "me"]
 * Response shape: FollowedStore[] (Store display fields + followedAt), ordered by newest follow first.
 * Unauthorized callers are rejected before the RPC; the RPC also rejects missing auth.uid().
 */
export async function fetchFollowedStores(): Promise<FollowedStore[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Sign in to load followed shops.");

  const { data, error } = await client.rpc("my_followed_stores");
  if (error) throw error;

  return ((data as DbFollowedStore[] | null) ?? []).map((row) => ({
    ...mapStore(row, [], 0, Number(row.follower_count) || 0),
    followedAt: row.followed_at,
  }));
}

export async function fetchFollowedStoreIds(userId: string): Promise<string[]> {
  void userId;
  return (await fetchFollowedStores()).map((store) => store.id);
}

export async function followStoreOnline(storeId: string): Promise<StoreFollowConnectionState | null> {
  if (!isSupabaseConfigured) return null;
  const client = requireSupabase();
  const { data, error } = await client.rpc("follow_store", { p_store_id: storeId });
  if (error) throw error;
  const [row] = (data as DbStoreFollowConnectionState[] | null) ?? [];
  if (!row) throw new Error("Follow state was not returned.");
  return mapStoreFollowConnectionState(row);
}

export async function unfollowStoreOnline(storeId: string): Promise<StoreFollowConnectionState | null> {
  if (!isSupabaseConfigured) return null;
  const client = requireSupabase();
  const { data, error } = await client.rpc("unfollow_store", { p_store_id: storeId });
  if (error) throw error;
  const [row] = (data as DbStoreFollowConnectionState[] | null) ?? [];
  if (!row) throw new Error("Follow state was not returned.");
  return mapStoreFollowConnectionState(row);
}

export async function isFollowingStoreOnline(storeId: string): Promise<StoreFollowConnectionState | null> {
  if (!isSupabaseConfigured) return null;
  const client = requireSupabase();
  const { data, error } = await client.rpc("is_following_store", { p_store_id: storeId });
  if (error) throw error;
  const [row] = (data as DbStoreFollowConnectionState[] | null) ?? [];
  if (!row) throw new Error("Follow state was not returned.");
  return mapStoreFollowConnectionState(row);
}

export async function fetchStoreFollowing(limit = 50, offset = 0): Promise<FollowedStore[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data, error } = await client.rpc("my_store_following", { p_limit: limit, p_offset: offset });
  if (error) throw error;
  return ((data as DbFollowedStore[] | null) ?? []).map((row) => ({
    ...mapStore(row, [], 0, Number(row.follower_count) || 0),
    followedAt: row.followed_at,
  }));
}

export async function fetchStoreFollowers(storeId: string, limit = 50, offset = 0): Promise<StoreFollower[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data, error } = await client.rpc("store_followers", {
    p_store_id: storeId,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return ((data as DbStoreFollower[] | null) ?? []).map(mapStoreFollower);
}

export async function toggleStoreFollowOnline(userId: string, storeId: string, currentlyFollowing: boolean) {
  void userId;
  if (currentlyFollowing) {
    await unfollowStoreOnline(storeId);
  } else {
    await followStoreOnline(storeId);
  }
}

export type StoreProductInput = {
  name: string;
  description?: string;
  image?: string;
  priceLabel?: string;
  externalUrl?: string;
  category?: string;
  sortOrder?: number;
};

/** Owner-editable shop profile fields (public store page). */
export type StoreProfileInput = {
  name: string;
  description?: string;
  websiteUrl?: string;
  location?: string;
  city?: string;
  region?: string;
  country?: string;
  avatar?: string;
  coverImage?: string;
  specialties?: string[];
  shipsNationwide?: boolean;
};

export type NormalizedStoreProfile = {
  name: string;
  description: string;
  websiteUrl: string;
  location: string;
  city: string;
  avatar: string;
  coverImage: string;
  specialties: string[];
};

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidAssetUrl(value: string) {
  if (!value) return true;
  if (value.startsWith("/") && !/\s/.test(value)) return true;
  return isHttpUrl(value);
}

/** Client-side validation matching public.update_store_profile constraints. */
export function validateStoreProfileInput(input: StoreProfileInput): NormalizedStoreProfile {
  const name = (input.name ?? "").trim();
  const description = (input.description ?? "").trim();
  const websiteUrl = (input.websiteUrl ?? "").trim();
  const location = (input.location ?? "").trim();
  const city = (input.city ?? "").trim();
  const avatar = (input.avatar ?? "").trim();
  const coverImage = (input.coverImage ?? "").trim();
  const specialties = (input.specialties ?? []).map((tag) => tag.trim()).filter(Boolean);

  if (!name) throw new Error("Shop name is required.");
  if (name.length > 80) throw new Error("Shop name must be 80 characters or less.");
  if (description.length > 1000) throw new Error("Description must be 1000 characters or less.");
  if (websiteUrl && !isHttpUrl(websiteUrl)) {
    throw new Error("Website URL must start with http:// or https://.");
  }
  if (location.length > 120 || city.length > 80) throw new Error("Location is too long.");
  if (!isValidAssetUrl(avatar) || !isValidAssetUrl(coverImage)) {
    throw new Error("Image URLs must be relative paths or http(s) URLs.");
  }
  if (specialties.length > 10) throw new Error("Choose up to 10 specialties.");
  if (specialties.some((tag) => tag.length > 40)) throw new Error("Specialties must be 40 characters or less.");

  return { name, description, websiteUrl, location, city, avatar, coverImage, specialties };
}

export async function updateStoreProfileOnline(storeId: string, input: StoreProfileInput): Promise<Store> {
  const normalized = validateStoreProfileInput(input);

  if (!isSupabaseConfigured) {
    return {
      id: storeId,
      ownerUserId: null,
      name: normalized.name,
      handle: "",
      storeType: "online",
      description: normalized.description,
      avatar: normalized.avatar || "/assets/needlepoint-hero.png",
      coverImage: normalized.coverImage || normalized.avatar || "/assets/needlepoint-hero.png",
      websiteUrl: normalized.websiteUrl,
      location: normalized.location || normalized.city,
      city: normalized.city,
      region: "",
      postalCode: "",
      country: "US",
      shipsNationwide: false,
      specialties: normalized.specialties,
      products: [],
      projectCount: 0,
      followerCount: 0,
      latitude: null,
      longitude: null,
    };
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("update_store_profile", {
    p_store_id: storeId,
    p_name: normalized.name,
    p_description: normalized.description,
    p_website_url: normalized.websiteUrl,
    p_location: normalized.location,
    p_city: normalized.city,
    p_avatar_url: normalized.avatar,
    p_cover_image_url: normalized.coverImage,
    p_specialties: normalized.specialties,
  });
  if (error) throw error;
  return mapStore(data as DbStore);
}

export const updateStoreOnline = updateStoreProfileOnline;

export type StoreClaimRequest = {
  id: string;
  storeId: string;
  requesterUserId: string;
  status: "pending" | "approved" | "denied" | "cancelled";
  message: string;
  decisionNote: string;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DbStoreClaimRequest = {
  id: string;
  store_id: string;
  requester_user_id: string;
  status: StoreClaimRequest["status"];
  message: string;
  decision_note: string;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapClaimRequest(row: DbStoreClaimRequest): StoreClaimRequest {
  return {
    id: row.id,
    storeId: row.store_id,
    requesterUserId: row.requester_user_id,
    status: row.status,
    message: row.message,
    decisionNote: row.decision_note,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Request ownership of an unowned shop (moderated claim flow). */
export async function claimStoreOnline(storeId: string, userId: string, message = ""): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  if (!userId) throw new Error("Sign in to request a shop claim.");
  const client = requireSupabase();
  const { data, error } = await client.rpc("request_store_claim", {
    p_store_id: storeId,
    p_message: message,
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function fetchMyStoreClaimRequestsOnline(): Promise<StoreClaimRequest[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data, error } = await client
    .from("store_claim_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as DbStoreClaimRequest[] | null) ?? []).map(mapClaimRequest);
}

export async function approveStoreClaimRequestOnline(
  requestId: string,
  ownerUserId?: string,
  decisionNote = "",
): Promise<Store> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  const client = requireSupabase();
  const { data, error } = await client.rpc("approve_store_claim_request", {
    p_request_id: requestId,
    p_owner_user_id: ownerUserId ?? null,
    p_decision_note: decisionNote,
  });
  if (error) throw error;
  return mapStore(data as DbStore);
}

export async function denyStoreClaimRequestOnline(requestId: string, decisionNote = ""): Promise<StoreClaimRequest> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  const client = requireSupabase();
  const { data, error } = await client.rpc("deny_store_claim_request", {
    p_request_id: requestId,
    p_decision_note: decisionNote,
  });
  if (error) throw error;
  return mapClaimRequest(data as DbStoreClaimRequest);
}

export async function transferStoreOwnerOnline(storeId: string, newOwnerUserId: string): Promise<Store> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  const client = requireSupabase();
  const { data, error } = await client.rpc("transfer_store_owner", {
    p_store_id: storeId,
    p_new_owner_user_id: newOwnerUserId,
  });
  if (error) throw error;
  return mapStore(data as DbStore);
}

export async function uploadStoreProfileImage(
  storeId: string,
  kind: StoreProfileImageKind,
  file: File,
): Promise<string> {
  const invalid = validateStoreProfileImageFile(file);
  if (invalid) throw new Error(invalid);

  if (!isSupabaseConfigured) {
    return URL.createObjectURL(file);
  }

  const client = requireSupabase();
  const path = storeProfileImagePath(storeId, kind);
  const { error } = await client.storage.from(STORE_PROFILE_IMAGES_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;

  const { data } = client.storage.from(STORE_PROFILE_IMAGES_BUCKET).getPublicUrl(path);
  // Cache-bust so replacements show immediately on public profile surfaces.
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
  try {
    await setStoreProfileImageUrl(storeId, kind, publicUrl);
  } catch (syncError) {
    await client.storage.from(STORE_PROFILE_IMAGES_BUCKET).remove([path]);
    throw syncError;
  }
  return publicUrl;
}

export async function removeStoreProfileImage(storeId: string, kind: StoreProfileImageKind): Promise<void> {
  if (!isSupabaseConfigured) return;
  const client = requireSupabase();
  const path = storeProfileImagePath(storeId, kind);
  const { error: storageError } = await client.storage.from(STORE_PROFILE_IMAGES_BUCKET).remove([path]);
  if (storageError) throw storageError;
  await setStoreProfileImageUrl(storeId, kind, "");
}

export async function uploadStoreProductImage(storeId: string, productId: string, file: File): Promise<string> {
  const invalid = validateStoreProductImageFile(file);
  if (invalid) throw new Error(invalid);

  if (!isSupabaseConfigured) {
    return URL.createObjectURL(file);
  }

  const client = requireSupabase();
  const path = storeProductImagePath(storeId, productId, file);
  const { error } = await client.storage.from(STORE_PRODUCT_IMAGES_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;

  const { data } = client.storage.from(STORE_PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function createStoreProductOnline(storeId: string, input: StoreProductInput): Promise<StoreProduct> {
  if (!isSupabaseConfigured) {
    return {
      id: `local-${crypto.randomUUID()}`,
      storeId,
      name: input.name.trim(),
      description: input.description?.trim() || "",
      image: input.image?.trim() || "/assets/needlepoint-hero.png",
      priceLabel: input.priceLabel?.trim() || "",
      externalUrl: input.externalUrl?.trim() || "",
      category: input.category?.trim() || "canvas",
    };
  }
  const client = requireSupabase();
  const { data, error } = await client
    .from("store_products")
    .insert({
      store_id: storeId,
      name: input.name.trim(),
      description: input.description?.trim() || "",
      image_url: input.image?.trim() || "",
      price_label: input.priceLabel?.trim() || "",
      external_url: input.externalUrl?.trim() || "",
      category: input.category?.trim() || "canvas",
      sort_order: input.sortOrder ?? 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapProduct(data as DbProduct);
}

export async function updateStoreProductOnline(productId: string, input: StoreProductInput): Promise<StoreProduct> {
  if (!isSupabaseConfigured) {
    return {
      id: productId,
      storeId: "",
      name: input.name.trim(),
      description: input.description?.trim() || "",
      image: input.image?.trim() || "/assets/needlepoint-hero.png",
      priceLabel: input.priceLabel?.trim() || "",
      externalUrl: input.externalUrl?.trim() || "",
      category: input.category?.trim() || "canvas",
    };
  }
  const client = requireSupabase();
  const { data, error } = await client
    .from("store_products")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || "",
      image_url: input.image?.trim() || "",
      price_label: input.priceLabel?.trim() || "",
      external_url: input.externalUrl?.trim() || "",
      category: input.category?.trim() || "canvas",
      sort_order: input.sortOrder ?? 0,
    })
    .eq("id", productId)
    .select("*")
    .single();
  if (error) throw error;
  return mapProduct(data as DbProduct);
}

export async function deleteStoreProductOnline(productId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const client = requireSupabase();
  const { error } = await client.from("store_products").delete().eq("id", productId);
  if (error) throw error;
}
