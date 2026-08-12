import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";
import type { Creator } from "../types";

/** Public profile columns — never select email for list/public fetches. */
export const PUBLIC_PROFILE_COLUMNS =
  "id,name,handle,avatar_url,bio,skill_level,is_creator,location,onboarding_complete" as const;

/** Own-profile columns (email only for auth.uid() row). */
export const OWN_PROFILE_COLUMNS = `${PUBLIC_PROFILE_COLUMNS},email` as const;

type ProfileRow = {
  id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  bio: string;
  skill_level: string;
  is_creator: boolean;
  location: string;
  email?: string | null;
  onboarding_complete?: boolean;
};

export type ProfileDetails = Creator & {
  email?: string;
  onboardingComplete?: boolean;
};

export type ProfileUpdateInput = {
  name: string;
  handle: string;
  bio: string;
  skillLevel: string;
  location: string;
  avatarUrl: string;
  isCreator: boolean;
  links: { id?: string; label: string; url: string }[];
};

/**
 * Allow only http(s) profile links. Rejects javascript:, data:, etc.
 * Bare hostnames get https:// prefix.
 */
export function sanitizeProfileUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  // Block credentials-in-URL and empty hosts
  if (!parsed.hostname) return null;
  return parsed.toString();
}

function mapProfile(
  p: ProfileRow,
  links: { id?: string; label: string; url: string }[] = [],
  followers = 0,
  specialties: string[] = [],
  includeEmail = false,
): ProfileDetails {
  return {
    id: p.id,
    name: p.name,
    handle: p.handle,
    avatar: p.avatar_url || "/assets/needlepoint-hero.png",
    bio: p.bio,
    skillLevel: p.skill_level,
    isCreator: p.is_creator,
    location: p.location,
    followers,
    links,
    specialties,
    email: includeEmail ? (p.email ?? undefined) : undefined,
    onboardingComplete: p.onboarding_complete,
  };
}

export async function fetchProfiles(): Promise<Creator[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data: profiles, error } = await client.from("profiles").select(PUBLIC_PROFILE_COLUMNS);
  if (error) throw error;

  const ids = (profiles ?? []).map((p) => p.id as string);
  if (!ids.length) return [];

  const [{ data: links }, { data: follows }, { data: interests }] = await Promise.all([
    client.from("profile_links").select("id,profile_id,label,url").in("profile_id", ids),
    client.from("follows").select("following_id"),
    client.from("profile_interests").select("profile_id,interest").in("profile_id", ids),
  ]);

  const followerCounts = new Map<string, number>();
  for (const f of follows ?? []) {
    followerCounts.set(f.following_id, (followerCounts.get(f.following_id) ?? 0) + 1);
  }

  const linksByProfile = new Map<string, { id?: string; label: string; url: string }[]>();
  for (const link of links ?? []) {
    const list = linksByProfile.get(link.profile_id) ?? [];
    list.push({ id: link.id, label: link.label, url: link.url });
    linksByProfile.set(link.profile_id, list);
  }

  const interestsByProfile = new Map<string, string[]>();
  for (const row of interests ?? []) {
    const list = interestsByProfile.get(row.profile_id) ?? [];
    list.push(row.interest);
    interestsByProfile.set(row.profile_id, list);
  }

  return ((profiles as ProfileRow[]) ?? []).map((p) =>
    mapProfile(p, linksByProfile.get(p.id) ?? [], followerCounts.get(p.id) ?? 0, interestsByProfile.get(p.id) ?? [], false),
  );
}

export async function fetchProfileById(userId: string, viewerId?: string | null): Promise<ProfileDetails | null> {
  if (!isSupabaseConfigured) return null;
  const client = requireSupabase();
  const isSelf = Boolean(viewerId && viewerId === userId);
  // Never select email from profiles (column revoked for clients). Self email comes from auth session.
  const { data, error } = await client.from("profiles").select(PUBLIC_PROFILE_COLUMNS).eq("id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [{ data: links }, { data: follows }, { data: interests }] = await Promise.all([
    client.from("profile_links").select("id,label,url").eq("profile_id", userId).order("sort_order"),
    client.from("follows").select("following_id").eq("following_id", userId),
    client.from("profile_interests").select("interest").eq("profile_id", userId),
  ]);

  let email: string | undefined;
  if (isSelf) {
    const { data: authData } = await client.auth.getUser();
    email = authData.user?.email ?? undefined;
  }

  const mapped = mapProfile(
    data as ProfileRow,
    (links ?? []).map((l) => ({ id: l.id, label: l.label, url: l.url })),
    (follows ?? []).length,
    (interests ?? []).map((i) => i.interest),
    false,
  );
  return isSelf ? { ...mapped, email } : mapped;
}

