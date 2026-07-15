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
};

export async function fetchProfiles(): Promise<Creator[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data: profiles, error } = await client.from("profiles").select("*");
  if (error) throw error;

  const ids = (profiles ?? []).map((p) => p.id as string);
  const [{ data: links }, { data: follows }] = await Promise.all([
    client.from("profile_links").select("profile_id,label,url").in("profile_id", ids),
    client.from("follows").select("following_id"),
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

  return ((profiles as ProfileRow[]) ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    handle: p.handle,
    avatar: p.avatar_url || "/assets/needlepoint-hero.png",
    bio: p.bio,
    skillLevel: p.skill_level,
    isCreator: p.is_creator,
    location: p.location,
    followers: followerCounts.get(p.id) ?? 0,
    links: linksByProfile.get(p.id) ?? [],
    specialties: [],
  }));
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
