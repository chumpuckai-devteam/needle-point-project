import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";
import type { Creator } from "../types";

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
  links: { label: string; url: string }[];
};

function mapProfile(
  p: ProfileRow,
  links: { label: string; url: string }[] = [],
  followers = 0,
  specialties: string[] = [],
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
    email: p.email ?? undefined,
    onboardingComplete: p.onboarding_complete,
  };
}

export async function fetchProfiles(): Promise<Creator[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data: profiles, error } = await client.from("profiles").select("*");
  if (error) throw error;

  const ids = (profiles ?? []).map((p) => p.id as string);
  if (!ids.length) return [];

  const [{ data: links }, { data: follows }, { data: interests }] = await Promise.all([
    client.from("profile_links").select("profile_id,label,url").in("profile_id", ids),
    client.from("follows").select("following_id"),
    client.from("profile_interests").select("profile_id,interest").in("profile_id", ids),
  ]);

  const followerCounts = new Map<string, number>();
  for (const f of follows ?? []) {
    followerCounts.set(f.following_id, (followerCounts.get(f.following_id) ?? 0) + 1);
  }

  const linksByProfile = new Map<string, { label: string; url: string }[]>();
  for (const link of links ?? []) {
    const list = linksByProfile.get(link.profile_id) ?? [];
    list.push({ label: link.label, url: link.url });
    linksByProfile.set(link.profile_id, list);
  }

  const interestsByProfile = new Map<string, string[]>();
  for (const row of interests ?? []) {
    const list = interestsByProfile.get(row.profile_id) ?? [];
    list.push(row.interest);
    interestsByProfile.set(row.profile_id, list);
  }

  return ((profiles as ProfileRow[]) ?? []).map((p) =>
    mapProfile(p, linksByProfile.get(p.id) ?? [], followerCounts.get(p.id) ?? 0, interestsByProfile.get(p.id) ?? []),
  );
}

export async function fetchProfileById(userId: string): Promise<ProfileDetails | null> {
  if (!isSupabaseConfigured) return null;
  const client = requireSupabase();
  const { data, error } = await client.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [{ data: links }, { data: follows }, { data: interests }] = await Promise.all([
    client.from("profile_links").select("label,url").eq("profile_id", userId).order("sort_order"),
    client.from("follows").select("following_id").eq("following_id", userId),
    client.from("profile_interests").select("interest").eq("profile_id", userId),
  ]);

  return mapProfile(
    data as ProfileRow,
    (links ?? []).map((l) => ({ label: l.label, url: l.url })),
    (follows ?? []).length,
    (interests ?? []).map((i) => i.interest),
  );
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
      links: input.links,
      specialties: [],
    };
  }

  const client = requireSupabase();
  const handle = input.handle
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 32);

  if (handle.length < 3) throw new Error("Handle must be at least 3 characters.");

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
    .select("*")
    .single();
  if (error) throw error;

  // Keep auth metadata in sync for session display
  await client.auth.updateUser({
    data: {
      name: input.name.trim() || "Stitcher",
      handle,
      avatar_url: input.avatarUrl.trim(),
    },
  });

  await client.from("profile_links").delete().eq("profile_id", userId);
  const cleanLinks = input.links
    .map((link, index) => ({
      profile_id: userId,
      label: link.label.trim(),
      url: link.url.trim(),
      sort_order: index,
    }))
    .filter((link) => link.label && link.url);
  if (cleanLinks.length) {
    const { error: linkError } = await client.from("profile_links").insert(cleanLinks);
    if (linkError) throw linkError;
  }

  const profile = await fetchProfileById(userId);
  if (!profile) return mapProfile(data as ProfileRow, cleanLinks.map(({ label, url }) => ({ label, url })));
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
