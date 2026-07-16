import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";
import type { Difficulty, Project, ProgressUpdate, Status } from "../types";

type DbProjectRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: "planned" | "in_progress" | "finished" | "paused";
  visibility: "public" | "private";
  difficulty: "beginner" | "confident_beginner" | "intermediate" | "advanced";
  category: string;
  canvas_type: string;
  pattern_source_name: string;
  pattern_source_url: string;
  primary_image_url: string;
  progress: number;
  created_at: string;
  updated_at: string;
};

type DbUpdateRow = {
  id: string;
  project_id: string;
  user_id: string;
  body: string;
  milestone: string;
  image_url: string;
  created_at: string;
};

type DbMaterial = { project_id: string; type: string; brand: string; color_name: string; notes: string };
type DbTag = { project_id: string; tags: { name: string; category: string } | null };

const statusFromDb: Record<DbProjectRow["status"], Status> = {
  planned: "planned",
  in_progress: "in progress",
  finished: "finished",
  paused: "paused",
};

const statusToDb: Record<Status, DbProjectRow["status"]> = {
  planned: "planned",
  "in progress": "in_progress",
  finished: "finished",
  paused: "paused",
};

const difficultyFromDb: Record<DbProjectRow["difficulty"], Difficulty> = {
  beginner: "beginner",
  confident_beginner: "confident beginner",
  intermediate: "intermediate",
  advanced: "advanced",
};

