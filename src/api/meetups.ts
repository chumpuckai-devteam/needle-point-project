import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";
import type { StitchingMeetup, StitchingMeetupRsvpStatus } from "../types";

export type StitchingMeetupInput = {
  title: string;
  description?: string;
  coverImageUrl?: string;
  startsAt: string;
  endsAt?: string | null;
  timezone?: string;
  locationType?: StitchingMeetup["locationType"];
  venueName?: string;
  address?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  hostStoreId?: string | null;
  /** When true and caller does not own the store, creates a pending venue request. */
  requestStoreVenue?: boolean;
  capacity?: number | null;
  /** Forced to registration on create (on-site). */
  rsvpMode?: StitchingMeetup["rsvpMode"];
  externalRsvpUrl?: string;
  topics?: string[];
  skillLevel?: string;
  visibility?: StitchingMeetup["visibility"];
  status?: StitchingMeetup["status"];
};

type DbMeetupRow = {
  id: string;
  host_user_id: string;
  host_store_id?: string | null;
  store_link_status?: string | null;
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  starts_at: string;
  ends_at?: string | null;
  timezone?: string | null;
  location_type: StitchingMeetup["locationType"];
  venue_name?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity?: number | null;
  rsvp_mode: StitchingMeetup["rsvpMode"];
  external_rsvp_url?: string | null;
  topics?: string[] | null;
  skill_level?: string | null;
  visibility: StitchingMeetup["visibility"];
  status: StitchingMeetup["status"];
  going_count?: number | string | null;
  interested_count?: number | string | null;
  registered_count?: number | string | null;
  waitlist_count?: number | string | null;
  spots_left?: number | string | null;
};

export type MeetupRegistrationResult = {
  meetupId: string;
  registeredCount: number;
  waitlistCount: number;
  capacity: number | null;
  spotsLeft: number | null;
  status: StitchingMeetupRsvpStatus;
  waitlistPosition?: number | null;
  promotedUserId?: string | null;
  confirmedAt?: string | null;
};

export type MyMeetupRsvpRow = {
  status: StitchingMeetupRsvpStatus;
  confirmedAt?: string | null;
};

function clean(value?: string | null, max = 500): string {
  return (value ?? "").trim().slice(0, max);
}

function validateInput(input: StitchingMeetupInput) {
  const title = clean(input.title, 120);
  if (!title) throw new Error("Meetup title is required.");
  const startsAt = clean(input.startsAt, 40);
  if (!startsAt) throw new Error("Start time is required.");
  const startDate = new Date(startsAt);
  if (Number.isNaN(startDate.getTime())) throw new Error("Start time is invalid.");
  const endsAt = input.endsAt ? clean(input.endsAt, 40) : "";
  if (endsAt) {
    const endDate = new Date(endsAt);
    if (Number.isNaN(endDate.getTime())) throw new Error("End time is invalid.");
    if (endDate.getTime() < startDate.getTime()) throw new Error("End time must be after start time.");
  }
  const topics = (input.topics ?? [])
    .map((t) => clean(t, 40))
    .filter(Boolean)
    .slice(0, 12);
  return {
    title,
    description: clean(input.description, 4000),
    cover_image_url: clean(input.coverImageUrl, 500),
    starts_at: startDate.toISOString(),
    ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    timezone: clean(input.timezone, 64) || "America/Los_Angeles",
    location_type: input.locationType ?? "in_person",
    venue_name: clean(input.venueName, 120),
    address: clean(input.address, 200),
    city: clean(input.city, 80),
    region: clean(input.region, 40).toUpperCase(),
    postal_code: clean(input.postalCode, 16),
    country: clean(input.country, 8).toUpperCase() || "US",
    host_store_id: input.hostStoreId || null,
    capacity: input.capacity && input.capacity > 0 ? input.capacity : null,
    // Product law: registration is on-site; external is legacy only (not on create).
    rsvp_mode: "registration" as const,
    external_rsvp_url: "",
    topics,
    skill_level: clean(input.skillLevel, 40),
    visibility: input.visibility ?? "public",
    status: input.status ?? "scheduled",
  };
}

function num(value: number | string | null | undefined): number {
  return Number(value) || 0;
}

export function isRegisteredStatus(status?: StitchingMeetupRsvpStatus | null): boolean {
  return status === "registered" || status === "going" || status === "interested";
}

export function isWaitlistedStatus(status?: StitchingMeetupRsvpStatus | null): boolean {
  return status === "waitlisted";
}

