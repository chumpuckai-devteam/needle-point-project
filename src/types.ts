export type Status = "planned" | "in progress" | "finished" | "paused";
export type Difficulty = "beginner" | "confident beginner" | "intermediate" | "advanced";
export type StoreType = "local" | "online" | "both";
export type StoreRole = "available_at" | "pattern_from" | "threads_from" | "finishing";
/** Feed post media: X/IG-style text, image, or video. */
export type MediaKind = "text" | "image" | "video";

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
  links: { id?: string; label: string; url: string }[];
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
  /** Optional video URL for feed posts (mp4/webm or hosted stream). */
  videoUrl?: string;
  mediaKind?: MediaKind;
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
  storeIds?: string[];
  /** Optional ranking debug fields from get_recommended_projects / client ranker. */
  recommendationScore?: number;
  matchedInterests?: string[];
};

export type StoreProduct = {
  id: string;
  storeId: string;
  name: string;
  description: string;
  image: string;
  priceLabel: string;
  externalUrl: string;
  category: string;
};

export type Store = {
  id: string;
  ownerUserId: string | null;
  name: string;
  handle: string;
  storeType: StoreType;
  description: string;
  avatar: string;
  coverImage: string;
  websiteUrl: string;
  location: string;
  city: string;
  region: string;
  /** US ZIP / postal code (empty string when unknown). */
  postalCode: string;
  country: string;
  shipsNationwide: boolean;
  specialties: string[];
  products: StoreProduct[];
  projectCount: number;
  /** Public follower count (store_follows). */
  followerCount?: number;
  /** Optional geocode for proximity ranking (local / hybrid shops). */
  latitude?: number | null;
  longitude?: number | null;
};

export type Collection = {
  id: string;
  name: string;
  description: string;
  projectIds: string[];
  isDefault?: boolean;
};

export type StitchAlong = {
  id: string;
  title: string;
  hostId: string;
  dates: string;
  startDate: string;
  endDate: string;
  theme: string;
  description: string;
  rules: string[];
  participantProjectIds: string[];
  joined: boolean;
  isPublic: boolean;
  coverImageUrl?: string;
  status?: "draft" | "active" | "ended";
  /** Join count (preferred participant metric). */
  participantCount?: number;
};
