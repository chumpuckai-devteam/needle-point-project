import type { Difficulty, MediaKind, Project, Status } from "./types";

export type View =
  | { name: "home" }
  | { name: "discover" }
  | { name: "journal" }
  | { name: "project"; id: string }
  | { name: "profile"; id: string }
  | { name: "collections" }
  | { name: "stitchAlong"; id?: string }
  | { name: "meetups"; tab?: "browse" | "mine" }
  | { name: "meetup"; id: string }
  | { name: "messages"; threadId?: string }
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
  /** Optional specific catalog products for Shop the look. */
  productIds: string[];
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
  productIds: [],
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

/** Owner check used by private-project gates. */
export function isProjectOwner(project: Pick<Project, "creatorId">, viewerId: string | null | undefined) {
  return Boolean(viewerId && project.creatorId === viewerId);
}

/**
 * Who may open a project in the UI.
 * Public → anyone. Private → owner only.
 * Non-owners must get the same empty/404 chrome (no title/metadata leak).
 */
export function canViewProject(
  project: Pick<Project, "visibility" | "creatorId">,
  viewerId: string | null | undefined,
) {
  if (project.visibility !== "private") return true;
  return isProjectOwner(project, viewerId);
}

/** Studio / Discover / shop tags / other profiles: public canvases only. */
export function isPublicProject(project: Pick<Project, "visibility">) {
  return project.visibility === "public";
}

export function filterPublicProjects<T extends Pick<Project, "visibility">>(projects: T[]) {
  return projects.filter(isPublicProject);
}

/** Drop private projects the viewer is not allowed to see (defense in depth vs RLS). */
export function filterViewableProjects<T extends Pick<Project, "visibility" | "creatorId">>(
  projects: T[],
  viewerId: string | null | undefined,
) {
  return projects.filter((project) => canViewProject(project, viewerId));
}

export function visibilityLabel(visibility: "public" | "private") {
  return visibility === "private" ? "Private" : "Public";
}

export function visibilityHelp(visibility: "public" | "private") {
  return visibility === "private"
    ? "Only you can open this project. Shared links will show as not found for everyone else."
    : "Anyone on Needlepoint can view this project and open its link.";
}

export type ShareProjectResult =
  | { ok: true; method: "native" | "clipboard" | "private-clipboard"; url?: string }
  | { ok: false; method: "cancelled" | "failed" | "private-blocked"; url?: string };

/**
 * Share a project link. Private projects never use the native share sheet
 * (avoids broadcasting a title that non-owners cannot open) — clipboard only
 * with a private-specific result so the UI can explain access rules.
 */
export async function shareProjectPost(project: Project, handle: string): Promise<ShareProjectResult> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/projects/${project.id}`;

  if (project.visibility === "private") {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        return { ok: true, method: "private-clipboard", url };
      }
    } catch {
      // fall through
    }
    return { ok: false, method: "private-blocked", url };
  }

  const text = `${project.title}${handle ? ` by @${handle}` : ""} · Needlepoint`;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({ title: project.title, text, url });
      return { ok: true, method: "native" };
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, method: "cancelled" };
    }
  }
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return { ok: true, method: "clipboard" };
    }
  } catch {
    // Ignore clipboard failures and return the URL below.
  }
  return { ok: false, method: "failed", url };
}