export function mapMeetupRow(row: DbMeetupRow, myRsvp: StitchingMeetupRsvpStatus | null = null): StitchingMeetup {
  const registered =
    row.registered_count != null ? num(row.registered_count) : num(row.going_count) + num(row.interested_count);
  const capacity = row.capacity;
  const waitlistCount = num(row.waitlist_count);
  const spotsLeft =
    row.spots_left != null && row.spots_left !== ""
      ? Number(row.spots_left)
      : capacity != null
        ? Math.max(capacity - registered, 0)
        : null;
  let normalized: StitchingMeetupRsvpStatus | null = myRsvp;
  if (myRsvp && isRegisteredStatus(myRsvp)) normalized = "registered";
  return {
    id: row.id,
    hostId: row.host_user_id,
    hostStoreId: row.host_store_id,
    storeLinkStatus: (row.store_link_status as StitchingMeetup["storeLinkStatus"]) || (row.host_store_id ? "approved" : "none"),
    title: row.title,
    description: row.description ?? "",
    coverImageUrl: row.cover_image_url || undefined,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timezone: row.timezone || "America/Los_Angeles",
    locationType: row.location_type,
    venueName: row.venue_name ?? "",
    address: row.address ?? "",
    city: row.city ?? "",
    region: row.region ?? "",
    postalCode: row.postal_code ?? "",
    country: row.country ?? "US",
    latitude: row.latitude,
    longitude: row.longitude,
    capacity,
    rsvpMode: row.rsvp_mode === "in_app_rsvp" ? "registration" : row.rsvp_mode,
    externalRsvpUrl: row.external_rsvp_url || undefined,
    topics: row.topics ?? [],
    skillLevel: row.skill_level ?? "",
    visibility: row.visibility,
    status: row.status,
    registeredCount: registered,
    goingCount: registered,
    interestedCount: 0,
    waitlistCount,
    spotsLeft,
    myRsvp: normalized,
  };
}

export async function listUpcomingMeetupsOnline(filters?: {
  city?: string;
  region?: string;
  limit?: number;
}): Promise<StitchingMeetup[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data, error } = await client.rpc("list_upcoming_stitching_meetups", {
    p_city: filters?.city ?? "",
    p_region: filters?.region ?? "",
    p_limit: filters?.limit ?? 50,
  });
  if (error) throw error;
  return ((data as DbMeetupRow[] | null) ?? []).map((row) => mapMeetupRow(row));
}

export async function listMeetupsForStoreOnline(storeId: string): Promise<StitchingMeetup[]> {
  if (!isSupabaseConfigured || !storeId) return [];
  const client = requireSupabase();
  const { data, error } = await client
    .from("stitching_meetups")
    .select("*")
    .eq("host_store_id", storeId)
    .eq("visibility", "public")
    .in("status", ["scheduled", "ended"])
    .order("starts_at", { ascending: true })
    .limit(20);
  if (error) throw error;
  return ((data as DbMeetupRow[] | null) ?? []).map((row) => mapMeetupRow(row));
}

export async function getMeetupOnline(id: string): Promise<StitchingMeetup | null> {
  if (!isSupabaseConfigured || !id) return null;
  const client = requireSupabase();
  const { data, error } = await client.from("stitching_meetups").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapMeetupRow(data as DbMeetupRow);
}

export async function fetchMyMeetupRsvpsOnline(
  userId: string,
): Promise<Record<string, MyMeetupRsvpRow>> {
  if (!isSupabaseConfigured || !userId) return {};
  const client = requireSupabase();
  const { data, error } = await client
    .from("stitching_meetup_rsvps")
    .select("meetup_id,status,confirmed_at")
    .eq("user_id", userId)
    .in("status", ["registered", "going", "interested", "waitlisted"]);
  if (error) throw error;
  const out: Record<string, MyMeetupRsvpRow> = {};
  for (const row of (data as { meetup_id: string; status: StitchingMeetupRsvpStatus; confirmed_at: string | null }[] | null) ?? []) {
    out[row.meetup_id] = {
      status: isRegisteredStatus(row.status) ? "registered" : row.status,
      confirmedAt: row.confirmed_at,
    };
  }
  return out;
}

export async function createMeetupOnline(userId: string, input: StitchingMeetupInput): Promise<StitchingMeetup> {
  const values = validateInput(input);
  const client = requireSupabase();
  const { data, error } = await client.rpc("create_stitching_meetup", {
    p_title: values.title,
    p_description: values.description,
    p_starts_at: values.starts_at,
    p_ends_at: values.ends_at,
    p_timezone: values.timezone,
    p_location_type: values.location_type,
    p_venue_name: values.venue_name,
    p_address: values.address,
    p_city: values.city,
    p_region: values.region,
    p_postal_code: values.postal_code,
    p_country: values.country,
    p_capacity: values.capacity,
    p_topics: values.topics,
    p_skill_level: values.skill_level,
    p_visibility: values.visibility,
    p_host_store_id: values.host_store_id,
    p_request_store_venue: Boolean(input.requestStoreVenue),
  });
  if (error) throw new Error(error.message || "Could not create meetup");
  void userId;
  return mapMeetupRow(data as DbMeetupRow);
}

