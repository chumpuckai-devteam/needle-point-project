#!/usr/bin/env python3
from pathlib import Path
import re

path = Path(__file__).resolve().parents[1] / "src/pages/StoresPage.tsx"
text = path.read_text()
assert "requestUserLocation" in text
assert text.count("function StorePinMap") == 1

text = text.replace(
    'import { isLocationRequestError, requestBrowserLocation, type GeoPoint } from "../lib/geo";',
    """import {
  isGeolocationSupported,
  isLocationRequestError,
  queryGeolocationPermission,
  requestBrowserLocation,
  type GeoPoint,
  type LocationRequestErrorKind,
} from \"../lib/geo\";""",
    1,
)

text = text.replace(
    '''type LocationUiStatus = "idle" | "loading" | "ready" | "denied" | "error";

export function StoresView''',
    Path(__file__).with_name("_coach_types_snippet.txt").read_text()
    if False
    else '''type LocationUiStatus = "idle" | "loading" | "ready" | "denied" | "error" | "unsupported";

/** Near You surface states from docs/near-you-location-empty-states.md */
type NearYouCoachState =
  | "permission_not_asked"
  | "requesting_location"
  | "location_ready_nearby"
  | "location_ready_empty_nearby"
  | "location_denied_first_time"
  | "location_denied_persistent"
  | "location_unavailable_timeout"
  | "location_unavailable_unsupported";

const ONLINE_HEADING_ID = "online-shops-heading";

type CoachAction =
  | "use_location"
  | "retry_location"
  | "settings_retry"
  | "refresh_location"
  | "browse_online"
  | "browse_search"
  | "noop";

type CoachModel = {
  headline: string;
  body: string;
  helper?: string;
  primary?: { label: string; action: CoachAction };
  secondary?: { label: string; action: CoachAction };
  tertiary?: { label: string; action: CoachAction };
  helpToggle?: boolean;
  loadingPrimary?: boolean;
};

function buildCoachModel(
  state: NearYouCoachState,
  opts: { nearbyCount: number; radius: number; hasOnline: boolean; helpOpen: boolean },
): CoachModel {
  const { nearbyCount, radius, hasOnline, helpOpen } = opts;
  const onlineCta = hasOnline
    ? ({ label: "Browse online shops", action: "browse_online" } as const)
    : ({ label: "Search by ZIP or city", action: "browse_search" } as const);

  switch (state) {
    case "permission_not_asked":
      return {
        headline: "Want shops near you?",
        body: "Share your location to sort local needlepoint shops within 60 miles. You can keep browsing by city or online shops without sharing.",
        helper: "Location is only used for this search and is not shown on your profile.",
        primary: { label: "Use my location", action: "use_location" },
        secondary: onlineCta,
      };
    case "requesting_location":
      return {
        headline: "Finding shops near you…",
        body: "Checking for local needlepoint shops within 60 miles. Online shops are still available below.",
        primary: { label: "Locating…", action: "noop" },
        secondary: onlineCta,
        loadingPrimary: true,
      };
    case "location_ready_nearby":
      return {
        headline: nearbyCount === 1 ? `1 shop within ${radius} mi` : `${nearbyCount} shops within ${radius} mi`,
        body: "Sorted by distance from your location. You can refresh location or browse online shops that ship.",
        primary: { label: "Refresh location", action: "refresh_location" },
        secondary: onlineCta,
      };
    case "location_ready_empty_nearby":
      return {
        headline: `No local shops within ${radius} mi`,
        body: hasOnline
          ? "We couldn't find a local needlepoint shop close by yet. Here are online shops that ship so you can keep stitching."
          : "We couldn't find a nearby local shop, and online shop profiles are not available yet. Try browsing all shops or check back soon.",
        primary: hasOnline
          ? { label: "Browse online shops", action: "browse_online" }
          : { label: "Search by ZIP or city", action: "browse_search" },
        secondary: hasOnline
          ? { label: "Search by ZIP or city", action: "browse_search" }
          : { label: "Refresh location", action: "refresh_location" },
        tertiary: hasOnline ? { label: "Refresh location", action: "refresh_location" } : undefined,
      };
    case "location_denied_first_time":
      return {
        headline: "Location is off for Needlepoint",
        body: "No worries — you can try again, or browse online shops that ship without sharing location.",
        primary: { label: "Try location again", action: "retry_location" },
        secondary: onlineCta,
        helpToggle: true,
        helper: helpOpen
          ? "If your browser asks again, choose Allow. If it does not ask, use the site settings in your browser to allow Location for Needlepoint."
          : undefined,
      };
    case "location_denied_persistent":
      return {
        headline: "Location is blocked in your browser",
        body: "Your browser is not allowing Needlepoint to check nearby shops. You can change site settings, then come back and try again.",
        primary: onlineCta,
        secondary: { label: "I changed settings — try again", action: "settings_retry" },
        helper:
          "Look for the lock or site settings icon in your browser. On iPhone or Android, open browser settings, allow Location for Needlepoint, then return here.",
      };
    case "location_unavailable_timeout":
      return {
        headline: "We couldn't get your location",
        body: "The request timed out or your device could not share location. Try again, or browse online shops that ship.",
        primary: { label: "Try again", action: "retry_location" },
        secondary: onlineCta,
      };
    case "location_unavailable_unsupported":
      return {
        headline: "Location is not available here",
        body: "This browser or device cannot share location with Needlepoint. You can still browse by city or shop online.",
        primary: onlineCta,
        secondary: { label: "Search by ZIP or city", action: "browse_search" },
      };
    default:
      return {
        headline: "Want shops near you?",
        body: "Share your location to sort local needlepoint shops within 60 miles.",
        primary: { label: "Use my location", action: "use_location" },
      };
  }
}

export function StoresView''',
    1,
)