/** Following IDs for the signed-in user (creator follow graph). */
export async function fetchFollowedCreatorIds(followerId: string): Promise<string[]> {
  if (!isSupabaseConfigured || !followerId) return [];
  const client = requireSupabase();
  const { data, error } = await client.from("follows").select("following_id").eq("follower_id", followerId);
  if (error) throw error;
  return (data ?? []).map((row) => row.following_id as string);
}

export async function updateProfile(userId: string, input: ProfileUpdateInput): Promise<ProfileDetails> {
  if (!isSupabaseConfigured) {
    return {
      id: userId,
      name: input.name,
      handle: input.handle,
      avatar: input.avatarUrl || "/assets/needlepoint-hero.png",
      bio: input.bio,
      skillLevel: input.skillLevel,
      isCreator: input.isCreator,
      location: input.location,
      followers: 0,
      links: input.links
        .map((l) => ({ ...l, url: sanitizeProfileUrl(l.url) || "" }))
        .filter((l) => l.label && l.url),
      specialties: [],
    };
  }

  const client = requireSupabase();
  const handle = input.handle
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 32);

  if (handle.length < 3) throw new Error("Handle must be at least 3 characters.");

  const cleanLinks = input.links
    .map((link, index) => {
      const url = sanitizeProfileUrl(link.url);
      if (!url) return null;
      const label = link.label.trim();
      if (!label) return null;
      return {
        profile_id: userId,
        label,
        url,
        sort_order: index,
      };
    })
    .filter((link): link is { profile_id: string; label: string; url: string; sort_order: number } => Boolean(link));

  // Reject if user submitted non-empty URLs that all failed sanitization
  const rawUrls = input.links.map((l) => l.url.trim()).filter(Boolean);
  if (rawUrls.length && !cleanLinks.length) {
    throw new Error("Links must be valid http:// or https:// URLs.");
  }

  const { data, error } = await client
    .from("profiles")
    .update({
      name: input.name.trim() || "Stitcher",
      handle,
      bio: input.bio.trim(),
      skill_level: input.skillLevel,
      location: input.location.trim(),
      avatar_url: input.avatarUrl.trim(),
      is_creator: input.isCreator,
    })
    .eq("id", userId)
    .select(PUBLIC_PROFILE_COLUMNS)
    .single();
  if (error) throw error;

  await client.auth.updateUser({
    data: {
      name: input.name.trim() || "Stitcher",
      handle,
      avatar_url: input.avatarUrl.trim(),
    },
  });

  await client.from("profile_links").delete().eq("profile_id", userId);
  if (cleanLinks.length) {
    const { error: linkError } = await client.from("profile_links").insert(cleanLinks);
    if (linkError) throw linkError;
  }

  const profile = await fetchProfileById(userId, userId);
  if (!profile) {
    const { data: authData } = await client.auth.getUser();
    return {
      ...mapProfile(
        data as ProfileRow,
        cleanLinks.map(({ label, url }) => ({ label, url })),
        0,
        [],
        false,
      ),
      email: authData.user?.email ?? undefined,
    };
  }
  return profile;
}

export async function completeOnboarding(userId: string, interests: string[], skillLevel: string) {
  if (!isSupabaseConfigured) return;
  const client = requireSupabase();
  await client.from("profiles").update({ skill_level: skillLevel, onboarding_complete: true }).eq("id", userId);
  if (interests.length) {
    await client.from("profile_interests").delete().eq("profile_id", userId);
    await client.from("profile_interests").insert(interests.map((interest) => ({ profile_id: userId, interest })));
  }
}

export async function toggleFollowOnline(followerId: string, followingId: string, currentlyFollowing: boolean) {
  if (!isSupabaseConfigured) return;
  const client = requireSupabase();
  if (currentlyFollowing) {
    const { error } = await client.from("follows").delete().eq("follower_id", followerId).eq("following_id", followingId);
    if (error) throw error;
  } else {
    const { error } = await client.from("follows").insert({ follower_id: followerId, following_id: followingId });
    if (error) throw error;
  }
}
