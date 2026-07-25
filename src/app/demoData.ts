import type { Store } from "../types";
import catalog from "../data/real-lns-catalog.json";

export const DEMO_CREATOR_ID = "c2";

type CatalogStore = {
  name: string;
  handle: string;
  store_type: "local" | "online" | "both";
  description: string;
  avatar_url?: string;
  cover_image_url?: string;
  website_url: string;
  location: string;
  city: string;
  region: string;
  postal_code: string;
  ships_nationwide: boolean;
  specialties: string[];
  latitude: number | null;
  longitude: number | null;
  country?: string;
  preserve_owned?: boolean;
};

const catalogStores = (catalog as { stores: CatalogStore[] }).stores;

function mapCatalogStore(store: CatalogStore, index: number): Store {
  const id = `demo-${store.handle}`;
  return {
    id,
    // Offline demo: Needlepoint.Com Raleigh is the dogfood-owned shop.
    ownerUserId: store.handle === "needlepointcom-raleigh" ? DEMO_CREATOR_ID : null,
    name: store.name,
    handle: store.handle,
    storeType: store.store_type,
    description: store.description,
    avatar: store.avatar_url || "/assets/needlepoint-hero.png",
    coverImage: store.cover_image_url || "/assets/needlepoint-hero.png",
    websiteUrl: store.website_url || "",
    location: store.location || "",
    city: store.city || "",
    region: store.region || "",
    country: store.country || "US",
    postalCode: store.postal_code || "",
    shipsNationwide: Boolean(store.ships_nationwide),
    specialties: store.specialties || [],
    products: [],
    projectCount: index % 4 === 0 ? 1 : 0,
    followerCount: 2 + (index % 11),
    latitude: store.latitude,
    longitude: store.longitude,
  };
}

/** Real LNS directory for demo/offline mode (no synthetic city fakes). */
export const DEMO_STORES: Store[] = catalogStores.map(mapCatalogStore);

export const STORAGE_KEYS = {
  projects: "needle-point-project:projects",
  collections: "needle-point-project:collections",
  follows: "needle-point-project:follows",
  storeFollows: "needle-point-project:storeFollows",
  stitchAlong: "needle-point-project:stitchAlong",
  stitchAlongs: "needle-point-project:stitchAlongs",
  meetups: "needle-point-project:meetups",
  dismissDiscover: "needle-point-project:dismissDiscover",
  dismissStudio: "needle-point-project:dismissStudio",
  interests: "needle-point-project:interests",
  skill: "needle-point-project:skill",
};
