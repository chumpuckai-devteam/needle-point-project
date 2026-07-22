import { loadFromStorage, saveToStorage } from "./storage";

/** In-app consent for using device location on Shops / nearby rails. */
export type LocationConsent = "allowed" | "declined";

export const LOCATION_CONSENT_KEY = "needlepoint:locationConsent";

export function loadLocationConsent(): LocationConsent | null {
  try {
    const plain = localStorage.getItem(LOCATION_CONSENT_KEY);
    if (plain === "allowed" || plain === "declined") return plain;
    const stored = loadFromStorage<string | null>(LOCATION_CONSENT_KEY, null);
    if (stored === "allowed" || stored === "declined") return stored;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveLocationConsent(value: LocationConsent): void {
  try {
    localStorage.setItem(LOCATION_CONSENT_KEY, value);
  } catch {
    saveToStorage(LOCATION_CONSENT_KEY, value);
  }
}

export function clearLocationConsent(): void {
  try {
    localStorage.removeItem(LOCATION_CONSENT_KEY);
  } catch {
    /* ignore */
  }
}
