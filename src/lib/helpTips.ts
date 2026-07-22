import { loadFromStorage, saveToStorage } from "./storage";

/** localStorage key — browser-local so guests and signed-in share device prefs. */
export const HELP_TIPS_STORAGE_KEY = "needle-point-project:helpTips";

export const HELP_TIPS_VERSION = 1 as const;

export type HelpTipId =
  | "studio"
  | "discover"
  | "shops"
  | "more"
  | "saved"
  | "meetups_messages"
  | "report";

export type HelpTip = {
  id: HelpTipId;
  title: string;
  body: string;
  /** Matches `[data-help-anchor="<anchor>"]` in the shell. */
  anchor: string;
  /** Soft-navigate here before highlighting (optional). */
  path?: string;
  /** Prefer opening the mobile More sheet so the anchor is visible. */
  openMore?: boolean;
  /** Safe for signed-out browse sessions. */
  guestOk: boolean;
};

export type HelpTipsPrefs = {
  version: typeof HELP_TIPS_VERSION;
  /** True after skip, finish, or explicit dismiss — stops auto-start. */
  completed: boolean;
  completedAt?: string;
};

const DEFAULT_PREFS: HelpTipsPrefs = {
  version: HELP_TIPS_VERSION,
  completed: false,
};

/**
 * Short, skippable coach marks for core surfaces.
 * Keep copy plain-language; no blocking modal wall.
 */
export const HELP_TIPS: HelpTip[] = [
  {
    id: "studio",
    title: "Studio",
    body: "Your home feed — canvases from people you follow, plus fresh public stitches.",
    anchor: "nav-studio",
    path: "/",
    guestOk: true,
  },
  {
    id: "discover",
    title: "Discover",
    body: "Browse public projects and find makers to follow. Onboarding interests can rank picks higher.",
    anchor: "nav-discover",
    path: "/discover",
    guestOk: true,
  },
  {
    id: "shops",
    title: "Shops",
    body: "Find local needlepoint shops near you, or online shops that ship. Search by ZIP or city anytime.",
    anchor: "nav-shops",
    path: "/stores",
    guestOk: true,
  },
  {
    id: "more",
    title: "More (mobile)",
    body: "On phones, Saved boards, Messages, Meetups, and Account live under More — not gone, just tucked away.",
    anchor: "nav-more",
    openMore: true,
    guestOk: true,
  },
  {
    id: "saved",
    title: "Saved boards",
    body: "Bookmark projects into named boards so inspiration stays organized for later.",
    anchor: "nav-saved",
    path: "/collections",
    openMore: true,
    guestOk: true,
  },
  {
    id: "meetups_messages",
    title: "Meetups & Messages",
    body: "Join in-person stitch nights from Meetups. Chat with makers or shops in Messages (sign-in for full chat).",
    anchor: "nav-meetups",
    path: "/meetups",
    openMore: true,
    guestOk: true,
  },
  {
    id: "report",
    title: "Report",
    body: "See something harmful? Use Report on a post or profile. Moderators review it — check status under Account → Your reports.",
    anchor: "help-report",
    guestOk: true,
  },
];

export function loadHelpTipsPrefs(): HelpTipsPrefs {
  const raw = loadFromStorage<Partial<HelpTipsPrefs> | null>(HELP_TIPS_STORAGE_KEY, null);
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PREFS };
  return {
    version: HELP_TIPS_VERSION,
    completed: Boolean(raw.completed),
    completedAt: typeof raw.completedAt === "string" ? raw.completedAt : undefined,
  };
}

export function saveHelpTipsPrefs(prefs: HelpTipsPrefs): void {
  saveToStorage(HELP_TIPS_STORAGE_KEY, {
    version: HELP_TIPS_VERSION,
    completed: prefs.completed,
    completedAt: prefs.completedAt,
  });
}

export function markHelpTipsCompleted(): HelpTipsPrefs {
  const next: HelpTipsPrefs = {
    version: HELP_TIPS_VERSION,
    completed: true,
    completedAt: new Date().toISOString(),
  };
  saveHelpTipsPrefs(next);
  return next;
}

export function resetHelpTipsPrefs(): HelpTipsPrefs {
  const next: HelpTipsPrefs = { version: HELP_TIPS_VERSION, completed: false };
  saveHelpTipsPrefs(next);
  return next;
}

/** Paths where auto-start should not interrupt forms. */
export function shouldAutoStartHelpTips(pathname: string): boolean {
  if (pathname.startsWith("/auth")) return false;
  if (pathname.startsWith("/onboarding")) return false;
  return true;
}