text = text.replace(
    """  const [cityCandidates, setCityCandidates] = useState<CityCandidate[] | null>(null);

  const cityCards = useMemo(() => buildCityBrowseCards(stores), [stores]);
""",
    """  const [cityCandidates, setCityCandidates] = useState<CityCandidate[] | null>(null);
  const [denyCount, setDenyCount] = useState(0);
  const [permissionDeniedPersistent, setPermissionDeniedPersistent] = useState(false);
  const [locationErrorKind, setLocationErrorKind] = useState<LocationRequestErrorKind | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const cityCards = useMemo(() => buildCityBrowseCards(stores), [stores]);

  // Permissions probe only — never auto-call getCurrentPosition on mount.
  useEffect(() => {
    let cancelled = false;
    if (!isGeolocationSupported()) {
      setLocationErrorKind("unsupported");
      setLocationStatus("unsupported");
      return;
    }
    void queryGeolocationPermission().then((state) => {
      if (cancelled) return;
      if (state === "denied") {
        setPermissionDeniedPersistent(true);
        setLocationErrorKind("denied");
        setLocationStatus("denied");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
""",
    1,
)

old_req = """  async function requestUserLocation() {
    setLocationStatus("loading");
    setLocationMessage("Finding shops near you…");
    setSearchError("");
    setCityCandidates(null);
    try {
      const point = await requestBrowserLocation();
      setUserPoint(point);
      setLocationStatus("ready");
      setLocationMessage("Sorted by distance from your location.");
      setSearchInput("");
      const response = searchStoreDiscovery(stores, {
        mode: "point",
        lat: point.lat,
        lng: point.lng,
        radiusMiles,
        source: "location",
        displayLabel: "your location",
      });
      runDiscovery(response);
    } catch (error) {
      const denied = isLocationRequestError(error) ? error.kind === "denied" : error instanceof Error && error.message.toLowerCase().includes("denied");
      setLocationStatus(denied ? "denied" : "error");
      setLocationMessage(
        denied
          ? "Location is off. You can still search by ZIP or city."
          : "We couldn't get your location. Try a ZIP or city instead.",
      );
      setUserPoint(null);
    }
  }
"""
new_req = """  async function requestUserLocation() {
    setLocationStatus("loading");
    setLocationMessage("");
    setLocationErrorKind(null);
    setSearchError("");
    setCityCandidates(null);
    try {
      const point = await requestBrowserLocation();
      setUserPoint(point);
      setLocationStatus("ready");
      setDenyCount(0);
      setPermissionDeniedPersistent(false);
      setHelpOpen(false);
      setLocationErrorKind(null);
      setSearchInput("");
      const response = searchStoreDiscovery(stores, {
        mode: "point",
        lat: point.lat,
        lng: point.lng,
        radiusMiles,
        source: "location",
        displayLabel: "your location",
      });
      runDiscovery(response);
    } catch (error) {
      setUserPoint(null);
      if (isLocationRequestError(error)) {
        setLocationErrorKind(error.kind);
        if (error.kind === "denied") {
          setLocationStatus("denied");
          setDenyCount((count) => {
            const next = count + 1;
            if (next >= 2) setPermissionDeniedPersistent(true);
            return next;
          });
          void queryGeolocationPermission().then((state) => {
            if (state === "denied") setPermissionDeniedPersistent(true);
          });
        } else if (error.kind === "unsupported") {
          setLocationStatus("unsupported");
        } else {
          setLocationStatus("error");
        }
      } else {
        setLocationErrorKind("unavailable");
        setLocationStatus("error");
      }
    }
  }
"""
if old_req not in text:
    raise SystemExit("requestUserLocation block not found")
