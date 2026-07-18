import type { Difficulty, MediaKind, Project, Status } from "./types";

export type View =
  | { name: "home" }
  | { name: "discover" }
  | { name: "journal" }
  | { name: "project"; id: string }
  | { name: "profile"; id: string }
  | { name: "collections" }
  | { name: "stitchAlong" }
  | { name: "stores" }
  | { name: "store"; handle: string }
  | { name: "auth" }
  | { name: "onboarding" };

export type DraftProject = {
  title: string;
  image: string;
  videoUrl: string;
  status: Status;
  difficulty: Difficulty;
  category: string;
  canvasType: string;
  materials: string;
  stitchTypes: string;
  colors: string;
  notes: string;
  patternSource: string;
  patternUrl: string;
  visibility: "public" | "private";
  storeIds: string[];
};

export const blankDraft: DraftProject = {
  title: "",
  image: "",
  videoUrl: "",
  status: "in progress",
  difficulty: "confident beginner",
  category: "ornament",
  canvasType: "18 mesh canvas",
  materials: "DMC floss, wool",
  stitchTypes: "basketweave, continental",
  colors: "rose, cream",
  notes: "",
  patternSource: "Personal stash",
  patternUrl: "",
  visibility: "public",
  storeIds: [],
};

export const statusOptions: Status[] = ["planned", "in progress", "finished", "paused"];
export const difficultyOptions: Difficulty[] = ["beginner", "confident beginner", "intermediate", "advanced"];

export const fallbackImages = [
  "/assets/persimmon-garden-pillow.jpg",
  "/assets/tiny-ski-lodge-ornament.jpg",
  "/assets/bookshop-door-canvas.jpg",
  "/assets/blue-hydrangea-belt.jpg",
];

export function unique(values: string[]) {
  return Array.from(new Set(values)).sort();
}

export function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function resolveMediaKind(project: Pick<Project, "image" | "videoUrl" | "mediaKind">): MediaKind {
  if (project.mediaKind) return project.mediaKind;
  if (project.videoUrl?.trim()) return "video";
  if (project.image?.trim()) return "image";
  return "text";
}

export function projectCommentCount(project: Project) {
  return project.updates.reduce((sum, update) => sum + update.comments.length, 0);
}

export async function shareProjectPost(project: Project, handle: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/projects/${project.id}`;
  const text = `${project.title}${handle ? ` by @${handle}` : ""} · Needlepoint`;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({ title: project.title, text, url });
      return { ok: true as const, method: "native" as const };
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false as const, method: "cancelled" as const };
    }
  }
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return { ok: true as const, method: "clipboard" as const };
    }
  } catch {
    // Ignore clipboard failures and return the URL below.
  }
  return { ok: false as const, method: "failed" as const, url };
}
