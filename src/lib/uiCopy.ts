/**
 * Product copy matrix for empty / loading / error surfaces.
 * Source of truth: docs/empty-error-loading-state-audit.md
 * Prefer these strings over raw Supabase/browser messages in UI.
 */

export const uiCopy = {
  studio: {
    feed: {
      loading: "Loading fresh stitches…",
      empty: {
        title: "Your Needlepoint Palace is ready for its first stitch",
        body: "Post a canvas photo, progress note, or short clip to start your project thread.",
        cta: "Create post",
        guestBody: "Sign in to post a canvas photo, progress note, or short clip and start your project thread.",
        guestCta: "Sign in",
      },
      followedEmptyInline:
        "Browsing the community feed — follow makers to prioritize their stitches here.",
      followedEmptyCta: "Browse Discover",
      refreshError: {
        title: "Needlepoint Palace couldn't refresh",
        body: "You're seeing the last stitches we have. Try again when your connection settles.",
        cta: "Try again",
      },
    },
    followedShops: {
      empty: {
        title: "Pin shops you love",
        body: "Optional — follow shops from the directory and they’ll appear here.",
        cta: "Browse shops",
      },
    },
  },
  shops: {
    loading: "Loading shop shelves…",
    allEmpty: {
      title: "No shops are listed yet",
      body: "The directory is still being threaded. Check back soon, or add seed shops before launch.",
    },
    localCitiesEmpty: {
      title: "No local shop cities are listed yet",
      body: "Online shops that ship are still available below while we grow the local directory.",
    },
    invalidSearch: "Enter a 5-digit ZIP, or try a city like Austin, TX.",
    ambiguousCity: {
      body: (radiusMiles: number) => `Choose a city so we can show shops within about ${radiusMiles} miles.`,
    },
    zeroLocal: {
      title: (radiusMiles: number, place: string) => `No local shops within ${radiusMiles} miles of ${place}`,
      titleNearYou: (radiusMiles: number) => `No local shops within ${radiusMiles} miles`,
      body: "Our directory is still growing here. Widen the hoop or jump to online shops that ship.",
      expandCta: (nextRadiusMiles: number) => `Expand to ${nextRadiusMiles} miles`,
      onlineCta: "Browse online shops",
    },
    geocodeError: {
      title: "We couldn't place that search on the map",
      body: "Try a nearby city or ZIP; we'll keep online shops visible below.",
    },
    location: {
      firstDenied: {
        title: "Location is off for now",
        body: "No worries — search by ZIP or city, or browse online shops that ship.",
      },
      persistentDenied: {
        title: "Location needs a browser setting change",
        body: "Open your browser's site settings, allow location for Needlepoint, then try again. You can still search by ZIP or city.",
      },
      unavailable: {
        title: "We couldn't get your location",
        body: "Try a ZIP or city instead. Online shops that ship are still below.",
      },
    },
  },
  shopDetail: {
    notFound: {
      title: "Shop not found",
      body: "That shop profile may have moved, been claimed under a new handle, or is no longer listed.",
      cta: "Browse shops",
    },
    catalogEmpty: {
      owner: {
        title: "Your catalog shelf is empty",
        body: "Add canvases, threads, classes, or finishing links so stitchers can find them from tagged projects.",
        cta: "Add product",
      },
      visitor: {
        title: "This shop hasn't stocked its Needlepoint shelf yet",
        body: "Follow the shop or visit their website for the latest canvases and classes.",
      },
    },
    projectsEmpty: {
      owner: {
        title: "No tagged projects yet",
        body: "Tag this shop in a journal entry when a canvas, kit, or finishing service came from here.",
      },
      visitor: {
        title: "No stitched examples here yet",
        body: "When stitchers tag this shop, their finished and in-progress pieces will appear here.",
      },
    },
    productSaveError: "We couldn't save that catalog item. Your product details are still here — try again.",
    productDeleteError: "We couldn't remove that catalog item. Try again in a moment.",
    profileSaveError: "We couldn't save the shop profile. Your edits are still on screen — try again.",
    claimError: "We couldn't send the claim request. Try again, or contact Needlepoint support if this is your shop.",
  },
  journal: {
    loading: "Loading your project journal…",
    empty: {
      title: "Your project journal is blank",
      body: "Save your first canvas, thread notes, and progress photos so future-you can pick up the stitch.",
    },
    uploadError:
      "We couldn't attach that project photo. Try a smaller JPG/PNG/WebP, or save with a photo URL for now.",
    saveError: "We couldn't save this journal entry. Your draft is still here — try again in a moment.",
    authError: "Sign in to save projects across devices, or switch to demo mode for local testing.",
  },
  projectDetail: {
    notFound: {
      title: "Project not available",
      body: "This canvas may be private, moved, or no longer shared.",
      cta: "Back to Discover",
    },
    updatesEmpty: {
      owner: {
        title: "No progress updates yet",
        body: "Log a stitch choice, milestone, or thread swap so the project has a timeline.",
      },
      visitor: {
        title: "No stitch notes yet",
        body: "When the maker posts progress, updates will appear here.",
      },
    },
    commentsDisabledUntilUpdate: "Comments open after the first progress update.",
    shopTheLookEmpty: {
      title: "No shop links for this canvas yet",
      body: "Tagged shops can add catalog links; checkout always happens on the shop's own site.",
    },
    editError: "We couldn't save those project edits. Your changes are still on screen — try again.",
    updateError: "We couldn't add that progress update. The note is still here; try again or remove the photo.",
  },
  auth: {
    sessionLoading: "Loading your session…",
    signIn: {
      invalidTitle: "Sign in didn't match",
      invalidBody: "That email and password didn't match a Needlepoint account.",
      networkBody: "We couldn't reach account services. Your stitches are safe — try again in a moment.",
    },
    signup: {
      emailExists: "An account already uses that email. Sign in instead?",
      weakPassword: "Use at least 6 characters for your Needlepoint password.",
      handleTaken: "That handle is already stitched onto another profile. Try a variation.",
      generic: "We couldn't create the account just now. Your form is still here — try again.",
    },
    account: {
      loading: "Loading your profile…",
      loadError: {
        title: "We couldn't load your profile settings",
        body: "Try again before editing so we don't overwrite your saved details.",
        cta: "Retry",
      },
      saveError: "We couldn't save account settings. Your edits are still here — try again.",
      projectsEmpty: {
        title: "Your project journal is blank",
        body: "Start a canvas entry and it will appear here for quick access.",
        cta: "New project",
      },
    },
  },
} as const;

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message || "";
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return "";
}