text = text.replace(old_req, new_req, 1)

m = re.search(r"  function scrollToOnline\(\) \{.*?\n  const mapPins = discovery\.mapPins;", text, re.S)
if not m:
    raise SystemExit("scroll/status block not found")
new_block = r"""  function scrollToOnline() {
    const heading = document.getElementById(ONLINE_HEADING_ID);
    if (heading instanceof HTMLElement) {
      heading.scrollIntoView({ behavior: "smooth", block: "start" });
      heading.focus({ preventScroll: true });
      return;
    }
    onlineSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function focusSearchField() {
    document.getElementById(searchFieldId)?.focus();
  }

  const isBrowse = discovery.query.mode === "browse";
  const showDistance = discovery.list.some((store) => store.distanceMiles != null);
  const hasActiveSearch = !isBrowse;
  const expandTo = nextExpandRadius(discovery.query.radiusMiles || radiusMiles);
  const hasOnline = discovery.onlineFallback.length > 0;
  const isGeoPoint = discovery.query.mode === "point" && discovery.query.source === "location";
  const radiusForCopy = discovery.query.radiusMiles || radiusMiles || 60;

  const coachState: NearYouCoachState = (() => {
    if (locationStatus === "loading") return "requesting_location";
    if (locationStatus === "ready" && isGeoPoint) {
      return discovery.list.length > 0 ? "location_ready_nearby" : "location_ready_empty_nearby";
    }
    if (permissionDeniedPersistent || denyCount >= 2) return "location_denied_persistent";
    if (locationStatus === "denied" || denyCount === 1 || locationErrorKind === "denied") {
      return "location_denied_first_time";
    }
    if (locationStatus === "unsupported" || locationErrorKind === "unsupported") {
      return "location_unavailable_unsupported";
    }
    if (locationStatus === "error" || locationErrorKind === "timeout" || locationErrorKind === "unavailable") {
      return "location_unavailable_timeout";
    }
    return "permission_not_asked";
  })();

  const placeSearchCoaching =
    !cityCandidates?.length &&
    hasActiveSearch &&
    !isGeoPoint &&
    (discovery.status === "zero-local" || discovery.status === "geocode-unavailable");

  const coach = buildCoachModel(coachState, {
    nearbyCount: discovery.list.length,
    radius: radiusForCopy,
    hasOnline,
    helpOpen,
  });

  const statusHeadline = (() => {
    if (cityCandidates?.length) return discovery.message || "Which city did you mean?";
    if (placeSearchCoaching) {
      return discovery.message || `No local shops within ${radiusForCopy} miles`;
    }
    if (hasActiveSearch && discovery.list.length && !isGeoPoint) {
      return `${discovery.list.length} shop${discovery.list.length === 1 ? "" : "s"} near ${discovery.query.displayLabel}`;
    }
    return coach.headline;
  })();

  const statusDetail = (() => {
    if (cityCandidates?.length) return `Choose a city so we can show shops within about ${radiusMiles} miles.`;
    if (placeSearchCoaching) {
      return "We're still growing the shop directory. You can widen the search or browse online shops that ship nationwide.";
    }
    if (hasActiveSearch && discovery.status === "ok" && !isGeoPoint) {
      return `Local shops within about ${radiusForCopy} miles, then online shops that ship.`;
    }
    return coach.body;
  })();

  function runCoachAction(action: CoachAction) {
    switch (action) {
      case "use_location":
      case "retry_location":
      case "settings_retry":
      case "refresh_location":
        void requestUserLocation();
        break;
      case "browse_online":
        scrollToOnline();
        break;
      case "browse_search":
        focusSearchField();
        break;
      case "noop":
      default:
        break;
    }
  }

  const mapPins = discovery.mapPins;"""
