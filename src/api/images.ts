import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";

/**
 * Instagram-aligned practical limits (mobile share / feed-style posts):
 * - Photos: 8 MB (IG still compresses hard around this size)
 * - Videos: 100 MB (classic IG feed / shared video cap)
 * Formats match common phone camera output.
 */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif";
export const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v";
export const MEDIA_ACCEPT = `${IMAGE_ACCEPT},${VIDEO_ACCEPT}`;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"]);
const VIDEO_EXT = new Set(["mp4", "mov", "webm", "m4v", "qt"]);

const PROJECT_MEDIA_BUCKET = "project-images";

export type MediaKindHint = "image" | "video";

function extOf(file: File): string {
  if (file.name.includes(".")) {
    return file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
  }
  return "";
}

export function isImageFile(file: File): boolean {
  if (file.type && IMAGE_TYPES.has(file.type)) return true;
  const ext = extOf(file);
  return Boolean(ext && IMAGE_EXT.has(ext));
}

export function isVideoFile(file: File): boolean {
  if (file.type && VIDEO_TYPES.has(file.type)) return true;
  const ext = extOf(file);
  return Boolean(ext && VIDEO_EXT.has(ext));
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

/** @deprecated use validateImageFile — kept as alias */
export function validateImageFile(file: File): string | null {
  return validateMediaFile(file, "image");
}

export function validateVideoFile(file: File): string | null {
  return validateMediaFile(file, "video");
}

export function validateMediaFile(file: File, kind?: MediaKindHint): string | null {
  if (!file) return "Choose a file.";
  if (file.size <= 0) return "That file is empty.";

  const asImage = kind === "image" || (!kind && isImageFile(file));
  const asVideo = kind === "video" || (!kind && isVideoFile(file));

  if (kind === "image" && !isImageFile(file)) {
    return "Use a JPG, PNG, WebP, HEIC, or GIF photo.";
  }
  if (kind === "video" && !isVideoFile(file)) {
    return "Use an MP4, MOV, or WebM video.";
  }
  if (!asImage && !asVideo) {
    return "Use a photo (JPG/PNG/WebP/HEIC) or video (MP4/MOV/WebM).";
  }

  if (asImage) {
    if (file.size > MAX_IMAGE_BYTES) {
      return `Photos must be ${formatBytes(MAX_IMAGE_BYTES)} or smaller (Instagram-style limit).`;
    }
    return null;
  }

  if (file.size > MAX_VIDEO_BYTES) {
    return `Videos must be ${formatBytes(MAX_VIDEO_BYTES)} or smaller (Instagram-style limit).`;
  }
  return null;
}

async function uploadToProjectMedia(userId: string, file: File, kind: MediaKindHint): Promise<string> {
  const invalid = validateMediaFile(file, kind);
  if (invalid) throw new Error(invalid);

  if (!isSupabaseConfigured) {
    return URL.createObjectURL(file);
  }

  const client = requireSupabase();
  const rawExt = extOf(file);
  const fallback = kind === "video" ? "mp4" : "jpg";
  const fromType = (file.type.split("/")[1] || fallback).toLowerCase().replace("quicktime", "mov");
  const ext = (rawExt || fromType).replace(/[^a-z0-9]/g, "") || fallback;
  const folder = kind === "video" ? "videos" : "images";
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await client.storage.from(PROJECT_MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
  });
  if (error) throw error;

  const { data } = client.storage.from(PROJECT_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadProjectImage(userId: string, file: File): Promise<string> {
  return uploadToProjectMedia(userId, file, "image");
}

export async function uploadProjectVideo(userId: string, file: File): Promise<string> {
  return uploadToProjectMedia(userId, file, "video");
}

export const MEDIA_HELP = {
  photo: `JPG, PNG, WebP, HEIC, or GIF · up to ${formatBytes(MAX_IMAGE_BYTES)}`,
  video: `MP4, MOV, or WebM · up to ${formatBytes(MAX_VIDEO_BYTES)}`,
  either: `Photo up to ${formatBytes(MAX_IMAGE_BYTES)} · Video up to ${formatBytes(MAX_VIDEO_BYTES)}`,
} as const;
