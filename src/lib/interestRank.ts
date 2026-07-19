import type { Difficulty, Project } from "../types";

export type RecommendationSurface = "discover" | "studio";

export type InterestProfile = {
  interests: string[];
  skillLevel?: string;
};

const SKILL_ORDER: Difficulty[] = ["beginner", "confident beginner", "intermediate", "advanced"];

const INTEREST_PATTERNS: Record<string, { categories?: string[]; difficulty?: Difficulty[]; text: RegExp }> = {
  "beginner projects": {
    difficulty: ["beginner", "confident beginner"],
    text: /\b(starter|beginner|new stitcher|easy)\b/i,
  },
  ornaments: {
    categories: ["ornament"],
    text: /\bornament\b/i,
  },
  canvases: {
    categories: ["canvas", "framed piece"],
    text: /\bcanvas(es)?\b/i,
  },
  pillows: {
    categories: ["pillow"],
    text: /\bpillow\b/i,
  },
  holiday: {
    text: /\b(holiday|christmas|hanukkah|halloween|easter|valentine|seasonal)\b/i,
  },
  florals: {
    text: /\b(floral|flower|garden|rose|hydrangea|botanical|persimmon)\b/i,
  },
  animals: {
    text: /\b(animal|dog|cat|bird|horse|bunny|fox|pet|wildlife)\b/i,
  },
  "modern patterns": {
    text: /\b(modern|geometric|abstract|contemporary|colorblock|minimalist)\b/i,
  },
};

function projectText(project: Project) {
  return [project.title, project.notes, project.category, project.canvasType, project.patternSource, ...project.stitchTypes, ...project.colors]
    .join(" ")
    .toLowerCase();
}

function interestMatch(project: Project, interest: string): "strong" | "text" | null {
  const rule = INTEREST_PATTERNS[interest];
  if (!rule) return null;
  const haystack = projectText(project);
  if (rule.difficulty?.includes(project.difficulty)) return "strong";
  if (rule.categories?.some((category) => project.category.toLowerCase() === category || haystack.includes(category))) {
    return "strong";
  }
  if (rule.text.test(haystack)) return "text";
  return null;
}

function skillBoost(project: Project, skillLevel?: string) {
  if (!skillLevel) return 0;
  const userIdx = SKILL_ORDER.indexOf(skillLevel as Difficulty);
  const projectIdx = SKILL_ORDER.indexOf(project.difficulty);
  if (userIdx < 0 || projectIdx < 0) return 0;
  if (userIdx === projectIdx) return 0.6;
  if (Math.abs(userIdx - projectIdx) === 1) return 0.35;
  // Beginners: do not boost advanced unless other interest matches already applied elsewhere.
  if (skillLevel === "beginner" && project.difficulty === "advanced") return 0;
  return 0;
}

function baseScore(project: Project, index: number) {
  // Prefer existing social quality; keep a tiny stable recency proxy from original index when unknown.
  const engagement = Math.min(project.likes / 200, 1) * 0.2 + (project.isSaved ? 0.05 : 0);
  const media = project.image || project.videoUrl ? 0.1 : 0;
  const recency = Math.max(0, 0.35 - index * 0.01);
  return recency + engagement + media;
}

/**
 * Rank public projects by onboarding interests (docs/interest-ranked-feed.md).
 * Interests bias order only — never hard-filter the pool.
 */
export function rankProjectsByInterest(
  projects: Project[],
  profile: InterestProfile,
  options?: { dismissedIds?: Set<string> | string[]; followedCreatorIds?: string[]; surface?: RecommendationSurface },
): Project[] {
  const dismissed = options?.dismissedIds
    ? options.dismissedIds instanceof Set
      ? options.dismissedIds
      : new Set(options.dismissedIds)
    : new Set<string>();
  const followed = new Set(options?.followedCreatorIds ?? []);
  const interests = profile.interests.map((item) => item.trim().toLowerCase()).filter(Boolean);

  const eligible = projects.filter((project) => project.visibility === "public" && !dismissed.has(project.id));

  const scored = eligible.map((project, index) => {
    let interestBoost = 0;
    const matched: string[] = [];
    for (const interest of interests) {
      const match = interestMatch(project, interest);
      if (match === "strong") {
        interestBoost += 1;
        matched.push(interest);
      } else if (match === "text") {
        interestBoost += 0.5;
        matched.push(interest);
      }
    }
    interestBoost = Math.min(interestBoost, 2.5);
    const followBoost = options?.surface === "studio" && followed.has(project.creatorId) ? 3 : 0;
    const score = baseScore(project, index) + interestBoost + skillBoost(project, profile.skillLevel) + followBoost;
    return {
      project: {
        ...project,
        recommendationScore: score,
        matchedInterests: matched.length ? matched : project.matchedInterests,
      },
      score,
      creatorId: project.creatorId,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.project.id.localeCompare(b.project.id);
  });

  // Diversity: light re-order so we avoid 3+ consecutive same-creator when alternatives exist.
  const result: Project[] = [];
  const pool = [...scored];
  while (pool.length) {
    let pick = 0;
    if (result.length >= 2) {
      const lastTwo = result.slice(-2).map((p) => p.creatorId);
      if (lastTwo[0] === lastTwo[1]) {
        const alt = pool.findIndex((item) => item.creatorId !== lastTwo[0]);
        if (alt >= 0) pick = alt;
      }
    }
    const [chosen] = pool.splice(pick, 1);
    result.push(chosen.project);
  }
  return result;
}

export function composeStudioFeed(
  rankedPublic: Project[],
  followedCreatorIds: string[],
  dismissedStudioIds: Set<string> | string[],
): Project[] {
  const dismissed = dismissedStudioIds instanceof Set ? dismissedStudioIds : new Set(dismissedStudioIds);
  const followedSet = new Set(followedCreatorIds);
  const followed = rankedPublic.filter((p) => followedSet.has(p.creatorId) && !dismissed.has(p.id));
  const recommended = rankedPublic.filter((p) => !followedSet.has(p.creatorId) && !dismissed.has(p.id));
  // Followed first (keep their relative rank), then interest-ranked fill.
  return followed.length ? [...followed, ...recommended] : recommended;
}