text = text[: m.start()] + new_block + text[m.end() :]

bar_pat = re.compile(
    r'      <div className="store-location-bar panel" data-location-status=\{locationStatus\}>.*?</div>\n\n      \{cityCandidates',
    re.S,
)
mb = bar_pat.search(text)
if not mb:
    raise SystemExit("location bar not found")
new_bar = """      <div
        className="store-location-bar panel store-location-coaching"
        data-location-status={locationStatus}
        data-coach-state={coachState}
        aria-live="polite"
      >
        <div className="store-location-copy">
          <MapPin size={18} aria-hidden />
          <div>
            <strong id={resultsHeadingId}>{statusHeadline}</strong>
            <p>{statusDetail}</p>
            {coach.helper && !placeSearchCoaching ? <p className="store-location-helper">{coach.helper}</p> : null}
          </div>
        </div>
        {placeSearchCoaching ? (
          <div className="store-location-actions store-discovery-coach-actions">
            {expandTo ? (
              <button className="primary" type="button" onClick={expandRadius}>
                Expand to {expandTo} miles
              </button>
            ) : null}
            <button className="secondary" type="button" onClick={focusSearchField}>
              Try a city or ZIP
            </button>
            {hasOnline ? (
              <button className="secondary" type="button" onClick={scrollToOnline}>
                Browse online shops
              </button>
            ) : null}
          </div>
        ) : (
          <div className="store-location-actions store-discovery-coach-actions">
            {coach.primary ? (
              <button
                className="primary"
                type="button"
                onClick={() => runCoachAction(coach.primary!.action)}
                disabled={
                  locationStatus === "loading" ||
                  searchBusy ||
                  Boolean(coach.loadingPrimary) ||
                  coach.primary.action === "noop"
                }
              >
                {coach.primary.label}
              </button>
            ) : null}
            {coach.secondary ? (
              <button
                className="secondary"
                type="button"
                onClick={() => runCoachAction(coach.secondary!.action)}
                disabled={locationStatus === "loading" || searchBusy}
              >
                {coach.secondary.label}
              </button>
            ) : null}
            {coach.tertiary ? (
              <button
                className="secondary"
                type="button"
                onClick={() => runCoachAction(coach.tertiary!.action)}
                disabled={locationStatus === "loading" || searchBusy}
              >
                {coach.tertiary.label}
              </button>
            ) : null}
            {coach.helpToggle ? (
              <button
                className="text-button store-location-help-toggle"
                type="button"
                aria-expanded={helpOpen}
                onClick={() => setHelpOpen((open) => !open)}
              >
                How to enable location
              </button>
            ) : null}
          </div>
        )}
      </div>

      {cityCandidates"""
