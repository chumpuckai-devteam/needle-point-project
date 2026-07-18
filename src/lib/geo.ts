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

export function requestBrowserLocation(timeoutMs = 10000): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location is not available on this device."));
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
          reject(new Error("Location permission denied. Showing top online shops instead."));
        } else if (error.code === error.TIMEOUT) {
          reject(new Error("Location request timed out."));
        } else {
          reject(new Error("Could not determine your location."));
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
