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
  capacity?: number | null;
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
  host_store_id: string | null;
  title: string;
  description: string;
  cover_image_url: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location_type: StitchingMeetup["locationType"];
  venue_name: string;
  address: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  rsvp_mode: StitchingMeetup["rsvpMode"];
  external_rsvp_url: string;
  topics: string[] | null;
  skill_level: string;
  visibility: StitchingMeetup["visibility"];
  status: StitchingMeetup["status"];
  created_at?: string;
  updated_at?: string;
  going_count?: number | string | null;
  interested_count?: number | string | null;
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
    rsvp_mode: input.rsvpMode ?? "in_app_rsvp",
    external_rsvp_url: clean(input.externalRsvpUrl, 500),
    topics,
    skill_level: clean(input.skillLevel, 40),
    visibility: input.visibility ?? "public",
    status: input.status ?? "scheduled",
  };
}

export function mapMeetupRow(row: DbMeetupRow, myRsvp: StitchingMeetupRsvpStatus | null = null): StitchingMeetup {
  return {
    id: row.id,
    hostId: row.host_user_id,
    hostStoreId: row.host_store_id,
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
    capacity: row.capacity,
    rsvpMode: row.rsvp_mode,
    externalRsvpUrl: row.external_rsvp_url || undefined,
    topics: row.topics ?? [],
    skillLevel: row.skill_level ?? "",
    visibility: row.visibility,
    status: row.status,
    goingCount: Number(row.going_count) || 0,
    interestedCount: Number(row.interested_count) || 0,
    myRsvp,
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

export async function fetchMyMeetupRsvpsOnline(userId: string): Promise<Record<string, StitchingMeetupRsvpStatus>> {
  if (!isSupabaseConfigured || !userId) return {};
  const client = requireSupabase();
  const { data, error } = await client
    .from("stitching_meetup_rsvps")
    .select("meetup_id,status")
    .eq("user_id", userId)
    .in("status", ["going", "interested"]);
  if (error) throw error;
  const out: Record<string, StitchingMeetupRsvpStatus> = {};
  for (const row of (data as { meetup_id: string; status: StitchingMeetupRsvpStatus }[] | null) ?? []) {
    out[row.meetup_id] = row.status;
  }
  return out;
}

export async function createMeetupOnline(userId: string, input: StitchingMeetupInput): Promise<StitchingMeetup> {
  const values = validateInput(input);
  const client = requireSupabase();
  const { data, error } = await client
    .from("stitching_meetups")
    .insert({ ...values, host_user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return mapMeetupRow(data as DbMeetupRow);
}

export async function cancelMeetupOnline(meetupId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("stitching_meetups").update({ status: "cancelled" }).eq("id", meetupId);
  if (error) throw error;
}

export async function setMeetupRsvpOnline(
  meetupId: string,
  userId: string,
  status: StitchingMeetupRsvpStatus | null,
): Promise<void> {
  const client = requireSupabase();
  if (!status || status === "cancelled") {
    const { error } = await client.from("stitching_meetup_rsvps").delete().eq("meetup_id", meetupId).eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const { error } = await client.from("stitching_meetup_rsvps").upsert(
    { meetup_id: meetupId, user_id: userId, status },
    { onConflict: "meetup_id,user_id" },
  );
  if (error) throw error;
}
