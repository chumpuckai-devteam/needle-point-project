import type { Difficulty, Status } from "./types";

export type View =
  | { name: "home" }
  | { name: "discover" }
  | { name: "project"; id: string }
  | { name: "profile"; id: string }
  | { name: "collections" }
  | { name: "journal" }
  | { name: "stitchAlong" }
  | { name: "auth" }
  | { name: "onboarding" };

export type DraftProject = {
  title: string;
  image: string;
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
};

export const blankDraft: DraftProject = {
  title: "",
  image: "",
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
