import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";
import type { StitchAlong } from "../types";

type DbStitchAlongRow = {
  id: string;
  host_user_id: string;
  title: string;
  description: string;
  theme: string;
  rules: string[] | null;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string;
  status: "draft" | "active" | "ended";
  is_public: boolean;
  created_at: string;
  updated_at: string;
  stitch_along_joins?: { user_id: string }[] | null;
  stitch_along_submissions?: { project_id: string }[] | null;
};

export type StitchAlongInput = {
  title: string;
  description?: string;
  theme?: string;
  rules?: string[];
  startDate?: string;
  endDate?: string;
  coverImageUrl?: string;
  status?: "draft" | "active" | "ended";
  isPublic?: boolean;
};

function formatWindow(startDate: string, endDate: string): string {
  if (!startDate && !endDate) return "Dates TBA";
  const format = (value: string) => {
    if (!value) return "";
    try {
      return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return value;
    }
  };
  return [format(startDate), format(endDate)].filter(Boolean).join(" - ");
}

function mapStitchAlong(row: DbStitchAlongRow, currentUserId?: string | null): StitchAlong {
  const joins = row.stitch_along_joins ?? [];
  const participantUserIds = joins.map((join) => join.user_id);
  const participantProjectIds = (row.stitch_along_submissions ?? []).map((submission) => submission.project_id);
  const joined = Boolean(currentUserId && joins.some((join) => join.user_id === currentUserId));
  const startDate = row.start_date ?? "";
  const endDate = row.end_date ?? "";
  return {
    id: row.id,
    title: row.title,
    hostId: row.host_user_id,
    dates: formatWindow(startDate, endDate),
    startDate,
    endDate,
    theme: row.theme,
    description: row.description,
    rules: row.rules ?? [],
    participantProjectIds,
    participantUserIds,
    joined,
    isPublic: row.is_public,
    coverImageUrl: row.cover_image_url,
    status: row.status,
    participantCount: joins.length,
  };
}

function normalizeInput(input: StitchAlongInput) {
  const title = input.title.trim();
  if (!title) throw new Error("Stitch-along title is required.");
  return {
    title,
    description: input.description?.trim() ?? "",
    theme: input.theme?.trim() ?? "",
    rules: (input.rules ?? []).map((rule) => rule.trim()).filter(Boolean),
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    cover_image_url: input.coverImageUrl?.trim() ?? "",
    status: input.status ?? "active",
    is_public: input.isPublic ?? true,
  };
}

const STITCH_ALONG_SELECT = "*, stitch_along_joins(user_id), stitch_along_submissions(project_id)";

export async function listPublicStitchAlongsOnline(currentUserId?: string | null): Promise<StitchAlong[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data, error } = await client
    .from("stitch_alongs")
    .select(STITCH_ALONG_SELECT)
    .eq("is_public", true)
    .order("start_date", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });
  // Rolling deploys / partial schema: never hard-fail Studio boot on SAL list.
  if (error) {
    const fallback = await client
      .from("stitch_alongs")
      .select(STITCH_ALONG_SELECT)
      .order("updated_at", { ascending: false });
    if (fallback.error) return [];
    return ((fallback.data ?? []) as DbStitchAlongRow[]).map((row) => mapStitchAlong(row, currentUserId));
  }
  return ((data ?? []) as DbStitchAlongRow[]).map((row) => mapStitchAlong(row, currentUserId));
}

export async function getStitchAlongOnline(stitchAlongId: string, currentUserId?: string | null): Promise<StitchAlong | null> {
  if (!isSupabaseConfigured) return null;
  const client = requireSupabase();
  const { data, error } = await client.from("stitch_alongs").select(STITCH_ALONG_SELECT).eq("id", stitchAlongId).maybeSingle();
  if (error) throw error;
  return data ? mapStitchAlong(data as DbStitchAlongRow, currentUserId) : null;
}

export async function createStitchAlongOnline(userId: string, input: StitchAlongInput): Promise<StitchAlong> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("stitch_alongs")
    .insert({
      host_user_id: userId,
      ...normalizeInput(input),
    })
    .select(STITCH_ALONG_SELECT)
    .single();
  if (error) throw error;
  // Host auto-joins their own event.
  await client.from("stitch_along_joins").upsert(
    { stitch_along_id: (data as DbStitchAlongRow).id, user_id: userId },
    { onConflict: "stitch_along_id,user_id" },
  );
  return mapStitchAlong(data as DbStitchAlongRow, userId);
}

export async function updateStitchAlongOnline(
  stitchAlongId: string,
  hostUserId: string,
  patch: Partial<StitchAlongInput> & { status?: "draft" | "active" | "ended" },
): Promise<StitchAlong> {
  const client = requireSupabase();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) updates.title = patch.title.trim();
  if (patch.description !== undefined) updates.description = patch.description.trim();
  if (patch.theme !== undefined) updates.theme = patch.theme.trim();
  if (patch.rules !== undefined) updates.rules = patch.rules.map((r) => r.trim()).filter(Boolean);
  if (patch.startDate !== undefined) updates.start_date = patch.startDate || null;
  if (patch.endDate !== undefined) updates.end_date = patch.endDate || null;
  if (patch.coverImageUrl !== undefined) updates.cover_image_url = patch.coverImageUrl.trim();
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.isPublic !== undefined) updates.is_public = patch.isPublic;

  const { data, error } = await client
    .from("stitch_alongs")
    .update(updates)
    .eq("id", stitchAlongId)
    .eq("host_user_id", hostUserId)
    .select(STITCH_ALONG_SELECT)
    .single();
  if (error) throw error;
  return mapStitchAlong(data as DbStitchAlongRow, hostUserId);
}

export async function joinStitchAlongOnline(stitchAlongId: string, userId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("stitch_along_joins").upsert(
    {
      stitch_along_id: stitchAlongId,
      user_id: userId,
    },
    { onConflict: "stitch_along_id,user_id" },
  );
  if (error) throw error;
}

export async function leaveStitchAlongOnline(stitchAlongId: string, userId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("stitch_along_joins")
    .delete()
    .eq("stitch_along_id", stitchAlongId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function submitToStitchAlongOnline(stitchAlongId: string, projectId: string, userId: string): Promise<void> {
  const client = requireSupabase();
  const { data: project, error: projectError } = await client
    .from("projects")
    .select("id,visibility,user_id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) throw new Error("Project not found.");
  if (project.visibility !== "public") throw new Error("Only public projects can be submitted.");

  const { error } = await client.from("stitch_along_submissions").upsert(
    {
      stitch_along_id: stitchAlongId,
      project_id: projectId,
      user_id: userId,
    },
    { onConflict: "stitch_along_id,project_id" },
  );
  if (error) throw error;
}
