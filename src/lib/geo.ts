import type { NormalizedStoreSearchQuery } from "../api/stores";
import type { Store } from "../types";

/** Reasonable driving distance for local shops (miles). */
export const LOCAL_DRIVING_RADIUS_MILES = 60;

export type GeoPoint = {
  lat: number;
  lng: number;
};

export type RankedStore = Store & {
  distanceMiles?: number | null;
  proximityRank?: "nearby" | "online" | "far";
};

export function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isLocalCapable(store: Store): boolean {
  return store.storeType === "local" || store.storeType === "both";
}

/** Pure online / national e‑commerce (one catalog row — no city pin required). */
export function isOnlineOnly(store: Store): boolean {
  return store.storeType === "online";
}

/**
 * Can appear in “ships” / mail-order rails.
 * Prefer isOnlineOnly for the dedicated Online section so brick-and-mortar
 * with shipsNationwide do not flood “Online shops”.
 */
export function isOnlineCapable(store: Store): boolean {
  return store.storeType === "online" || store.storeType === "both" || store.shipsNationwide;
}

function onlineScore(store: Store): number {
  // "Top" online stores: more tagged projects + ships nationwide first
  return (store.projectCount ?? 0) * 10 + (store.shipsNationwide ? 5 : 0) + (store.products?.length ?? 0);
}

export function rankStoresForUser(stores: Store[], userPoint: GeoPoint | null, radiusMiles = LOCAL_DRIVING_RADIUS_MILES): {
  mode: "nearby" | "online-fallback" | "all";
  nearby: RankedStore[];
  online: RankedStore[];
  shown: RankedStore[];
  radiusMiles: number;
} {
  const withDistance: RankedStore[] = stores.map((store) => {
    if (userPoint && store.latitude != null && store.longitude != null && isLocalCapable(store)) {
      const distanceMiles = haversineMiles(userPoint, { lat: store.latitude, lng: store.longitude });
      return { ...store, distanceMiles, proximityRank: distanceMiles <= radiusMiles ? "nearby" : "far" };
    }
    if (isOnlineCapable(store) && !isLocalCapable(store)) {
      return { ...store, distanceMiles: null, proximityRank: "online" };
    }
    if (isOnlineCapable(store)) {
      return { ...store, distanceMiles: null, proximityRank: "online" };
    }
    return { ...store, distanceMiles: null, proximityRank: "far" };
  });

  const nearby = withDistance
    .filter((store) => store.proximityRank === "nearby")
    .sort((a, b) => (a.distanceMiles ?? Number.POSITIVE_INFINITY) - (b.distanceMiles ?? Number.POSITIVE_INFINITY));

  const online = withDistance
    .filter((store) => isOnlineCapable(store))
    .sort((a, b) => {
      const scoreDiff = onlineScore(b) - onlineScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return a.name.localeCompare(b.name);
    })
    .map((store) => ({ ...store, proximityRank: "online" as const }));

  if (userPoint && nearby.length > 0) {
    // Nearby locals first, then top online options as secondary
    const onlineOnly = online.filter((store) => !nearby.some((near) => near.id === store.id));
    return {
      mode: "nearby",
      nearby,
      online: onlineOnly,
      shown: [...nearby, ...onlineOnly],
      radiusMiles,
    };
  }

  if (userPoint) {
    // No local shops within driving distance → top online stores
    return {
      mode: "online-fallback",
      nearby: [],
      online,
      shown: online,
      radiusMiles,
    };
  }

  // No user location yet: show locals (if any) then online by ranking
  const localsUnknown = withDistance
    .filter((store) => isLocalCapable(store))
    .sort((a, b) => a.name.localeCompare(b.name));
  const onlineOnly = online.filter((store) => !localsUnknown.some((local) => local.id === store.id));
  return {
    mode: "all",
    nearby: localsUnknown,
    online: onlineOnly,
    shown: [...localsUnknown, ...onlineOnly],
    radiusMiles,
  };
}

/** Why a browser location request failed (never expose raw GeolocationPositionError text in UI). */
export type LocationRequestErrorKind = "denied" | "timeout" | "unavailable" | "unsupported";

export class LocationRequestError extends Error {
  readonly kind: LocationRequestErrorKind;

  constructor(kind: LocationRequestErrorKind, message: string) {
    super(message);
    this.name = "LocationRequestError";
    this.kind = kind;
  }
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation);
}

export type GeolocationPermissionState = "granted" | "denied" | "prompt" | "unknown";

