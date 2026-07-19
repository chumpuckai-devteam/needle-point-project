import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";
import type { Store, StoreProduct, StoreRole } from "../types";

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
};

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

export async function fetchStores(): Promise<Store[]> {
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

export async function fetchStoreByHandle(handle: string): Promise<Store | null> {
  if (!isSupabaseConfigured) return null;
  const client = requireSupabase();
  const { data, error } = await client.from("stores").select("*").eq("handle", handle).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [{ data: products }, { data: links }, { data: followCounts }] = await Promise.all([
    client.from("store_products").select("*").eq("store_id", data.id).order("sort_order"),
    client.from("project_stores").select("project_id").eq("store_id", data.id),
    client.rpc("store_follow_counts"),
  ]);

  const followerCount =
    ((followCounts as { store_id: string; follower_count: number }[] | null) ?? []).find((row) => row.store_id === data.id)
      ?.follower_count ?? 0;

  return mapStore(
    data as DbStore,
    ((products as DbProduct[] | null) ?? []).map(mapProduct),
    (links ?? []).length,
    Number(followerCount) || 0,
  );
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

export async function fetchFollowedStoreIds(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data, error } = await client.from("store_follows").select("store_id").eq("follower_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.store_id as string);
}

export async function toggleStoreFollowOnline(userId: string, storeId: string, currentlyFollowing: boolean) {
  if (!isSupabaseConfigured) return;
  const client = requireSupabase();
  if (currentlyFollowing) {
    const { error } = await client.from("store_follows").delete().eq("follower_id", userId).eq("store_id", storeId);
    if (error) throw error;
  } else {
    const { error } = await client.from("store_follows").insert({ follower_id: userId, store_id: storeId });
    if (error) throw error;
  }
}