text = text[: mb.start()] + new_bar + text[mb.end() :]

text = text.replace(
    """            <section ref={onlineSectionRef} className="store-online-fallback" aria-label="Online shops that ship">
              <SectionTitle title="Online shops that ship" />
              <p className="store-online-fallback-copy">Needlepoint links you out to each shop&apos;s own site. Checkout happens there.</p>
""",
    """            <section ref={onlineSectionRef} className="store-online-fallback" aria-label="Online shops that ship">
              <SectionTitle headingId={ONLINE_HEADING_ID} title="Online shops that ship" />
              <p className="store-online-fallback-copy store-online-helper">
                Shop profiles link out to each shop&apos;s own site. Needlepoint does not handle checkout.
              </p>
""",
    1,
)

text = text.replace(
    """        <EmptyState title="No shops yet" body="Shop profiles will appear here once seeded or claimed." />""",
    """        <EmptyState
          title="No shops yet"
          body="Shop profiles will appear here once they are seeded or claimed."
          action="Back to Studio"
          onAction={() => setView({ name: "home" })}
        />""",
    1,
)

old_empty = """            <div className="store-local-empty panel" data-empty-slot="local-zero">
              <strong>{discovery.message || "No local shops in this area"}</strong>
              <p>Widen the search, try another place, or browse online shops that ship needlepoint supplies.</p>
              <div className="store-discovery-coach-actions">
                {expandTo ? (
                  <button className="primary" type="button" onClick={expandRadius}>
                    Expand to {expandTo} miles
                  </button>
                ) : null}
                <button className="secondary" type="button" onClick={clearSearch}>
                  Reset browse
                </button>
                <button className="secondary" type="button" onClick={scrollToOnline}>
                  Browse online shops
                </button>
              </div>
            </div>
"""
new_empty = """            <div className="store-local-empty panel" data-empty-slot="local-zero">
              <strong>
                {isGeoPoint
                  ? `No local shops within ${radiusForCopy} mi`
                  : discovery.message || "No local shops in this area"}
              </strong>
              <p>
                {isGeoPoint
                  ? hasOnline
                    ? "We couldn't find a local needlepoint shop close by yet. Here are online shops that ship so you can keep stitching."
                    : "We couldn't find a nearby local shop, and online shop profiles are not available yet. Try browsing all shops or check back soon."
                  : "Widen the search, try another place, or browse online shops that ship needlepoint supplies."}
              </p>
              <div className="store-location-actions store-discovery-coach-actions">
                {isGeoPoint ? (
                  <>
                    {hasOnline ? (
                      <button className="primary" type="button" onClick={scrollToOnline}>
                        Browse online shops
                      </button>
                    ) : (
                      <button className="primary" type="button" onClick={clearSearch}>
                        Browse all shops
                      </button>
                    )}
                    {hasOnline ? (
                      <button className="secondary" type="button" onClick={clearSearch}>
                        Browse all shops
                      </button>
                    ) : null}
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => void requestUserLocation()}
                      disabled={locationStatus === "loading"}
                    >
                      Refresh location
                    </button>
                  </>
                ) : (
                  <>
                    {expandTo ? (
                      <button className="primary" type="button" onClick={expandRadius}>
                        Expand to {expandTo} miles
                      </button>
                    ) : null}
                    <button className="secondary" type="button" onClick={clearSearch}>
                      Reset browse
                    </button>
                    {hasOnline ? (
                      <button className="secondary" type="button" onClick={scrollToOnline}>
                        Browse online shops
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
"""
if old_empty not in text:
    raise SystemExit("empty local not found")
text = text.replace(old_empty, new_empty, 1)

path.write_text(text)
print("OK", path, "lines", len(text.splitlines()))
for s in [
    "buildCoachModel",
    "permissionDeniedPersistent",
    "ONLINE_HEADING_ID",
    "data-coach-state",
    "How to enable location",
]:
    print(s, s in text)
