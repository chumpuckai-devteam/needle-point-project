import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";

export async function toggleProjectLikeOnline(projectId: string, userId: string, currentlyLiked: boolean) {
  if (!isSupabaseConfigured) return;
  const client = requireSupabase();
  if (currentlyLiked) {
    const { error } = await client
      .from("reactions")
      .delete()
      .eq("user_id", userId)
      .eq("target_type", "project")
      .eq("target_id", projectId)
      .eq("reaction_type", "like");
    if (error) throw error;
  } else {
    const { error } = await client.from("reactions").insert({
      user_id: userId,
      target_type: "project",
      target_id: projectId,
      reaction_type: "like",
    });
    if (error) throw error;
  }
}

export async function addCommentOnline(targetId: string, userId: string, body: string, targetType: "project" | "project_update" = "project_update") {
  if (!isSupabaseConfigured) return null;
  const client = requireSupabase();
  const { data, error } = await client
    .from("comments")
    .insert({ user_id: userId, target_type: targetType, target_id: targetId, body })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function toggleSaveOnline(userId: string, projectId: string, currentlySaved: boolean) {
  if (!isSupabaseConfigured) return;
  const client = requireSupabase();
  const { data: collections, error: colError } = await client
    .from("collections")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (colError) throw colError;
  let collectionId = collections?.[0]?.id as string | undefined;
  if (!collectionId) {
    const { data: created, error } = await client
      .from("collections")
      .insert({ user_id: userId, name: "Saved", description: "Projects you saved from discovery." })
      .select("id")
      .single();
    if (error) throw error;
    collectionId = created.id as string;
  }

  if (currentlySaved) {
    const { error } = await client.from("collection_items").delete().eq("collection_id", collectionId).eq("project_id", projectId);
    if (error) throw error;
  } else {
    const { error } = await client.from("collection_items").insert({ collection_id: collectionId, project_id: projectId });
    if (error) throw error;
  }
}