/** Read Permissions API when available; never prompts the user. */
export async function queryGeolocationPermission(): Promise<GeolocationPermissionState> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unknown";
    const result = await navigator.permissions.query({ name: "geolocation" });
    if (result.state === "granted" || result.state === "denied" || result.state === "prompt") {
      return result.state;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

export function isLocationRequestError(error: unknown): error is LocationRequestError {
  return error instanceof LocationRequestError;
}

export function requestBrowserLocation(timeoutMs = 10000): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new LocationRequestError("unsupported", "Location is not available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new LocationRequestError("denied", "Location permission denied."));
        } else if (error.code === error.TIMEOUT) {
          reject(new LocationRequestError("timeout", "Location request timed out."));
        } else {
          reject(new LocationRequestError("unavailable", "Could not determine your location."));
        }
      },
      {
        enableHighAccuracy: false,
        timeout: timeoutMs,
        maximumAge: 5 * 60 * 1000,
      },
    );
  });
}

export function formatDistanceMiles(miles: number | null | undefined): string {
  if (miles == null || Number.isNaN(miles)) return "";
  if (miles < 1) return "< 1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

/** Minimum score treated as a local zip/city hit (vs online-only fallback padding). */
const LOCAL_SEARCH_MATCH_FLOOR = 40;

function scoreStoreForZipCity(store: Store, query: NormalizedStoreSearchQuery): number {
  let score = 0;
  const city = (store.city ?? "").trim().toLowerCase();
  const region = (store.region ?? "").trim().toLowerCase();
  const location = (store.location ?? "").trim().toLowerCase();
  const postal = (store.postalCode ?? "").trim();

  if (query.zip) {
    if (postal && postal === query.zip) score += 100;
    else if (postal && postal.startsWith(query.zip.slice(0, 3))) score += 25;
  }

  if (query.city) {
    if (city && city === query.city) score += 80;
    else if (city && (city.includes(query.city) || query.city.includes(city))) score += 45;
    else if (location.includes(query.city)) score += 35;
  }

  if (query.region) {
    if (region && region === query.region) score += 15;
    else if (location.includes(query.region)) score += 8;
  }

  // Keep online/catalog shops discoverable when local matches are weak/empty.
  if (isOnlineCapable(store)) {
    score += 1 + Math.min(9, onlineScore(store) / 20);
  }

  return score;
}

/**
 * Client-side zip/city ranking when GPS is unavailable and/or search_stores RPC is not ready.
 * Strong local matches first; online/catalog always available as fallback (never hard-empty on weak location).
 */
export function rankStoresByZipCity(
  stores: Store[],
  query: NormalizedStoreSearchQuery,
  radiusMiles = LOCAL_DRIVING_RADIUS_MILES,
): {
  mode: "nearby" | "online-fallback" | "all";
  nearby: RankedStore[];
  online: RankedStore[];
  shown: RankedStore[];
  radiusMiles: number;
  label: string;
} {
  const hasQuery = Boolean(query.zip || query.city);
  if (!hasQuery) {
    return { ...rankStoresForUser(stores, null, radiusMiles), label: "" };
  }

  const scored = stores
    .map((store) => ({ store, score: scoreStoreForZipCity(store, query) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.store.name.localeCompare(b.store.name);
    });

  const nearby = scored
    .filter(({ store, score }) => score >= LOCAL_SEARCH_MATCH_FLOOR && isLocalCapable(store))
    .map(({ store }) => ({ ...store, distanceMiles: null, proximityRank: "nearby" as const }));

  const online = scored
    .filter(({ store }) => isOnlineCapable(store) && !nearby.some((near) => near.id === store.id))
    .map(({ store }) => ({ ...store, distanceMiles: null, proximityRank: "online" as const }));

  const cityLabel = query.city ? query.city.replace(/\b\w/g, (c) => c.toUpperCase()) : "";
  let label = "";
  if (cityLabel && query.region) label = `${cityLabel}, ${query.region.toUpperCase()}`;
  else if (cityLabel) label = cityLabel;
  if (query.zip) label = label ? `${label} · ${query.zip}` : query.zip;

  if (nearby.length > 0) {
    return {
      mode: "nearby",
      nearby,
      online,
      shown: [...nearby, ...online],
      radiusMiles,
      label,
    };
  }

  return {
    mode: "online-fallback",
    nearby: [],
    online,
    shown: online.length ? online : scored.map(({ store }) => ({ ...store, distanceMiles: null, proximityRank: "online" as const })),
    radiusMiles,
    label,
  };
}
