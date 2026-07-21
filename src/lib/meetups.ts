import type { Creator, StitchingMeetup, Store } from "../types";
import { DEMO_CREATOR_ID } from "../app/demoData";

/** Seed meetups for offline demo / dogfood (string ids, not UUIDs). */
export const initialMeetups: StitchingMeetup[] = [
  {
    id: "meetup-1",
    hostId: DEMO_CREATOR_ID,
    hostStoreId: "store-local-1",
    title: "Thursday Sit & Stitch at Canopy",
    description:
      "Bring a WIP and stitch with the Canopy crew. Beginners welcome — we'll help with basketweave basics and finishing questions. Coffee and scraps of canvas gossip included.",
    coverImageUrl: "/assets/needlepoint-hero.png",
    startsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    timezone: "America/Los_Angeles",
    locationType: "in_person",
    venueName: "Canopy Canvas",
    address: "1120 NW Glisan St",
    city: "Portland",
    region: "OR",
    postalCode: "97209",
    country: "US",
    latitude: 45.5265,
    longitude: -122.683,
    capacity: 18,
    rsvpMode: "registration",
    topics: ["beginners welcome", "finishing", "WIP night"],
    skillLevel: "all levels",
    visibility: "public",
    status: "scheduled",
    registeredCount: 6,
    goingCount: 6,
    interestedCount: 0,
    waitlistCount: 0,
    spotsLeft: 12,
    myRsvp: null,
  },
  {
    id: "meetup-2",
    hostId: "c1",
    hostStoreId: null,
    title: "Guild ornament swap night",
    description:
      "Local guild open stitch and small ornament swap. Bring one finished or nearly finished ornament if you want to swap; spectators welcome.",
    coverImageUrl: "/assets/tiny-ski-lodge-ornament.jpg",
    startsAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
    timezone: "America/New_York",
    locationType: "in_person",
    venueName: "Community Room — Park Slope Library",
    address: "",
    city: "Brooklyn",
    region: "NY",
    postalCode: "11215",
    country: "US",
    capacity: 24,
    rsvpMode: "registration",
    topics: ["ornaments", "guild", "swap"],
    skillLevel: "confident beginner+",
    visibility: "public",
    status: "scheduled",
    registeredCount: 24,
    goingCount: 24,
    interestedCount: 0,
    waitlistCount: 2,
    spotsLeft: 0,
    myRsvp: null,
  },
  {
    id: "meetup-3",
    hostId: "c3",
    hostStoreId: "store-local-1",
    title: "Sunday open stitch (hybrid)",
    description:
      "Shop floor open stitch with an optional Zoom room for far-away friends. Focus theme: painted canvas backgrounds.",
    coverImageUrl: "/assets/persimmon-garden-pillow.jpg",
    startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000).toISOString(),
    timezone: "America/Los_Angeles",
    locationType: "hybrid",
    venueName: "Canopy Canvas",
    address: "1120 NW Glisan St",
    city: "Portland",
    region: "OR",
    postalCode: "97209",
    country: "US",
    rsvpMode: "external_link",
    externalRsvpUrl: "https://example.com/canopy/sunday-stitch",
    topics: ["painted canvas", "open stitch"],
    skillLevel: "all levels",
    visibility: "public",
    status: "scheduled",
    registeredCount: 0,
    goingCount: 0,
    interestedCount: 0,
    spotsLeft: null,
    myRsvp: null,
  },
];

export function formatMeetupWhen(meetup: StitchingMeetup): string {
  try {
    const start = new Date(meetup.startsAt);
    const opts: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    };
    const startLabel = start.toLocaleString(undefined, opts);
    if (!meetup.endsAt) return startLabel;
    const end = new Date(meetup.endsAt);
    const endLabel = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${startLabel} – ${endLabel}`;
  } catch {
    return meetup.startsAt;
  }
}

export function formatMeetupPlace(meetup: StitchingMeetup): string {
  const cityLine = [meetup.city, meetup.region].filter(Boolean).join(", ");
  if (meetup.venueName && cityLine) return `${meetup.venueName} · ${cityLine}`;
  return meetup.venueName || cityLine || "Location TBA";
}

export function hostLabel(meetup: StitchingMeetup, creatorById: (id: string) => Creator, stores: Store[]): string {
  const store = meetup.hostStoreId ? stores.find((s) => s.id === meetup.hostStoreId) : undefined;
  if (store) return store.name;
  return creatorById(meetup.hostId)?.name || "Host";
}

export function filterUpcomingMeetups(
  meetups: StitchingMeetup[],
  query: { city?: string; region?: string; includeEnded?: boolean } = {},
): StitchingMeetup[] {
  const city = (query.city ?? "").trim().toLowerCase();
  const region = (query.region ?? "").trim().toLowerCase();
  const now = Date.now() - 2 * 60 * 60 * 1000;
  return meetups
    .filter((m) => m.visibility === "public")
    .filter((m) => (query.includeEnded ? m.status !== "cancelled" : m.status === "scheduled"))
    .filter((m) => (query.includeEnded ? true : new Date(m.startsAt).getTime() >= now))
    .filter((m) => !city || m.city.toLowerCase().includes(city))
    .filter((m) => !region || m.region.toLowerCase() === region)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export function meetupRegisteredCount(meetup: StitchingMeetup): number {
  return meetup.registeredCount ?? meetup.goingCount ?? 0;
}

export function meetupSpotsLeft(meetup: StitchingMeetup): number | null {
  if (meetup.spotsLeft != null) return meetup.spotsLeft;
  if (meetup.capacity == null) return null;
  return Math.max(meetup.capacity - meetupRegisteredCount(meetup), 0);
}

export function meetupIsFull(meetup: StitchingMeetup): boolean {
  const left = meetupSpotsLeft(meetup);
  return left != null && left <= 0;
}

export function formatMeetupCapacity(meetup: StitchingMeetup): string {
  const registered = meetupRegisteredCount(meetup);
  const wl = meetup.waitlistCount ?? 0;
  if (meetup.capacity == null) {
    return registered === 1 ? "1 registered" : `${registered} registered`;
  }
  const left = meetupSpotsLeft(meetup) ?? 0;
  if (left <= 0) {
    return wl > 0
      ? `Full · ${meetup.capacity} seats · ${wl} waitlisted`
      : `Full · ${meetup.capacity} seats`;
  }
  const base = `${left} spot${left === 1 ? "" : "s"} left · ${registered}/${meetup.capacity} registered`;
  return wl > 0 ? `${base} · ${wl} waitlisted` : base;
}

/** Guest cancel copy — free cancel until 24h before start; frees seat for others / waitlist. */
export const MEETUP_CANCEL_POLICY =
  "You can cancel free up to 24 hours before start. Your seat opens for the next person on the waitlist (or anyone who registers). Within 24 hours, contact the host if you cannot attend.";

export const MEETUP_REGISTER_HELP =
  "Register to hold a seat. Limited capacity events fill as people register — cancel early so the waitlist can move up.";

export const MEETUP_WAITLIST_HELP =
  "This meetup is full. Join the waitlist — if someone cancels, the next person in line is registered automatically.";