function looksLikeNetwork(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("network") ||
    m.includes("fetch failed") ||
    m.includes("offline") ||
    m.includes("timeout") ||
    m.includes("econnrefused") ||
    m.includes("load failed")
  );
}

/** Map sign-in failures to craft product copy. */
export function mapAuthSignInError(error: unknown): string {
  const message = messageOf(error);
  const lower = message.toLowerCase();
  if (looksLikeNetwork(message)) return uiCopy.auth.signIn.networkBody;
  if (
    lower.includes("invalid login") ||
    lower.includes("invalid credentials") ||
    lower.includes("invalid email or password") ||
    lower.includes("email not confirmed") ||
    lower.includes("user not found") ||
    lower.includes("wrong password")
  ) {
    return uiCopy.auth.signIn.invalidBody;
  }
  if (!message || lower === "authentication failed." || lower === "authentication failed") {
    return uiCopy.auth.signIn.invalidBody;
  }
  // Prefer craft defaults over raw provider strings for auth UX.
  if (looksLikeNetwork(message)) return uiCopy.auth.signIn.networkBody;
  return uiCopy.auth.signIn.invalidBody;
}

/** Map sign-up failures to craft product copy. */
export function mapAuthSignUpError(error: unknown): string {
  const message = messageOf(error);
  const lower = message.toLowerCase();
  if (looksLikeNetwork(message)) return uiCopy.auth.signIn.networkBody;
  if (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already exists") ||
    lower.includes("email address is already") ||
    (lower.includes("email") && lower.includes("already"))
  ) {
    return uiCopy.auth.signup.emailExists;
  }
  if (lower.includes("password") && (lower.includes("weak") || lower.includes("at least") || lower.includes("6"))) {
    return uiCopy.auth.signup.weakPassword;
  }
  if (
    lower.includes("handle") ||
    lower.includes("username") ||
    lower.includes("duplicate key") ||
    lower.includes("unique constraint") ||
    lower.includes("profiles_handle")
  ) {
    return uiCopy.auth.signup.handleTaken;
  }
  return uiCopy.auth.signup.generic;
}

/**
 * Journal create/upload errors.
 * Distinguishes photo attach vs save vs auth without exposing raw stack text.
 */
export function mapJournalError(error: unknown): string {
  const message = messageOf(error);
  const lower = message.toLowerCase();
  if (
    lower.includes("sign in") ||
    lower.includes("not authenticated") ||
    lower.includes("jwt") ||
    lower.includes("auth session")
  ) {
    return uiCopy.journal.authError;
  }
  if (
    lower.includes("upload") ||
    lower.includes("storage") ||
    lower.includes("image") ||
    lower.includes("file") ||
    lower.includes("mime") ||
    lower.includes("too large") ||
    lower.includes("8mb") ||
    lower.includes("bucket")
  ) {
    return uiCopy.journal.uploadError;
  }
  return uiCopy.journal.saveError;
}

/** Progress update composer errors on project detail. */
export function mapProjectUpdateError(error: unknown): string {
  const message = messageOf(error);
  const lower = message.toLowerCase();
  if (lower.includes("only the owner")) return message;
  if (
    lower.includes("upload") ||
    lower.includes("storage") ||
    lower.includes("image") ||
    lower.includes("file") ||
    lower.includes("mime") ||
    lower.includes("bucket")
  ) {
    return uiCopy.projectDetail.updateError;
  }
  return uiCopy.projectDetail.updateError;
}

/** Project edit form errors. */
export function mapProjectEditError(error: unknown): string {
  void error;
  return uiCopy.projectDetail.editError;
}

/** Account settings save/load. */
export function mapAccountSaveError(error: unknown): string {
  void error;
  return uiCopy.auth.account.saveError;
}

export function mapAccountLoadError(error: unknown): string {
  void error;
  return uiCopy.auth.account.loadError.body;
}
