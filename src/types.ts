export type Status = "planned" | "in progress" | "finished" | "paused";
export type Difficulty = "beginner" | "confident beginner" | "intermediate" | "advanced";

export type Creator = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  skillLevel: string;
  isCreator: boolean;
  location: string;
  followers: number;
  links: { label: string; url: string }[];
  specialties: string[];
};

export type ProgressUpdate = {
  id: string;
  date: string;
  note: string;
  milestone: string;
  image: string;
  likes: number;
  comments: Comment[];
};

export type Comment = {
  id: string;
  author: string;
  body: string;
};

export type Project = {
  id: string;
  title: string;
  creatorId: string;
  image: string;
  status: Status;
  difficulty: Difficulty;
  category: string;
  canvasType: string;
  stitchTypes: string[];
  materials: string[];
  colors: string[];
  patternSource: string;
  patternUrl: string;
  notes: string;
  likes: number;
  isLiked: boolean;
  isSaved: boolean;
  visibility: "public" | "private";
  progress: number;
  updates: ProgressUpdate[];
};

export type Collection = {
  id: string;
  name: string;
  description: string;
  projectIds: string[];
};

export type StitchAlong = {
  id: string;
  title: string;
  hostId: string;
  dates: string;
  theme: string;
  description: string;
  rules: string[];
  participantProjectIds: string[];
  joined: boolean;
};