const difficultyToDb: Record<Difficulty, DbProjectRow["difficulty"]> = {
  beginner: "beginner",
  "confident beginner": "confident_beginner",
  intermediate: "intermediate",
  advanced: "advanced",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function mapUpdate(row: DbUpdateRow, comments: ProgressUpdate["comments"] = []): ProgressUpdate {
  return {
    id: row.id,
    date: formatDate(row.created_at),
    note: row.body,
    milestone: row.milestone,
    image: row.image_url,
    likes: 0,
    comments,
  };
}

function mapProject(
  row: DbProjectRow,
  materials: string[],
  stitches: string[],
  colors: string[],
  updates: ProgressUpdate[],
  flags: { likes: number; isLiked: boolean; isSaved: boolean },
): Project {
  return {
    id: row.id,
    title: row.title,
    creatorId: row.user_id,
    image: row.primary_image_url,
    status: statusFromDb[row.status],
    difficulty: difficultyFromDb[row.difficulty],
    category: row.category,
    canvasType: row.canvas_type,
    stitchTypes: stitches,
    materials,
    colors,
    patternSource: row.pattern_source_name,
    patternUrl: row.pattern_source_url,
    notes: row.description,
    likes: flags.likes,
    isLiked: flags.isLiked,
    isSaved: flags.isSaved,
    visibility: row.visibility,
    progress: row.progress,
    updates,
  };
}

export async function fetchPublicProjects(currentUserId?: string | null): Promise<Project[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();

  const { data: rows, error } = await client
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  if (!rows?.length) return [];

  const ids = rows.map((r) => r.id as string);

  const [{ data: materials }, { data: tags }, { data: updates }, { data: reactions }, { data: saved }] = await Promise.all([
    client.from("materials").select("project_id,type,brand,color_name,notes").in("project_id", ids),
    client.from("project_tags").select("project_id, tags(name, category)").in("project_id", ids),
    client.from("project_updates").select("*").in("project_id", ids).order("created_at", { ascending: false }),
    client.from("reactions").select("target_id,user_id").eq("target_type", "project").in("target_id", ids),
    currentUserId
      ? client
          .from("collection_items")
          .select("project_id, collections!inner(user_id)")
          .eq("collections.user_id", currentUserId)
      : Promise.resolve({ data: [] as { project_id: string }[] }),
  ]);

  const materialsByProject = groupMaterials(materials as DbMaterial[] | null);
  const tagsByProject = groupTags(tags as DbTag[] | null);
  const updatesByProject = new Map<string, ProgressUpdate[]>();
  for (const u of (updates as DbUpdateRow[] | null) ?? []) {
    const list = updatesByProject.get(u.project_id) ?? [];
    list.push(mapUpdate(u));
    updatesByProject.set(u.project_id, list);
  }

  const likesByProject = new Map<string, { count: number; mine: boolean }>();
  for (const r of reactions ?? []) {
    const entry = likesByProject.get(r.target_id) ?? { count: 0, mine: false };
    entry.count += 1;
    if (currentUserId && r.user_id === currentUserId) entry.mine = true;
    likesByProject.set(r.target_id, entry);
  }

  const savedSet = new Set(((saved as { project_id: string }[] | null) ?? []).map((s) => s.project_id));

  return (rows as DbProjectRow[]).map((row) => {
    const tagInfo = tagsByProject.get(row.id) ?? { stitches: [], colors: [] };
    const likeInfo = likesByProject.get(row.id) ?? { count: 0, mine: false };
    return mapProject(row, materialsByProject.get(row.id) ?? [], tagInfo.stitches, tagInfo.colors, updatesByProject.get(row.id) ?? [], {
      likes: likeInfo.count,
      isLiked: likeInfo.mine,
      isSaved: savedSet.has(row.id),
    });
  });
}

export async function createProjectOnline(input: {
  userId: string;
  title: string;
  notes: string;
  image: string;
  status: Status;
  difficulty: Difficulty;
  category: string;
  canvasType: string;
  materials: string[];
  stitchTypes: string[];
  colors: string[];
  patternSource: string;
  patternUrl: string;
  visibility: "public" | "private";
  progress: number;
}): Promise<Project> {
  const client = requireSupabase();
  const { data: row, error } = await client
    .from("projects")
    .insert({
      user_id: input.userId,
      title: input.title,
      description: input.notes,
      status: statusToDb[input.status],
      difficulty: difficultyToDb[input.difficulty],
      category: input.category,
      canvas_type: input.canvasType,
      pattern_source_name: input.patternSource,
      pattern_source_url: input.patternUrl,
      primary_image_url: input.image,
      visibility: input.visibility,
      progress: input.progress,
    })
    .select("*")
    .single();
  if (error) throw error;

  const projectId = row.id as string;

  if (input.materials.length) {
    await client.from("materials").insert(
      input.materials.map((m) => ({
        project_id: projectId,
        type: m,
        brand: "",
        color_name: "",
        notes: "",
      })),
    );
  }

  await upsertTags(projectId, input.stitchTypes, "stitch");
  await upsertTags(projectId, input.colors, "color");

  await client.from("project_updates").insert({
    project_id: projectId,
    user_id: input.userId,
    body: input.notes || "Project started",
    milestone: "Project started",
    image_url: input.image,
  });

  return mapProject(row as DbProjectRow, input.materials, input.stitchTypes, input.colors, [
    {
      id: `local-${Date.now()}`,
      date: "Today",
      milestone: "Project started",
      note: input.notes || "Project started",
      image: input.image,
      likes: 0,
      comments: [],
    },
  ], { likes: 0, isLiked: false, isSaved: false });
}

export async function addProgressUpdateOnline(projectId: string, userId: string, note: string, image: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("project_updates")
    .insert({
      project_id: projectId,
      user_id: userId,
      body: note,
      milestone: "Progress logged",
      image_url: image,
    })
    .select("*")
    .single();
  if (error) throw error;

  const { data: project } = await client.from("projects").select("progress,status").eq("id", projectId).single();
  if (project) {
    const nextProgress = Math.min(100, (project.progress as number) + 12);
    const nextStatus = project.status === "planned" ? "in_progress" : project.status;
    await client.from("projects").update({ progress: nextProgress, status: nextStatus }).eq("id", projectId);
  }

  return mapUpdate(data as DbUpdateRow);
}

async function upsertTags(projectId: string, names: string[], category: string) {
  if (!names.length) return;
  const client = requireSupabase();
  for (const name of names) {
    const { data: tag, error } = await client
      .from("tags")
      .upsert({ name, category }, { onConflict: "name,category" })
      .select("id")
      .single();
    if (error) throw error;
    await client.from("project_tags").upsert({ project_id: projectId, tag_id: tag.id });
  }
}

function groupMaterials(rows: DbMaterial[] | null) {
  const map = new Map<string, string[]>();
  for (const row of rows ?? []) {
    const label = [row.brand, row.type, row.color_name].filter(Boolean).join(" ").trim() || row.notes || "material";
    const list = map.get(row.project_id) ?? [];
    list.push(label);
    map.set(row.project_id, list);
  }
  return map;
}

function groupTags(rows: DbTag[] | null) {
  const map = new Map<string, { stitches: string[]; colors: string[] }>();
  for (const row of rows ?? []) {
    if (!row.tags) continue;
    const entry = map.get(row.project_id) ?? { stitches: [], colors: [] };
    if (row.tags.category === "stitch") entry.stitches.push(row.tags.name);
    if (row.tags.category === "color") entry.colors.push(row.tags.name);
    map.set(row.project_id, entry);
  }
  return map;
}