export async function listPendingMeetupStoreLinksOnline(storeId: string): Promise<StitchingMeetup[]> {
  if (!isSupabaseConfigured || !storeId) return [];
  const client = requireSupabase();
  const { data, error } = await client.rpc("list_pending_meetup_store_links", { p_store_id: storeId });
  if (error) throw new Error(error.message || "Could not load venue requests");
  return ((data as DbMeetupRow[] | null) ?? []).map((row) => mapMeetupRow(row));
}

export async function respondMeetupStoreLinkOnline(meetupId: string, approve: boolean): Promise<StitchingMeetup> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("respond_meetup_store_link", {
    p_meetup_id: meetupId,
    p_approve: approve,
  });
  if (error) throw new Error(error.message || "Could not update venue request");
  return mapMeetupRow(data as DbMeetupRow);
}

export async function cancelMeetupOnline(meetupId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("stitching_meetups").update({ status: "cancelled" }).eq("id", meetupId);
  if (error) throw error;
}

function mapRegistrationRpc(data: unknown): MeetupRegistrationResult {
  const row = Array.isArray(data) ? data[0] : data;
  const r = row as {
    meetup_id: string;
    registered_count: number | string;
    waitlist_count?: number | string | null;
    waitlist_position?: number | string | null;
    capacity: number | null;
    spots_left: number | null;
    status: string;
    promoted_user_id?: string | null;
    confirmed_at?: string | null;
  };
  const statusRaw = r.status;
  const status: StitchingMeetupRsvpStatus =
    statusRaw === "waitlisted"
      ? "waitlisted"
      : statusRaw === "cancelled"
        ? "cancelled"
        : "registered";
  return {
    meetupId: r.meetup_id,
    registeredCount: num(r.registered_count),
    waitlistCount: num(r.waitlist_count),
    capacity: r.capacity ?? null,
    spotsLeft: r.spots_left == null ? null : Number(r.spots_left),
    status,
    waitlistPosition: r.waitlist_position == null ? null : Number(r.waitlist_position),
    promotedUserId: r.promoted_user_id ?? null,
    confirmedAt: r.confirmed_at ?? null,
  };
}

export async function registerForMeetupOnline(meetupId: string): Promise<MeetupRegistrationResult> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("register_for_meetup", { p_meetup_id: meetupId });
  if (error) {
    const msg = error.message || "Could not register";
    if (/full|waitlist/i.test(msg)) throw new Error(msg.includes("waitlist") ? msg : "This meetup is full — join the waitlist.");
    if (/Sign in/i.test(msg)) throw new Error("Sign in to register for a meetup.");
    if (/not open|closed/i.test(msg)) throw new Error(msg);
    throw new Error(msg);
  }
  return mapRegistrationRpc(data);
}

export async function joinMeetupWaitlistOnline(meetupId: string): Promise<MeetupRegistrationResult> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("join_meetup_waitlist", { p_meetup_id: meetupId });
  if (error) {
    const msg = error.message || "Could not join waitlist";
    if (/Sign in/i.test(msg)) throw new Error("Sign in to join the waitlist.");
    throw new Error(msg);
  }
  return mapRegistrationRpc(data);
}

export async function cancelMeetupRegistrationOnline(meetupId: string): Promise<MeetupRegistrationResult> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("cancel_meetup_registration", { p_meetup_id: meetupId });
  if (error) throw new Error(error.message || "Could not cancel registration");
  return mapRegistrationRpc(data);
}

export type MeetupRosterEntry = {
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl: string;
  status: "registered" | "waitlisted" | string;
  confirmedAt?: string | null;
  createdAt?: string | null;
};

export async function listMeetupRegistrationsOnline(meetupId: string): Promise<MeetupRosterEntry[]> {
  if (!isSupabaseConfigured || !meetupId) return [];
  const client = requireSupabase();
  const { data, error } = await client.rpc("list_meetup_registrations", { p_meetup_id: meetupId });
  if (error) throw new Error(error.message || "Could not load roster");
  return ((data as {
    user_id: string;
    handle: string;
    display_name: string;
    avatar_url: string;
    status: string;
    confirmed_at: string | null;
    created_at: string | null;
  }[] | null) ?? []).map((row) => ({
    userId: row.user_id,
    handle: row.handle ?? "",
    displayName: row.display_name || row.handle || "Guest",
    avatarUrl: row.avatar_url || "",
    status: row.status,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
  }));
}

/** @deprecated use registerForMeetupOnline / cancelMeetupRegistrationOnline */
export async function setMeetupRsvpOnline(
  meetupId: string,
  _userId: string,
  status: StitchingMeetupRsvpStatus | null,
): Promise<void> {
  if (!status || status === "cancelled") {
    await cancelMeetupRegistrationOnline(meetupId);
    return;
  }
  await registerForMeetupOnline(meetupId);
}
