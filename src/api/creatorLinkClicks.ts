import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";

export type CreatorLinkClickInput = {
  profileId: string;
  profileLinkId: string;
  linkUrl: string;
};

export type CreatorLinkClickCountInput = {
  profileId?: string | null;
  profileLinkId?: string | null;
  startAt?: string | null;
  endAt?: string | null;
};

export type CreatorLinkClickCount = {
  profileId: string;
  profileLinkId: string;
  linkUrl: string;
  clickDay: string;
  clickCount: number;
};

type DbCreatorLinkClickCount = {
  profile_id: string;
  profile_link_id: string;
  link_url: string;
  click_day: string;
  click_count: number | string;
};

function normalizeExternalLinkUrl(linkUrl: string): string | null {
  const trimmed = linkUrl.trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return trimmed;
  } catch {
    return null;
  }
}

/**
 * Best-effort profile external-link click recording. This intentionally swallows
 * errors so analytics never blocks outbound navigation.
 */
export async function recordCreatorLinkClick(input: CreatorLinkClickInput): Promise<void> {
  if (!isSupabaseConfigured || !input.profileId || !input.profileLinkId) return;

  const linkUrl = normalizeExternalLinkUrl(input.linkUrl);
  if (!linkUrl) return;

  try {
    const client = requireSupabase();
    await client.from("creator_link_clicks").insert({
      profile_id: input.profileId,
      profile_link_id: input.profileLinkId,
      link_url: linkUrl,
    });
  } catch {
    // Best-effort analytics: do not block link navigation or leak details.
  }
}

export async function fetchCreatorLinkClickCounts(
  input: CreatorLinkClickCountInput = {},
): Promise<CreatorLinkClickCount[]> {
  if (!isSupabaseConfigured) return [];

  const client = requireSupabase();
  const { data, error } = await client.rpc("creator_link_click_counts", {
    p_profile_id: input.profileId ?? null,
    p_profile_link_id: input.profileLinkId ?? null,
    p_start_at: input.startAt ?? null,
    p_end_at: input.endAt ?? null,
  });
  if (error) throw error;

  return ((data as DbCreatorLinkClickCount[] | null) ?? []).map((row) => ({
    profileId: row.profile_id,
    profileLinkId: row.profile_link_id,
    linkUrl: row.link_url,
    clickDay: row.click_day,
    clickCount: Number(row.click_count) || 0,
  }));
}
