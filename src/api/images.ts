import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";

export async function uploadProjectImage(userId: string, file: File): Promise<string> {
  if (!isSupabaseConfigured) {
    return URL.createObjectURL(file);
  }

  const client = requireSupabase();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await client.storage.from("project-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;

  const { data } = client.storage.from("project-images").getPublicUrl(path);
  return data.publicUrl;
}
