import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";
import type { Collection } from "../types";

type DbCollectionRow = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  collection_items?: { project_id: string }[] | null;
};

export type SavedCollection = Collection & {
  userId: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CollectionInput = {
  name: string;
  description?: string;
};

const DEFAULT_SAVED_DESCRIPTION = "Projects you saved from discovery.";

function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function cleanDescription(description?: string): string {
  return (description ?? "").trim();
}

function validateCollectionInput(input: CollectionInput): { name: string; description: string } {
  const name = cleanName(input.name);
  if (!name) throw new Error("Collection name is required.");
  if (name.length > 80) throw new Error("Collection name must be 80 characters or less.");

  const description = cleanDescription(input.description);
  if (description.length > 240) throw new Error("Collection description must be 240 characters or less.");

  return { name, description };
}

function mapCollection(row: DbCollectionRow): SavedCollection {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    projectIds: (row.collection_items ?? []).map((item) => item.project_id),
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchCollectionById(collectionId: string): Promise<SavedCollection> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("collections")
    .select("id,user_id,name,description,is_default,created_at,updated_at,collection_items(project_id)")
    .eq("id", collectionId)
    .single();
  if (error) throw error;
  return mapCollection(data as DbCollectionRow);
}

export async function getDefaultCollectionOnline(): Promise<string> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  const client = requireSupabase();
  const { data, error } = await client.rpc("ensure_default_collection");
  if (error) throw error;
  if (!data) throw new Error("Default Saved collection could not be loaded.");
  return data as string;
}

export async function listCollectionsOnline(userId?: string | null): Promise<SavedCollection[]> {
  void userId;
  if (!isSupabaseConfigured) return [];
  await getDefaultCollectionOnline();

  const client = requireSupabase();
  const { data, error } = await client
    .from("collections")
    .select("id,user_id,name,description,is_default,created_at,updated_at,collection_items(project_id)")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;

  return ((data as DbCollectionRow[] | null) ?? []).map(mapCollection);
}

export async function createCollectionOnline(input: CollectionInput): Promise<SavedCollection> {
  const values = validateCollectionInput(input);
  const client = requireSupabase();
  const { data: userResult, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const userId = userResult.user?.id;
  if (!userId) throw new Error("Sign in to create collections.");

  const { data, error } = await client
    .from("collections")
    .insert({
      user_id: userId,
      name: values.name,
      description: values.description,
      is_default: false,
    })
    .select("id,user_id,name,description,is_default,created_at,updated_at")
    .single();
  if (error) throw error;

  return mapCollection({ ...(data as DbCollectionRow), collection_items: [] });
}

export async function renameCollectionOnline(collectionId: string, input: CollectionInput): Promise<SavedCollection> {
  const values = validateCollectionInput(input);
  const client = requireSupabase();
  const { data, error } = await client
    .from("collections")
    .update({ name: values.name, description: values.description })
    .eq("id", collectionId)
    .select("id,user_id,name,description,is_default,created_at,updated_at,collection_items(project_id)")
    .single();
  if (error) throw error;

  return mapCollection(data as DbCollectionRow);
}

export async function deleteCollectionOnline(collection: Pick<SavedCollection, "id" | "isDefault"> | string): Promise<void> {
  const target = typeof collection === "string" ? await fetchCollectionById(collection) : collection;
  if (target.isDefault) throw new Error("Default Saved collection cannot be deleted.");

  const client = requireSupabase();
  const { error } = await client.from("collections").delete().eq("id", target.id);
  if (error) throw error;
}

export async function addProjectToCollectionOnline(collectionId: string, projectId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("collection_items").upsert(
    { collection_id: collectionId, project_id: projectId },
    { onConflict: "collection_id,project_id" },
  );
  if (error) throw error;
}

export async function removeProjectFromCollectionOnline(collectionId: string, projectId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("collection_items").delete().eq("collection_id", collectionId).eq("project_id", projectId);
  if (error) throw error;
}

export async function moveProjectBetweenCollectionsOnline(
  inputOrFromCollectionId:
    | {
        projectId: string;
        fromCollectionId?: string | null;
        toCollectionId: string;
      }
    | string
    | null
    | undefined,
  maybeToCollectionId?: string,
  maybeProjectId?: string,
): Promise<void> {
  const input =
    typeof inputOrFromCollectionId === "object" && inputOrFromCollectionId !== null
      ? inputOrFromCollectionId
      : {
          fromCollectionId: inputOrFromCollectionId ?? null,
          toCollectionId: maybeToCollectionId ?? "",
          projectId: maybeProjectId ?? "",
        };

  const client = requireSupabase();
  const { error } = await client.rpc("move_collection_item", {
    p_project_id: input.projectId,
    p_from_collection_id: input.fromCollectionId ?? null,
    p_to_collection_id: input.toCollectionId,
  });
  if (error) throw error;
}

export async function toggleDefaultSavedProjectOnline(projectId: string, currentlySaved: boolean): Promise<void> {
  const collectionId = await getDefaultCollectionOnline();
  if (currentlySaved) {
    await removeProjectFromCollectionOnline(collectionId, projectId);
  } else {
    await addProjectToCollectionOnline(collectionId, projectId);
  }
}

export async function loadCollectionOnline(collectionId: string): Promise<SavedCollection> {
  return fetchCollectionById(collectionId);
}

export { DEFAULT_SAVED_DESCRIPTION };
