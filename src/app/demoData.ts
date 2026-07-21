import type { Store } from "../types";
import catalog from "../data/us-store-catalog.json";

export const DEMO_CREATOR_ID = "c2";

type CatalogStore = {
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
  postal_code: string;
  ships_nationwide: boolean;
  specialties: string[];
  latitude: number | null;
  longitude: number | null;
  country?: string;
  protected?: boolean;
};

const catalogStores = (catalog as { stores: CatalogStore[] }).stores;

/** Hand-crafted product shelves for the original beta shops (demo offline). */
const FEATURED_PRODUCTS: Record<string, Store["products"]> = {
  canopycanvas: [
    {
      id: "sp1",
      storeId: "demo-canopycanvas",
      name: "Persimmon Garden pillow canvas",
      description: "18 mesh painted canvas for a lush fruit pillow.",
      image: "/assets/persimmon-garden-pillow.jpg",
      priceLabel: "from $86",
      externalUrl: "https://example.com/canopy/persimmon",
      category: "canvas",
    },
    {
      id: "sp2",
      storeId: "demo-canopycanvas",
      name: "Bookshop Door printed canvas",
      description: "18 mesh storefront scene for framed pieces.",
      image: "/assets/bookshop-door-canvas.jpg",
      priceLabel: "from $74",
      externalUrl: "https://example.com/canopy/bookshop-door",
      category: "canvas",
    },
    {
      id: "sp3",
      storeId: "demo-canopycanvas",
      name: "Blue Hydrangea belt canvas",
      description: "Narrow belt canvas with botanical repeat.",
      image: "/assets/blue-hydrangea-belt.jpg",
      priceLabel: "from $48",
      externalUrl: "https://example.com/canopy/hydrangea-belt",
      category: "canvas",
    },
  ],
  threadandtonic: [
    {
      id: "sp4",
      storeId: "demo-threadandtonic",
      name: "Silk blend starter pack",
      description: "Assorted silk blends for advanced stitchers.",
      image: "/assets/blue-hydrangea-belt.jpg",
      priceLabel: "$42",
      externalUrl: "https://example.com/threadtonic/silk-pack",
      category: "thread",
    },
    {
      id: "sp5",
      storeId: "demo-threadandtonic",
      name: "Metallic accent kit",
      description: "Kreinik-style accents for roofs and trims.",
      image: "/assets/tiny-ski-lodge-ornament.jpg",
      priceLabel: "$28",
      externalUrl: "https://example.com/threadtonic/metallic",
      category: "thread",
    },
    {
      id: "sp6",
      storeId: "demo-threadandtonic",
      name: "Holiday ornament finishing pack",
      description: "Cording and felt backs for small gifts.",
      image: "/assets/tiny-ski-lodge-ornament.jpg",
      priceLabel: "$19",
      externalUrl: "https://example.com/threadtonic/finishing",
      category: "finishing",
    },
  ],
  bookshopwindows: [
    {
      id: "sp7",
      storeId: "demo-bookshopwindows",
      name: "Custom finishing — small pillow",
      description: 'Local finishing for pillows under 16".',
      image: "/assets/persimmon-garden-pillow.jpg",
      priceLabel: "from $65",
      externalUrl: "https://example.com/bookshop/finishing",
      category: "finishing",
    },
    {
      id: "sp8",
      storeId: "demo-bookshopwindows",
      name: "July stitch-along kit add-on",
      description: "Threads pulled for bookshop-themed SAL.",
      image: "/assets/bookshop-door-canvas.jpg",
      priceLabel: "$36",
      externalUrl: "https://example.com/bookshop/sal-kit",
      category: "kit",
    },
    {
      id: "sp9",
      storeId: "demo-bookshopwindows",
      name: "Neighborhood class voucher",
      description: "In-store beginner basketweave session.",
      image: "/assets/needlepoint-hero.png",
      priceLabel: "$45",
      externalUrl: "https://example.com/bookshop/class",
      category: "class",
    },
  ],
};

function mapCatalogStore(store: CatalogStore, index: number): Store {
  const legacyIds: Record<string, string> = {
    canopycanvas: "store-local-1",
    threadandtonic: "store-online-1",
    bookshopwindows: "store-local-2",
  };
  const id = legacyIds[store.handle] || `demo-${store.handle}`;
  const products = (FEATURED_PRODUCTS[store.handle] || []).map((p) => ({ ...p, storeId: id }));
  return {
    id,
    // Single demo-owned shop (matches online beta Canopy ownership).
    ownerUserId: store.handle === "canopycanvas" ? DEMO_CREATOR_ID : null,
    name: store.name,
    handle: store.handle,
    storeType: store.store_type,
    description: store.description,
    avatar: store.avatar_url || "/assets/needlepoint-hero.png",
    coverImage: store.cover_image_url || "/assets/persimmon-garden-pillow.jpg",
    websiteUrl: store.website_url || "",
    location: store.location || "",
    city: store.city || "",
    region: store.region || "",
    country: store.country || "US",
    postalCode: store.postal_code || "",
    shipsNationwide: Boolean(store.ships_nationwide),
    specialties: store.specialties || [],
    products,
    projectCount: products.length ? Math.max(1, Math.min(3, products.length)) : index % 3 === 0 ? 1 : 0,
    followerCount: store.handle === "canopycanvas" ? 12 : store.handle === "threadandtonic" ? 28 : 3 + (index % 17),
    latitude: store.latitude,
    longitude: store.longitude,
  };
}

/** Full US directory for demo/offline: >=2 shops/state, >=5/major metro. */
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
