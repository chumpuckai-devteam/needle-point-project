import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);

export function validateImageFile(file: File): string | null {
  if (!file) return "Choose an image file.";
  if (file.size > MAX_BYTES) return "Image must be 8MB or smaller.";
  if (file.type && !ALLOWED.has(file.type) && !file.type.startsWith("image/")) {
    return "Use a JPG, PNG, WebP, or GIF image.";
  }
  return null;
}

export async function uploadProjectImage(userId: string, file: File): Promise<string> {
  const invalid = validateImageFile(file);
  if (invalid) throw new Error(invalid);

  if (!isSupabaseConfigured) {
    return URL.createObjectURL(file);
  }

  const client = requireSupabase();
  const rawExt = file.name.includes(".") ? file.name.split(".").pop() : "";
  const ext = (rawExt || (file.type.split("/")[1] || "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
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
