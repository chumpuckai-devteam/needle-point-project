import { createProjectOnline, fetchRecommendedProjects, dismissRecommendedProjectOnline, addProgressUpdateOnline, updateProjectOnline } from "../api/projects";
import { fetchProfiles, toggleFollowOnline } from "../api/profiles";
import { addCommentOnline, toggleProjectLikeOnline, toggleSaveOnline } from "../api/social";
import {
  addProjectToCollectionOnline,
  createCollectionOnline,
  deleteCollectionOnline,
  listCollectionsOnline,
  removeProjectFromCollectionOnline,
  renameCollectionOnline,
} from "../api/collections";
import { friendlyReportError, submitReportOnline, userIsModerator, type ReportInput } from "../api/reports";
import {
  createStitchAlongOnline,
  updateStitchAlongOnline,
  getStitchAlongOnline,
  joinStitchAlongOnline,
  leaveStitchAlongOnline,
  listPublicStitchAlongsOnline,
  submitToStitchAlongOnline,
} from "../api/stitchAlongs";
import {
  cancelMeetupOnline,
  cancelMeetupRegistrationOnline,
  confirmMeetupSeatOnline,
  createMeetupOnline,
  fetchMyMeetupRsvpsOnline,
  joinMeetupWaitlistOnline,
  listUpcomingMeetupsOnline,
  registerForMeetupOnline,
  respondMeetupStoreLinkOnline,
  type MyMeetupRsvpRow,
  type StitchingMeetupInput,
} from "../api/meetups";
import {
  createGroupDmThreadOnline,
  friendlyDmError,
  listDmMessagesOnline,
  listMyDmThreadsOnline,
  openDmWithStoreOnline,
  openDmWithUserOnline,
  sendDmMessageOnline,
  subscribeToDmEventsOnline,
  totalDmUnread,
  uploadDmAttachmentOnline,
  type DmMessage,
  type DmThread,
} from "../api/dms";
import {
  listMyNotificationsOnline,
  markAllNotificationsReadOnline,
  markNotificationReadOnline,
  type AppNotification,
} from "../api/notifications";
import { uploadProjectImage, validateImageFile } from "../api/images";
import {
  claimStoreOnline,
  createStoreProductOnline,
  deleteStoreProductOnline,
  fetchFollowedStoreIds,
  fetchStores,
  setProjectProducts,
  setProjectStores,
  toggleStoreFollowOnline,
  updateStoreProfileOnline,
  updateStoreProductOnline,
  uploadStoreProductImage,
  uploadStoreProfileImage,
  type StoreProductInput,
  type StoreProfileInput,
} from "../api/stores";
import { creators as seedCreators, initialCollections, initialProjects, initialStitchAlongs, stitchAlong as seedStitchAlong } from "../data";
import type { Collection, Creator, MediaKind, Project, StitchAlong, StitchingMeetup, Store } from "../types";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";
import { loadFromStorage, saveToStorage } from "../lib/storage";
import { initialMeetups } from "../lib/meetups";
import { mapJournalError, mapProjectUpdateError, uiCopy } from "../lib/uiCopy";
import { friendlyUserError } from "../lib/userFacingError";
import { composeStudioFeed, rankProjectsByInterest } from "../lib/interestRank";
import {
  blankDraft,
  canViewProject,
  filterPublicProjects,
  filterViewableProjects,
  shareProjectPost,
  splitList,
  unique,
} from "../appModel";
import type { DraftProject, View } from "../appModel";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DEMO_CREATOR_ID, DEMO_STORES, STORAGE_KEYS } from "./demoData";
import { pathForView } from "./navigation";
import { AppLayout } from "./AppLayout";
import { AppRoutes } from "./AppRoutes";

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isDemoMode } = useAuth();
  const [creators, setCreators] = useState<Creator[]>(seedCreators);
  // Online: never seed from demo localStorage (stale p1/p2 ids leave storeIds stuck).
  // Demo: keep LS persistence for offline review.
  const [projects, setProjects] = useState<Project[]>(() =>
    isSupabaseConfigured ? [] : loadFromStorage(STORAGE_KEYS.projects, initialProjects),
  );
  const [collections, setCollections] = useState<Collection[]>(() => loadFromStorage(STORAGE_KEYS.collections, initialCollections));
  const [stitchAlongs, setStitchAlongs] = useState<StitchAlong[]>(() =>
    loadFromStorage(STORAGE_KEYS.stitchAlongs, initialStitchAlongs),
  );
  const [meetups, setMeetups] = useState<StitchingMeetup[]>(() =>
    isSupabaseConfigured ? [] : loadFromStorage(STORAGE_KEYS.meetups, initialMeetups),
  );
  const [meetupCreateBusy, setMeetupCreateBusy] = useState(false);
  const [meetupCreateError, setMeetupCreateError] = useState("");
  const [meetupRsvpBusy, setMeetupRsvpBusy] = useState(false);
  const [dmThreads, setDmThreads] = useState<DmThread[]>([]);
  const [dmMessagesByThread, setDmMessagesByThread] = useState<Record<string, DmMessage[]>>({});
  const [dmLoading, setDmLoading] = useState(false);
  const [dmError, setDmError] = useState("");
  const [dmSendBusy, setDmSendBusy] = useState(false);
  const [dmSendError, setDmSendError] = useState("");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [followedCreators, setFollowedCreators] = useState<string[]>(() => loadFromStorage(STORAGE_KEYS.follows, ["c1"]));
  const [followedStores, setFollowedStores] = useState<string[]>(() => loadFromStorage(STORAGE_KEYS.storeFollows, ["store-local-1"]));
  const [dismissedDiscover, setDismissedDiscover] = useState<string[]>(() => loadFromStorage(STORAGE_KEYS.dismissDiscover, [] as string[]));
  const [dismissedStudio, setDismissedStudio] = useState<string[]>(() => loadFromStorage(STORAGE_KEYS.dismissStudio, [] as string[]));
  const [interestProfile, setInterestProfile] = useState(() => {
    // Demo keeps seed interests for dogfood. Online guests start unpersonalized
    // (no "Because you picked ornaments" from stale LS defaults).
    if (!isSupabaseConfigured) {
      return {
        interests: loadFromStorage(STORAGE_KEYS.interests, ["ornaments", "florals"] as string[]),
        skillLevel: loadFromStorage(STORAGE_KEYS.skill, "confident beginner"),
      };
    }
    return {
      interests: [] as string[],
      skillLevel: "confident beginner",
    };
  });
  /** False until first online boot settles — avoids empty-state flash. */
  const [remoteReady, setRemoteReady] = useState(() => !isSupabaseConfigured);
  /** Bump to re-run remote hydrate (Studio/Shops retry). */
  const [remoteBootKey, setRemoteBootKey] = useState(0);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ category: "all", difficulty: "all", stitch: "all", color: "all", status: "all" });
  const [draft, setDraft] = useState<DraftProject>(blankDraft);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [updateNote, setUpdateNote] = useState("");
  const [updateMilestone, setUpdateMilestone] = useState("");
  const [updateImageUrl, setUpdateImageUrl] = useState("");
  const [updateImageFile, setUpdateImageFile] = useState<File | null>(null);
  const [updateImagePreview, setUpdateImagePreview] = useState("");
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [remoteError, setRemoteError] = useState("");
  // Online: start empty so production never flashes demo shops before remote hydrate.
  const [stores, setStores] = useState<Store[]>(() => (isSupabaseConfigured ? [] : DEMO_STORES));
  const [claimBusy, setClaimBusy] = useState(false);
  /** Store ids with a pending claim request this session (online moderated flow). */
  const [pendingClaimStoreIds, setPendingClaimStoreIds] = useState<string[]>([]);
  const [claimNotice, setClaimNotice] = useState("");
  const [productBusy, setProductBusy] = useState(false);
  const [productError, setProductError] = useState("");
  const [salHostActionBusy, setSalHostActionBusy] = useState(false);
  const [salHostActionError, setSalHostActionError] = useState("");
  const [salCreateBusy, setSalCreateBusy] = useState(false);
  const [salCreateError, setSalCreateError] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const meCreatorId = isDemoMode ? DEMO_CREATOR_ID : user?.id ?? DEMO_CREATOR_ID;

  // Stable id fingerprints — rehydrate when remote UUIDs replace demo ids even if lengths match.
  const projectIdsKey = useMemo(() => projects.map((project) => project.id).join("|"), [projects]);
  const storeIdsKey = useMemo(() => stores.map((store) => store.id).join("|"), [stores]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    saveToStorage(STORAGE_KEYS.projects, projects);
  }, [projects]);
  useEffect(() => saveToStorage(STORAGE_KEYS.collections, collections), [collections]);
  useEffect(() => saveToStorage(STORAGE_KEYS.follows, followedCreators), [followedCreators]);
  useEffect(() => saveToStorage(STORAGE_KEYS.storeFollows, followedStores), [followedStores]);
  useEffect(() => saveToStorage(STORAGE_KEYS.stitchAlongs, stitchAlongs), [stitchAlongs]);
  useEffect(() => {
    if (isSupabaseConfigured) return;
    saveToStorage(STORAGE_KEYS.meetups, meetups);
  }, [meetups]);
  useEffect(() => saveToStorage(STORAGE_KEYS.dismissDiscover, dismissedDiscover), [dismissedDiscover]);
  useEffect(() => saveToStorage(STORAGE_KEYS.dismissStudio, dismissedStudio), [dismissedStudio]);

  // Refresh onboarding prefs when returning from /onboarding (same tab localStorage).
  // Online guests never personalize from localStorage; signed-in/demo may.
  useEffect(() => {
    if (isSupabaseConfigured && !isDemoMode && !user) {
      setInterestProfile({ interests: [], skillLevel: "confident beginner" });
      return;
    }
    if (location.pathname !== "/" && location.pathname !== "/discover") return;
    setInterestProfile({
      interests: loadFromStorage(STORAGE_KEYS.interests, isSupabaseConfigured ? ([] as string[]) : interestProfile.interests),
      skillLevel: loadFromStorage(STORAGE_KEYS.skill, interestProfile.skillLevel),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-read storage on route/auth change
  }, [location.pathname, user, isDemoMode]);

  // Load signed-in interests once auth resolves online.
  useEffect(() => {
    if (!isSupabaseConfigured || isDemoMode) return;
    if (!user) {
      setInterestProfile({ interests: [], skillLevel: "confident beginner" });
      return;
    }
    setInterestProfile({
      interests: loadFromStorage(STORAGE_KEYS.interests, [] as string[]),
      skillLevel: loadFromStorage(STORAGE_KEYS.skill, "confident beginner"),
    });
  }, [user, isDemoMode]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStores(DEMO_STORES);
      setRemoteReady(true);
      // Demo: attach Available at tags to seed projects if missing
      setProjects((current) =>
        current.map((project) => {
          if (project.storeIds?.length) return project;
          if (project.id === "p1") return { ...project, storeIds: ["store-local-1", "store-online-1"] };
          if (project.id === "p2") return { ...project, storeIds: ["store-online-1"] };
          if (project.id === "p3") return { ...project, storeIds: ["store-local-1", "store-local-2"] };
          if (project.id === "p4") return { ...project, storeIds: ["store-local-1", "store-online-1"] };
          return project;
        }),
      );
      return;
    }
    let cancelled = false;
    setRemoteReady(false);
    (async () => {
      try {
        // Soft-fail optional streams so one missing RPC/table never blanks Studio.
        const settled = await Promise.allSettled([
          fetchRecommendedProjects({ surface: "studio", currentUserId: user?.id ?? null }),
          fetchProfiles(),
          fetchStores(),
          user?.id ? fetchFollowedStoreIds(user.id) : Promise.resolve([] as string[]),
          listPublicStitchAlongsOnline(user?.id ?? null),
          listUpcomingMeetupsOnline({ limit: 50 }),
          user?.id ? fetchMyMeetupRsvpsOnline(user.id) : Promise.resolve({} as Record<string, MyMeetupRsvpRow>),
        ]);
        if (cancelled) return;

        const remoteProjects = settled[0].status === "fulfilled" ? settled[0].value : [];
        const remoteProfiles = settled[1].status === "fulfilled" ? settled[1].value : [];
        const remoteStores = settled[2].status === "fulfilled" ? settled[2].value : [];
        const remoteStoreFollows = settled[3].status === "fulfilled" ? settled[3].value : [];
        const remoteStitchAlongs = settled[4].status === "fulfilled" ? settled[4].value : [];
        const remoteMeetups = settled[5].status === "fulfilled" ? settled[5].value : [];
        const remoteMeetupRsvps = settled[6].status === "fulfilled" ? settled[6].value : {};

        const hardFailures = settled
          .map((result, index) => ({ result, index }))
          .filter(({ result, index }) => result.status === "rejected" && (index === 1 || index === 2));
        // Profiles + stores are core; if both core paths fail, surface product copy (raw stays in console).
        if (hardFailures.length >= 2 && !remoteProfiles.length && !remoteStores.length && !remoteProjects.length) {
          const reason = hardFailures[0]?.result;
          if (reason && reason.status === "rejected") {
            console.warn("[needlepoint] remote boot failed", reason.reason);
          }
          setRemoteError("studio-refresh");
          return;
        }

        if (remoteProfiles.length) setCreators(remoteProfiles);
        if (remoteStores.length) setStores(remoteStores);
        else setStores([]);
        // Remote projects carry storeIds from project_stores (fetchPublicProjects).
        // Replace empty boot state entirely — demo localStorage must not win online.
        if (remoteProjects.length) {
          setProjects(remoteProjects);
        }
        if (remoteStitchAlongs.length) {
          // Prefer full list; hydrate first detail so joins/submissions are complete when present.
          try {
            const selected = await getStitchAlongOnline(remoteStitchAlongs[0].id, user?.id ?? null);
            if (!cancelled) {
              setStitchAlongs(
                selected
                  ? [selected, ...remoteStitchAlongs.filter((event) => event.id !== selected.id)]
                  : remoteStitchAlongs,
              );
            }
          } catch {
            if (!cancelled) setStitchAlongs(remoteStitchAlongs);
          }
        }
        if (!cancelled) {
          setMeetups(
            remoteMeetups.map((meetup) => {
              const mine = remoteMeetupRsvps[meetup.id];
              return {
                ...meetup,
                myRsvp: mine?.status ?? null,
                myRegistrationConfirmedAt: mine?.confirmedAt ?? null,
                myCheckInCode: mine?.checkInCode ?? null,
                myHoldExpiresAt: mine?.holdExpiresAt ?? null,
                mySeatConfirmedAt: mine?.seatConfirmedAt ?? null,
              };
            }),
          );
        }
        if (user?.id) setFollowedStores(remoteStoreFollows);
        setRemoteError("");
      } catch (error) {
        if (!cancelled) {
          console.warn("[needlepoint] remote boot failed", error);
          setRemoteError("studio-refresh");
        }
      } finally {
        if (!cancelled) setRemoteReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, remoteBootKey]);

  // Re-hydrate project↔store links when project/store id sets change (not merely lengths).
  useEffect(() => {
    if (!isSupabaseConfigured || !projectIdsKey) return;
    let cancelled = false;
    (async () => {
      try {
        const client = requireSupabase();
        const { data, error } = await client.from("project_stores").select("project_id, store_id");
        if (error || cancelled || !data) return;
        const byProject = new Map<string, string[]>();
        for (const row of data) {
          const list = byProject.get(row.project_id) ?? [];
          list.push(row.store_id);
          byProject.set(row.project_id, list);
        }
        setProjects((current) => {
          let changed = false;
          const next = current.map((project) => {
            const fromDb = byProject.get(project.id) ?? [];
            const prev = project.storeIds ?? [];
            if (prev.length === fromDb.length) {
              const prevSet = new Set(prev);
              if (fromDb.every((id) => prevSet.has(id))) return project;
            }
            changed = true;
            return { ...project, storeIds: fromDb };
          });
          return changed ? next : current;
        });
      } catch {
        /* store tables may not exist yet during first deploy */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectIdsKey, storeIdsKey]);

  const creatorById = useCallback(
    (id: string) => creators.find((creator) => creator.id === id) ?? creators[0] ?? seedCreators[0],
    [creators],
  );
  const creatorByHandle = useCallback((handle: string) => creators.find((creator) => creator.handle === handle), [creators]);
  // Demo session is c2; online uses auth user id. Null when online guest.
  const viewerId = isDemoMode ? meCreatorId : user?.id ?? null;
  const isOwnerOf = useCallback(
    (project: Project) => (isDemoMode ? project.creatorId === meCreatorId : Boolean(user && project.creatorId === user.id)),
    [isDemoMode, meCreatorId, user],
  );
  /** Defense-in-depth: never keep another user's private project in client lists. */
  const accessibleProjects = useMemo(() => filterViewableProjects(projects, viewerId), [projects, viewerId]);
  /** Public-only surfaces: Studio feed, Discover, shop tags, stitch-along gallery. */
  const publicProjects = useMemo(() => filterPublicProjects(accessibleProjects), [accessibleProjects]);
  const projectById = (id: string) => accessibleProjects.find((project) => project.id === id);
  const stitchAlong = stitchAlongs[0] ?? seedStitchAlong;
  const savedProjects = accessibleProjects.filter((project) => project.isSaved);
  const myProjects = accessibleProjects.filter((project) => project.creatorId === meCreatorId);
  const hasInterests = interestProfile.interests.length > 0;
  /** Personalize feed ranking / match hints only for demo or signed-in users. */
  const canPersonalize = !isSupabaseConfigured || isDemoMode || Boolean(user);
  const feedInterestProfile = canPersonalize
    ? interestProfile
    : { interests: [] as string[], skillLevel: interestProfile.skillLevel };

  const categories = unique(publicProjects.map((project) => project.category));
  const stitches = unique(publicProjects.flatMap((project) => project.stitchTypes));
  const colors = unique(publicProjects.flatMap((project) => project.colors));

  // Studio: followed first, then interest-ranked recommendations (client rank for demo + dismiss layer).
  const studioFeedProjects = useMemo(() => {
    const ranked = rankProjectsByInterest(publicProjects, feedInterestProfile, {
      dismissedIds: dismissedStudio,
      followedCreatorIds: followedCreators,
      surface: "studio",
    });
    const feed = composeStudioFeed(ranked, followedCreators, dismissedStudio);
    if (canPersonalize) return feed;
    // Guests: strip interest match metadata even if server sent it.
    return feed.map((project) =>
      project.matchedInterests?.length ? { ...project, matchedInterests: undefined } : project,
    );
  }, [canPersonalize, dismissedStudio, feedInterestProfile, followedCreators, publicProjects]);

  // Discover: hard filters first, then interest order among remaining public projects.
  const filteredProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = publicProjects.filter((project) => {
      const creator = creatorById(project.creatorId);
      const haystack = [
        project.title,
        project.notes,
        project.patternSource,
        project.category,
        project.canvasType,
        creator.name,
        creator.handle,
        ...project.materials,
        ...project.stitchTypes,
        ...project.colors,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!normalized || haystack.includes(normalized)) &&
        (filters.category === "all" || project.category === filters.category) &&
        (filters.difficulty === "all" || project.difficulty === filters.difficulty) &&
        (filters.stitch === "all" || project.stitchTypes.includes(filters.stitch)) &&
        (filters.color === "all" || project.colors.includes(filters.color)) &&
        (filters.status === "all" || project.status === filters.status)
      );
    });
    const ranked = rankProjectsByInterest(filtered, feedInterestProfile, {
      dismissedIds: dismissedDiscover,
      surface: "discover",
    });
    if (canPersonalize) return ranked;
    return ranked.map((project) =>
      project.matchedInterests?.length ? { ...project, matchedInterests: undefined } : project,
    );
  }, [canPersonalize, creatorById, dismissedDiscover, feedInterestProfile, filters, publicProjects, query]);

  function setView(view: View) {
    // Guests may browse freely; posting/account-write destinations require sign-in online.
    if (
      isSupabaseConfigured &&
      !isDemoMode &&
      !user &&
      (view.name === "journal" || view.name === "onboarding")
    ) {
      setRemoteError(view.name === "journal" ? "Sign in to create a post." : "Sign in to finish onboarding.");
      navigate("/auth");
      return;
    }
    if (view.name === "profile") {
      const creator = creators.find((candidate) => candidate.id === view.id);
      navigate(`/u/${creator?.handle ?? view.id}`);
      return;
    }
    if (view.name === "stitchAlong" && view.id) {
      navigate(`/stitch-along/${view.id}`);
      return;
    }
    navigate(pathForView(view));
  }

  /** Online guests can view; interactions require a real session. Demo stays fully interactive. */
  function requireAuth(actionLabel: string): boolean {
    if (!isSupabaseConfigured || isDemoMode) return true;
    if (user) return true;
    setRemoteError(`Sign in to ${actionLabel}.`);
    navigate("/auth");
    return false;
  }

  // Deep-link /journal while signed out → auth (view still allowed on all other routes).
  useEffect(() => {
    if (!isSupabaseConfigured || isDemoMode || user) return;
    if (location.pathname === "/journal" || location.pathname.startsWith("/journal/")) {
      setRemoteError("Sign in to create a post.");
      navigate("/auth", { replace: true });
    }
  }, [isDemoMode, location.pathname, navigate, user]);

  function openDiscover(patch?: Partial<{ category: string; stitch: string; color: string; status: string; query: string }>) {
    setFilters({
      category: patch?.category ?? "all",
      difficulty: "all",
      stitch: patch?.stitch ?? "all",
      color: patch?.color ?? "all",
      status: patch?.status ?? "all",
    });
    setQuery(patch?.query ?? "");
    navigate("/discover");
  }

  function toggleLike(id: string) {
    if (!requireAuth("like posts")) return;
    const project = projects.find((item) => item.id === id);
    setProjects((current) =>
      current.map((item) =>
        item.id === id ? { ...item, isLiked: !item.isLiked, likes: item.likes + (item.isLiked ? -1 : 1) } : item,
      ),
    );
    if (isSupabaseConfigured && user && project) {
      void toggleProjectLikeOnline(id, user.id, project.isLiked).catch((error) => {
        setRemoteError(friendlyUserError(error, "Like failed"));
      });
    }
  }

  function toggleSave(id: string) {
    if (!requireAuth("save posts")) return;
    const project = projects.find((item) => item.id === id);
    setProjects((current) => current.map((item) => (item.id === id ? { ...item, isSaved: !item.isSaved } : item)));
    setCollections((current) => {
      const defaultId = current.find((c) => c.isDefault)?.id ?? "col1";
      return current.map((collection) =>
        collection.id === defaultId
          ? {
              ...collection,
              projectIds: collection.projectIds.includes(id)
                ? collection.projectIds.filter((projectId) => projectId !== id)
                : [...collection.projectIds, id],
            }
          : collection,
      );
    });
    if (isSupabaseConfigured && user && project) {
      void toggleSaveOnline(user.id, id, project.isSaved).catch((error) => {
        setRemoteError(friendlyUserError(error, "Save failed"));
      });
    }
  }

  async function createCollection(input: { name: string; description: string }) {
    if (!requireAuth("create boards")) throw new Error("Sign in to create boards.");
    const name = input.name.trim();
    if (!name) throw new Error("Board name is required.");
    if (isSupabaseConfigured && user && !isDemoMode) {
      const created = await createCollectionOnline(input);
      setCollections((current) => [...current, created]);
      return;
    }
    const id = `col-${Date.now()}`;
    setCollections((current) => [
      ...current,
      { id, name, description: input.description.trim(), projectIds: [], isDefault: false },
    ]);
  }

  async function renameCollection(id: string, input: { name: string; description: string }) {
    if (!requireAuth("edit boards")) throw new Error("Sign in to edit boards.");
    const name = input.name.trim();
    if (!name) throw new Error("Board name is required.");
    if (isSupabaseConfigured && user && !isDemoMode) {
      const updated = await renameCollectionOnline(id, input);
      setCollections((current) => current.map((c) => (c.id === id ? updated : c)));
      return;
    }
    setCollections((current) =>
      current.map((c) => (c.id === id ? { ...c, name, description: input.description.trim() } : c)),
    );
  }

  async function deleteCollection(id: string) {
    if (!requireAuth("delete boards")) throw new Error("Sign in to delete boards.");
    const target = collections.find((c) => c.id === id);
    if (!target) return;
    if (target.isDefault || target.id === "col1") throw new Error("Default Saved board cannot be deleted.");
    if (isSupabaseConfigured && user && !isDemoMode) {
      await deleteCollectionOnline({ id: target.id, isDefault: Boolean(target.isDefault) });
    }
    setCollections((current) => current.filter((c) => c.id !== id));
  }

  /** Add/remove a project on a named board; bookmark state follows “any board”. */
  async function setProjectInCollection(collectionId: string, projectId: string, shouldContain: boolean) {
    if (!requireAuth("save posts")) throw new Error("Sign in to save posts.");
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    setCollections((current) =>
      current.map((collection) => {
        if (collection.id !== collectionId) return collection;
        const has = collection.projectIds.includes(projectId);
        if (shouldContain && !has) return { ...collection, projectIds: [...collection.projectIds, projectId] };
        if (!shouldContain && has) {
          return { ...collection, projectIds: collection.projectIds.filter((id) => id !== projectId) };
        }
        return collection;
      }),
    );

    // isSaved = present on any board after local update
    setProjects((current) =>
      current.map((item) => {
        if (item.id !== projectId) return item;
        // compute from next collections snapshot via functional update already applied — use collections state may lag;
        // approximate: if adding, saved true; if removing, check other boards
        if (shouldContain) return { ...item, isSaved: true };
        const stillOnOther = collections.some(
          (c) => c.id !== collectionId && c.projectIds.includes(projectId),
        );
        return { ...item, isSaved: stillOnOther };
      }),
    );

    if (isSupabaseConfigured && user && !isDemoMode) {
      try {
        if (shouldContain) await addProjectToCollectionOnline(collectionId, projectId);
        else await removeProjectFromCollectionOnline(collectionId, projectId);
      } catch (error) {
        setRemoteError(friendlyUserError(error, "Could not update board"));
        setRemoteBootKey((k) => k + 1);
      }
    }
  }

  async function submitReport(input: ReportInput) {
    if (!requireAuth("report content")) throw new Error("Sign in to submit a report.");
    if (isDemoMode || !isSupabaseConfigured) {
      // Demo queue: acknowledge without remote write.
      return;
    }
    try {
      await submitReportOnline(input);
    } catch (error) {
      throw new Error(friendlyReportError(error, "Could not submit report"));
    }
  }

  // Soft-load online multi-boards when signed in (best effort).
  useEffect(() => {
    if (!isSupabaseConfigured || !user || isDemoMode) return;
    let cancelled = false;
    void listCollectionsOnline(user.id)
      .then((rows) => {
        if (!cancelled && rows.length) setCollections(rows);
      })
      .catch(() => {
        /* keep local/demo boards */
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, isDemoMode]);

  function toggleFollow(id: string) {
    if (!requireAuth("follow people")) return;
    const currently = followedCreators.includes(id);
    setFollowedCreators((current) => (currently ? current.filter((creatorId) => creatorId !== id) : [...current, id]));
    if (isSupabaseConfigured && user) {
      void toggleFollowOnline(user.id, id, currently).catch((error) => {
        setRemoteError(friendlyUserError(error, "Follow failed"));
      });
    }
  }

  function toggleStoreFollow(storeId: string) {
    // Online guests must sign in. Demo/offline toggles local state → localStorage storeFollows.
    if (!requireAuth("follow stores")) return;
    const currently = followedStores.includes(storeId);
    // Optimistic + idempotent; useEffect persists followedStores to STORAGE_KEYS.storeFollows.
    setFollowedStores((current) =>
      currently ? current.filter((id) => id !== storeId) : current.includes(storeId) ? current : [...current, storeId],
    );
    setStores((current) =>
      current.map((store) =>
        store.id === storeId
          ? {
              ...store,
              followerCount: Math.max(0, (store.followerCount ?? 0) + (currently ? -1 : 1)),
            }
          : store,
      ),
    );
    // Online only — never required for demo/offline path.
    if (isSupabaseConfigured && user) {
      void toggleStoreFollowOnline(user.id, storeId, currently).catch((error) => {
        setRemoteError(friendlyUserError(error, "Store follow failed"));
        // Roll back local toggle if remote fails.
        setFollowedStores((current) => {
          const isFollowing = current.includes(storeId);
          if (currently && !isFollowing) return [...current, storeId];
          if (!currently && isFollowing) return current.filter((id) => id !== storeId);
          return current;
        });
        setStores((current) =>
          current.map((store) =>
            store.id === storeId
              ? {
                  ...store,
                  followerCount: Math.max(0, (store.followerCount ?? 0) + (currently ? 1 : -1)),
                }
              : store,
          ),
        );
      });
    }
  }

  async function claimStore(storeId: string) {
    if (!requireAuth("claim a shop")) return;
    setClaimBusy(true);
    setRemoteError("");
    setClaimNotice("");
    try {
      // Demo: instant ownership so owner manage UI is dogfoodable offline.
      if (isDemoMode || !isSupabaseConfigured) {
        const ownerId = meCreatorId;
        setStores((current) => current.map((store) => (store.id === storeId ? { ...store, ownerUserId: ownerId } : store)));
        setClaimNotice("You're now the owner of this shop (demo).");
        return;
      }
      // Online: moderated request — does NOT assign ownership until approve/establish.
      if (user) {
        await claimStoreOnline(storeId, user.id);
        setPendingClaimStoreIds((current) => (current.includes(storeId) ? current : [...current, storeId]));
        setClaimNotice("Claim request submitted. Ownership is assigned after review.");
      }
    } catch (error) {
      console.warn("[needlepoint] shop claim failed", error);
      setRemoteError(uiCopy.shopDetail.claimError);
    } finally {
      setClaimBusy(false);
    }
  }

  async function createStoreProduct(storeId: string, input: StoreProductInput, imageFile?: File | null) {
    if (!requireAuth("manage shop products")) return;
    setProductBusy(true);
    setProductError("");
    try {
      if (imageFile) {
        const invalid = validateImageFile(imageFile);
        if (invalid) throw new Error(invalid);
      }

      // Create row first so Storage RLS path storeId/productId/* can authorize upload.
      const baseImage = input.image?.trim() || "";
      let created = await createStoreProductOnline(storeId, { ...input, image: baseImage });

      let image = created.image || baseImage;
      if (imageFile) {
        if (isSupabaseConfigured && user) {
          image = await uploadStoreProductImage(storeId, created.id, imageFile);
          created = await updateStoreProductOnline(created.id, { ...input, image });
        } else {
          // Demo/offline: local blob is fine for dogfood.
          image = URL.createObjectURL(imageFile);
        }
      }

      const product = {
        ...created,
        storeId,
        image: image || created.image || "/assets/needlepoint-hero.png",
      };
      setStores((current) =>
        current.map((store) => (store.id === storeId ? { ...store, products: [...store.products, product] } : store)),
      );
    } catch (error) {
      console.warn("[needlepoint] product create failed", error);
      setProductError(uiCopy.shopDetail.productSaveError);
      throw error;
    } finally {
      setProductBusy(false);
    }
  }

  async function updateStoreProduct(storeId: string, productId: string, input: StoreProductInput, imageFile?: File | null) {
    if (!requireAuth("manage shop products")) return;
    setProductBusy(true);
    setProductError("");
    try {
      let image = input.image?.trim() || "";
      if (imageFile) {
        const invalid = validateImageFile(imageFile);
        if (invalid) throw new Error(invalid);
        if (isSupabaseConfigured && user) {
          image = await uploadStoreProductImage(storeId, productId, imageFile);
        } else {
          image = URL.createObjectURL(imageFile);
        }
      }
      const payload: StoreProductInput = { ...input, image };
      const updated = await updateStoreProductOnline(productId, payload);
      setStores((current) =>
        current.map((store) =>
          store.id === storeId
            ? {
                ...store,
                products: store.products.map((product) =>
                  product.id === productId
                    ? {
                        ...product,
                        name: updated.name || input.name.trim(),
                        description: updated.description ?? input.description?.trim() ?? "",
                        image: updated.image || image || product.image || "/assets/needlepoint-hero.png",
                        priceLabel: updated.priceLabel ?? input.priceLabel?.trim() ?? "",
                        externalUrl: updated.externalUrl ?? input.externalUrl?.trim() ?? "",
                        category: updated.category || input.category?.trim() || "canvas",
                      }
                    : product,
                ),
              }
            : store,
        ),
      );
    } catch (error) {
      console.warn("[needlepoint] product update failed", error);
      setProductError(uiCopy.shopDetail.productSaveError);
      throw error;
    } finally {
      setProductBusy(false);
    }
  }

  async function deleteStoreProduct(storeId: string, productId: string) {
    if (!requireAuth("manage shop products")) return;
    setProductBusy(true);
    setProductError("");
    try {
      await deleteStoreProductOnline(productId);
      setStores((current) =>
        current.map((store) =>
          store.id === storeId ? { ...store, products: store.products.filter((product) => product.id !== productId) } : store,
        ),
      );
    } catch (error) {
      console.warn("[needlepoint] product delete failed", error);
      setProductError(uiCopy.shopDetail.productDeleteError);
    } finally {
      setProductBusy(false);
    }
  }


  async function updateStoreProfile(
    storeId: string,
    input: StoreProfileInput,
    files?: { avatarFile?: File | null; coverFile?: File | null },
  ) {
    if (isSupabaseConfigured && !user) {
      setProfileError("Sign in as the shop owner to edit this profile.");
      setView({ name: "auth" });
      throw new Error("Sign in required");
    }
    setProfileBusy(true);
    setProfileError("");
    setProfileSuccess("");
    try {
      let avatar = input.avatar?.trim() || "";
      let coverImage = input.coverImage?.trim() || "";

      if (files?.avatarFile) {
        avatar = await uploadStoreProfileImage(storeId, "avatar", files.avatarFile);
      }
      if (files?.coverFile) {
        coverImage = await uploadStoreProfileImage(storeId, "cover", files.coverFile);
      }

      const payload: StoreProfileInput = {
        ...input,
        avatar,
        coverImage,
      };

      const updated = await updateStoreProfileOnline(storeId, payload);
      setStores((current) =>
        current.map((store) =>
          store.id === storeId
            ? {
                ...store,
                name: updated.name || payload.name.trim(),
                description: updated.description ?? payload.description?.trim() ?? "",
                websiteUrl: updated.websiteUrl ?? payload.websiteUrl?.trim() ?? "",
                location: updated.location || payload.location?.trim() || store.location,
                city: updated.city || payload.city?.trim() || store.city,
                avatar: updated.avatar || avatar || store.avatar,
                coverImage: updated.coverImage || coverImage || store.coverImage,
                specialties: updated.specialties?.length ? updated.specialties : payload.specialties ?? store.specialties,
              }
            : store,
        ),
      );
      setProfileSuccess("Shop profile saved.");
    } catch (error) {
      console.warn("[needlepoint] shop profile save failed", error);
      setProfileError(uiCopy.shopDetail.profileSaveError);
      throw error;
    } finally {
      setProfileBusy(false);
    }
  }

  function shareProject(id: string) {
    const project = accessibleProjects.find((item) => item.id === id);
    if (!project || !canViewProject(project, viewerId)) return;
    const creator = creatorById(project.creatorId);
    void shareProjectPost(project, creator.handle).then((result) => {
      if (result.method === "private-clipboard") {
        setRemoteError("Private link copied — only you can open it. Switch visibility to Public to share with others.");
      } else if (result.method === "private-blocked") {
        setRemoteError(
          result.url
            ? `This project is private. Only you can open it: ${result.url}`
            : "This project is private. Only you can open it — set visibility to Public to share.",
        );
      } else if (result.method === "clipboard") {
        setRemoteError("Public post link copied to clipboard.");
      } else if (result.method === "failed") {
        setRemoteError(result.url ? `Share this public post: ${result.url}` : "Could not share this post.");
      } else if (result.method === "native" && result.ok) {
        setRemoteError("");
      }
    });
  }

  function clearDraftImage() {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setPendingImageFile(null);
    setImagePreview("");
    setUploadError("");
    setDraft((current) => ({ ...current, image: "" }));
  }

  function pickDraftImage(file: File | null) {
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      console.error("draft image validation failed", invalid);
      setUploadError(uiCopy.journal.uploadError);
      return;
    }
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setPendingImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploadError("");
    // Prefer uploaded file over a previous pasted URL until save
    setDraft((current) => ({ ...current, image: "" }));
  }

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requireAuth("create a post")) return;
    if (!draft.title.trim() || uploadBusy) return;

    setUploadBusy(true);
    setUploadError("");
    try {
      let image = draft.image.trim();
      if (pendingImageFile) {
        if (!user && isSupabaseConfigured) {
          throw new Error("Sign in to upload photos.");
        }
        image = await uploadProjectImage(user?.id || "demo-user", pendingImageFile);
      }

      const progress = draft.status === "finished" ? 100 : draft.status === "planned" ? 5 : 20;
      const materials = splitList(draft.materials);
      const stitchTypes = splitList(draft.stitchTypes);
      const colors = splitList(draft.colors);
      const notes = draft.notes.trim();
      const videoUrl = draft.videoUrl.trim();
      const mediaKind: MediaKind = videoUrl ? "video" : image ? "image" : "text";
      const payload = {
        title: draft.title.trim(),
        notes,
        image,
        status: draft.status,
        difficulty: draft.difficulty,
        category: draft.category.trim() || "journal",
        canvasType: draft.canvasType.trim() || "18 mesh canvas",
        materials,
        stitchTypes,
        colors,
        patternSource: draft.patternSource.trim() || "Personal stash",
        patternUrl: draft.patternUrl.trim() || "https://example.com/new-project",
        visibility: draft.visibility,
        progress,
      };

      let project: Project;
      if (isSupabaseConfigured && user) {
        project = await createProjectOnline({ userId: user.id, ...payload });
        project = { ...project, videoUrl, mediaKind };
        if (draft.storeIds.length) {
          await setProjectStores(project.id, draft.storeIds);
          project = { ...project, storeIds: draft.storeIds };
        }
        if (draft.productIds.length) {
          await setProjectProducts(project.id, draft.productIds);
          project = { ...project, productIds: draft.productIds };
        }
      } else {
        project = {
          id: `p${Date.now()}`,
          creatorId: meCreatorId,
          isLiked: false,
          isSaved: false,
          likes: 0,
          storeIds: draft.storeIds,
          productIds: draft.productIds,
          videoUrl,
          mediaKind,
          updates: [
            {
              id: `u${Date.now()}`,
              date: "Today",
              milestone: "Project started",
              note: payload.notes,
              image,
              likes: 0,
              comments: [],
            },
          ],
          ...payload,
        };
      }

      setProjects((current) => [project, ...current]);
      if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
      setPendingImageFile(null);
      setImagePreview("");
      setDraft(blankDraft);
      setView({ name: "project", id: project.id });
      setRemoteError("");
    } catch (error) {
      console.error("submitProject failed", error);
      const message = mapJournalError(error);
      setUploadError(message);
      setRemoteError(message);
    } finally {
      setUploadBusy(false);
    }
  }

  function clearUpdateImage() {
    if (updateImagePreview.startsWith("blob:")) URL.revokeObjectURL(updateImagePreview);
    setUpdateImageFile(null);
    setUpdateImagePreview("");
    setUpdateImageUrl("");
    setUpdateError("");
  }

  function pickUpdateImage(file: File | null) {
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      console.error("update image validation failed", invalid);
      setUpdateError(uiCopy.projectDetail.updateError);
      return;
    }
    if (updateImagePreview.startsWith("blob:")) URL.revokeObjectURL(updateImagePreview);
    setUpdateImageFile(file);
    setUpdateImagePreview(URL.createObjectURL(file));
    setUpdateImageUrl("");
    setUpdateError("");
  }

  async function saveProjectEdits(projectId: string, draft: DraftProject & { progress: number }, imageFile?: File | null) {
    if (!requireAuth("edit projects")) return;
    const project = projects.find((item) => item.id === projectId);
    if (!project) throw new Error("Project not found");
    if (isSupabaseConfigured && user && project.creatorId !== user.id) {
      throw new Error("Only the owner can edit this project.");
    }

    let image = draft.image.trim() || project.image;
    if (imageFile) {
      if (!user && isSupabaseConfigured) throw new Error("Sign in to upload photos.");
      image = await uploadProjectImage(user?.id || meCreatorId, imageFile);
    }

    const materials = splitList(draft.materials);
    const stitchTypes = splitList(draft.stitchTypes);
    const colors = splitList(draft.colors);
    const progress = Math.max(0, Math.min(100, Number(draft.progress) || 0));
    const status: Project["status"] = progress >= 100 ? "finished" : draft.status;
    const videoUrl = draft.videoUrl.trim();
    const mediaKind: MediaKind = videoUrl ? "video" : image ? "image" : "text";

    if (isSupabaseConfigured && user) {
      await updateProjectOnline(projectId, {
        title: draft.title.trim(),
        notes: draft.notes.trim(),
        image,
        status,
        difficulty: draft.difficulty,
        category: draft.category.trim() || project.category,
        canvasType: draft.canvasType.trim() || project.canvasType,
        materials,
        stitchTypes,
        colors,
        patternSource: draft.patternSource.trim() || project.patternSource,
        patternUrl: draft.patternUrl.trim() || project.patternUrl,
        visibility: draft.visibility,
        progress,
      });
    }

    setProjects((current) =>
      current.map((item) =>
        item.id === projectId
          ? {
              ...item,
              title: draft.title.trim(),
              notes: draft.notes.trim(),
              image,
              videoUrl,
              mediaKind,
              status,
              difficulty: draft.difficulty,
              category: draft.category.trim() || item.category,
              canvasType: draft.canvasType.trim() || item.canvasType,
              materials,
              stitchTypes,
              colors,
              patternSource: draft.patternSource.trim() || item.patternSource,
              patternUrl: draft.patternUrl.trim() || item.patternUrl,
              visibility: draft.visibility,
              progress,
              storeIds: draft.storeIds ?? [],
              productIds: draft.productIds ?? [],
            }
          : item,
      ),
    );

    if (isSupabaseConfigured && user) {
      await setProjectStores(projectId, draft.storeIds ?? []);
      await setProjectProducts(projectId, draft.productIds ?? []);
    }
    setRemoteError("");
  }

  async function addProgressUpdate(projectId: string) {
    if (!requireAuth("post progress updates")) return;
    if (updateBusy) return;
    const note = updateNote.trim();
    const milestone = updateMilestone.trim() || "Progress logged";
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    if (!note && !updateImageFile && !updateImageUrl.trim()) return;
    if (isSupabaseConfigured && user && project.creatorId !== user.id) {
      setUpdateError("Only the owner can post progress updates.");
      return;
    }

    setUpdateBusy(true);
    setUpdateError("");
    try {
      let image = updateImageUrl.trim() || project.image;
      if (updateImageFile) {
        if (!user && isSupabaseConfigured) throw new Error("Sign in to upload photos.");
        image = await uploadProjectImage(user?.id || meCreatorId, updateImageFile);
      }

      const nextProgress = Math.min(100, project.progress + 12);
      const nextStatus: Project["status"] = nextProgress >= 100 ? "finished" : project.status === "planned" ? "in progress" : project.status;
      let updateId = `u${Date.now()}`;

      if (isSupabaseConfigured && user) {
        const remote = await addProgressUpdateOnline(projectId, user.id, note || milestone, image, {
          milestone,
          progress: nextProgress,
        });
        updateId = remote.id;
      }

      setProjects((current) =>
        current.map((item) =>
          item.id === projectId
            ? {
                ...item,
                progress: nextProgress,
                status: nextStatus,
                updates: [
                  {
                    id: updateId,
                    date: "Today",
                    milestone,
                    note: note || milestone,
                    image,
                    likes: 0,
                    comments: [],
                  },
                  ...item.updates,
                ],
              }
            : item,
        ),
      );

      setUpdateNote("");
      setUpdateMilestone("");
      clearUpdateImage();
      setRemoteError("");
    } catch (error) {
      console.error("addProgressUpdate failed", error);
      const message = mapProjectUpdateError(error);
      setUpdateError(message);
      setRemoteError(message);
    } finally {
      setUpdateBusy(false);
    }
  }

  function addComment(projectId: string) {
    if (!requireAuth("comment on posts")) return;
    if (!commentText.trim()) return;
    const body = commentText.trim();
    const author = user?.name || "You";
    const project = projects.find((item) => item.id === projectId);
    const latestUpdateId = project?.updates[0]?.id;
    setProjects((current) =>
      current.map((item) =>
        item.id === projectId
          ? {
              ...item,
              updates: item.updates.map((update, index) =>
                index === 0
                  ? {
                      ...update,
                      comments: [...update.comments, { id: `cm${Date.now()}`, author, body }],
                    }
                  : update,
              ),
            }
          : item,
      ),
    );
    setCommentText("");
    if (isSupabaseConfigured && user && latestUpdateId && !latestUpdateId.startsWith("u") && !latestUpdateId.startsWith("local-")) {
      void addCommentOnline(latestUpdateId, user.id, body).catch((error) => {
        setRemoteError(friendlyUserError(error, "Comment failed"));
      });
    }
  }

  function joinStitchAlong(stitchAlongId = stitchAlong.id) {
    if (!requireAuth("join stitch-alongs")) return;
    setStitchAlongs((currentList) => {
      const current = currentList.find((event) => event.id === stitchAlongId) ?? currentList[0] ?? seedStitchAlong;
      const wasJoined = current.joined;
      const updated = {
        ...current,
        joined: !wasJoined,
        participantCount: Math.max(0, (current.participantCount ?? current.participantProjectIds.length) + (wasJoined ? -1 : 1)),
      };
      return currentList.length ? currentList.map((event) => (event.id === current.id ? updated : event)) : [updated];
    });
    const current = stitchAlongs.find((event) => event.id === stitchAlongId) ?? stitchAlong;
    if (isSupabaseConfigured && user) {
      void (current.joined ? leaveStitchAlongOnline(current.id, user.id) : joinStitchAlongOnline(current.id, user.id)).catch((error) => {
        setRemoteError(friendlyUserError(error, "Stitch-along join failed"));
      });
    }
  }

  function submitToStitchAlong(projectId: string, stitchAlongId = stitchAlong.id) {
    if (!requireAuth("submit to a stitch-along")) return;
    const project = accessibleProjects.find((item) => item.id === projectId);
    if (!project || project.visibility !== "public") {
      setRemoteError("Only public projects can join a stitch-along gallery. Switch visibility to Public first.");
      return;
    }
    const current = stitchAlongs.find((event) => event.id === stitchAlongId) ?? stitchAlong;
    if (current.status === "ended" || (current.endDate && new Date(`${current.endDate}T23:59:59`).getTime() < Date.now())) {
      setRemoteError("This stitch-along has ended — submissions are closed.");
      return;
    }
    setStitchAlongs((currentList) => {
      const event = currentList.find((item) => item.id === stitchAlongId) ?? currentList[0] ?? seedStitchAlong;
      const updated = event.participantProjectIds.includes(projectId)
        ? event
        : {
            ...event,
            participantProjectIds: [projectId, ...event.participantProjectIds],
            joined: true,
            participantCount: (event.participantCount ?? event.participantProjectIds.length) + (event.joined ? 0 : 1),
          };
      return currentList.length ? currentList.map((item) => (item.id === event.id ? updated : item)) : [updated];
    });
    if (isSupabaseConfigured && user) {
      void submitToStitchAlongOnline(current.id, projectId, user.id).catch((error) => {
        setRemoteError(friendlyUserError(error, "Stitch-along submission failed"));
      });
    }
  }

  
  async function endStitchAlong(stitchAlongId: string) {
    if (!requireAuth("end a stitch-along")) return;
    const event = stitchAlongs.find((item) => item.id === stitchAlongId);
    if (!event) return;
    if (user && event.hostId !== user.id && event.hostId !== meCreatorId) {
      setSalHostActionError("Only the host can end this stitch-along.");
      return;
    }
    setSalHostActionError("");
    setSalHostActionBusy(true);
    try {
      if (isSupabaseConfigured && user) {
        const updated = await updateStitchAlongOnline(stitchAlongId, user.id, { status: "ended" });
        setStitchAlongs((current) => current.map((item) => (item.id === stitchAlongId ? updated : item)));
      } else {
        setStitchAlongs((current) =>
          current.map((item) => (item.id === stitchAlongId ? { ...item, status: "ended" as const } : item)),
        );
      }
    } catch (error) {
      setSalHostActionError(friendlyUserError(error, "Could not end stitch-along"));
    } finally {
      setSalHostActionBusy(false);
    }
  }

  async function createStitchAlong(input: {
    title: string;
    description: string;
    theme: string;
    rules: string[];
    startDate: string;
    endDate: string;
    coverImageUrl: string;
  }) {
    if (!requireAuth("host a stitch-along")) return;
    setSalCreateError("");
    const local: StitchAlong = {
      id: `sa-local-${Date.now()}`,
      title: input.title.trim(),
      hostId: meCreatorId,
      dates: [input.startDate, input.endDate].filter(Boolean).join(" - ") || "Dates TBA",
      startDate: input.startDate,
      endDate: input.endDate,
      theme: input.theme.trim(),
      description: input.description.trim(),
      rules: input.rules,
      participantProjectIds: [],
      joined: true,
      isPublic: true,
      coverImageUrl: input.coverImageUrl.trim(),
      status: "active",
      participantCount: 1,
    };
    if (!local.title) {
      setSalCreateError("Title is required.");
      return;
    }
    if (isSupabaseConfigured && user) {
      setSalCreateBusy(true);
      try {
        const created = await createStitchAlongOnline(user.id, {
          title: local.title,
          description: local.description,
          theme: local.theme,
          rules: local.rules,
          startDate: local.startDate || undefined,
          endDate: local.endDate || undefined,
          coverImageUrl: local.coverImageUrl || undefined,
          status: "active",
          isPublic: true,
        });
        setStitchAlongs((current) => [created, ...current.filter((event) => event.id !== created.id)]);
        navigate(`/stitch-along/${created.id}`);
      } catch (error) {
        setSalCreateError(friendlyUserError(error, "Could not create stitch-along"));
      } finally {
        setSalCreateBusy(false);
      }
      return;
    }
    setStitchAlongs((current) => [local, ...current]);
    navigate(`/stitch-along/${local.id}`);
  }

  async function createMeetup(input: StitchingMeetupInput) {
    if (!requireAuth("host a stitching meetup")) return;
    setMeetupCreateError("");
    const topics = (input.topics ?? []).map((t) => t.trim()).filter(Boolean);
    const ownedId = stores.find((store) => store.ownerUserId === meCreatorId)?.id ?? null;
    const hostStoreId = input.hostStoreId ?? null;
    let storeLinkStatus: StitchingMeetup["storeLinkStatus"] = "none";
    let requestStoreVenue = Boolean(input.requestStoreVenue);

    if (hostStoreId) {
      if (ownedId && hostStoreId === ownedId) {
        storeLinkStatus = "approved";
        requestStoreVenue = false;
      } else if (requestStoreVenue) {
        storeLinkStatus = "pending";
      } else {
        setMeetupCreateError(
          "You can only link a shop you own. Request venue approval from the shop, or leave the shop unlinked.",
        );
        return;
      }
    }

    const local: StitchingMeetup = {
      id: `meetup-local-${Date.now()}`,
      hostId: meCreatorId,
      hostStoreId: storeLinkStatus === "none" ? null : hostStoreId,
      storeLinkStatus,
      title: (input.title ?? "").trim(),
      description: (input.description ?? "").trim(),
      coverImageUrl: input.coverImageUrl?.trim() || undefined,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      timezone: input.timezone || "America/Los_Angeles",
      locationType: input.locationType ?? "in_person",
      venueName: (input.venueName ?? "").trim(),
      address: (input.address ?? "").trim(),
      city: (input.city ?? "").trim(),
      region: (input.region ?? "").trim().toUpperCase(),
      postalCode: (input.postalCode ?? "").trim(),
      country: (input.country ?? "US").trim() || "US",
      capacity: input.capacity ?? null,
      rsvpMode: "registration",
      topics,
      skillLevel: (input.skillLevel ?? "").trim(),
      visibility: input.visibility ?? "public",
      status: input.status ?? "scheduled",
      registeredCount: 0,
      goingCount: 0,
      interestedCount: 0,
      waitlistCount: 0,
      spotsLeft: input.capacity ?? null,
      myRsvp: null,
    };
    if (!local.title) {
      setMeetupCreateError("Title is required.");
      return;
    }
    if (!local.startsAt) {
      setMeetupCreateError("Start time is required.");
      return;
    }
    if (isSupabaseConfigured && user) {
      setMeetupCreateBusy(true);
      try {
        const created = await createMeetupOnline(user.id, {
          ...input,
          hostStoreId,
          requestStoreVenue,
          rsvpMode: "registration",
        });
        setMeetups((current) => [created, ...current.filter((m) => m.id !== created.id)]);
        navigate(`/meetups/${created.id}`);
      } catch (error) {
        setMeetupCreateError(friendlyUserError(error, "Could not create meetup"));
      } finally {
        setMeetupCreateBusy(false);
      }
      return;
    }
    setMeetups((current) => [local, ...current]);
    navigate(`/meetups/${local.id}`);
  }

  async function respondMeetupStoreLink(meetupId: string, approve: boolean) {
    if (!requireAuth("manage shop venue requests")) return;
    try {
      if (isSupabaseConfigured && user && !isDemoMode) {
        const updated = await respondMeetupStoreLinkOnline(meetupId, approve);
        setMeetups((list) => list.map((m) => (m.id === meetupId ? { ...m, ...updated } : m)));
        return;
      }
      setMeetups((list) =>
        list.map((m) => {
          if (m.id !== meetupId) return m;
          if (approve) return { ...m, storeLinkStatus: "approved" as const };
          return { ...m, storeLinkStatus: "rejected" as const, hostStoreId: null };
        }),
      );
    } catch (error) {
      setRemoteError(friendlyUserError(error, "Could not update venue request"));
    }
  }

  const refreshDmThreads = useCallback(async () => {
    if (!isSupabaseConfigured || !user || isDemoMode) return;
    setDmLoading(true);
    setDmError("");
    try {
      const rows = await listMyDmThreadsOnline();
      setDmThreads(rows);
    } catch (error) {
      setDmError(friendlyUserError(error, "Could not load messages"));
    } finally {
      setDmLoading(false);
    }
  }, [user, isDemoMode]);

  useEffect(() => {
    void refreshDmThreads();
  }, [refreshDmThreads, remoteBootKey]);

  const refreshNotifications = useCallback(async () => {
    if (!isSupabaseConfigured || !user || isDemoMode) {
      setNotifications([]);
      return;
    }
    try {
      const rows = await listMyNotificationsOnline(40);
      setNotifications(rows);
    } catch {
      /* non-blocking */
    }
  }, [user, isDemoMode]);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications, remoteBootKey]);

  // Light poll for waitlist promotions while signed in
  useEffect(() => {
    if (!isSupabaseConfigured || !user || isDemoMode) return;
    const id = window.setInterval(() => void refreshNotifications(), 45_000);
    return () => window.clearInterval(id);
  }, [user, isDemoMode, refreshNotifications]);

  async function openNotification(item: AppNotification) {
    try {
      if (isSupabaseConfigured && user && !isDemoMode && !item.readAt) {
        await markNotificationReadOnline(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n)),
        );
      }
    } catch {
      /* still navigate */
    }
    const href = item.href?.trim();
    if (href?.startsWith("/")) {
      navigate(href);
    } else if (item.meetupId) {
      navigate(`/meetups/${item.meetupId}`);
    }
  }

  async function dismissAllNotifications() {
    try {
      if (isSupabaseConfigured && user && !isDemoMode) {
        await markAllNotificationsReadOnline();
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    } catch (error) {
      setRemoteError(friendlyUserError(error, "Could not mark notifications read"));
    }
  }

  const refreshDmThread = useCallback(
    (threadId: string) => {
      if (!threadId) return;
      if (!isSupabaseConfigured || !user || isDemoMode) {
        return;
      }
      void listDmMessagesOnline(threadId)
        .then((messages) => {
          setDmMessagesByThread((prev) => ({ ...prev, [threadId]: messages }));
          // list_dm_messages marks read server-side
          setDmThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t)));
        })
        .catch((error) => {
          setDmError(friendlyDmError(error, "Could not load conversation"));
        });
    },
    [user, isDemoMode],
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !user || isDemoMode) return;
    const channel = subscribeToDmEventsOnline((event) => {
      void refreshDmThreads();
      if (event.threadId && location.pathname === `/messages/${event.threadId}`) {
        refreshDmThread(event.threadId);
      }
    });
    return () => {
      if (channel) {
        void requireSupabase().removeChannel(channel);
      }
    };
  }, [user?.id, isDemoMode, location.pathname, refreshDmThreads, refreshDmThread]);

  // Light poll while signed-in on Messages routes as a fallback if realtime is delayed
  useEffect(() => {
    if (!isSupabaseConfigured || !user || isDemoMode) return;
    if (!location.pathname.startsWith("/messages")) return;
    const tick = () => {
      void refreshDmThreads();
      const match = location.pathname.match(/^\/messages\/([^/]+)/);
      if (match?.[1]) refreshDmThread(match[1]);
    };
    const id = window.setInterval(tick, 8000);
    return () => window.clearInterval(id);
  }, [user, isDemoMode, location.pathname, refreshDmThreads, refreshDmThread]);

  async function messageUser(otherUserId: string) {
    if (!requireAuth("send a message")) return;
    try {
      if (isSupabaseConfigured && user && !isDemoMode) {
        const thread = await openDmWithUserOnline(otherUserId);
        setDmThreads((prev) => [thread, ...prev.filter((t) => t.id !== thread.id)]);
        navigate(`/messages/${thread.id}`);
        await refreshDmThreads();
        return;
      }
      const id = `dm-demo-${[viewerId, otherUserId].sort().join("-")}`;
      const other = creators.find((c) => c.id === otherUserId);
      const thread: DmThread = {
        id,
        kind: "direct",
        createdBy: viewerId || DEMO_CREATOR_ID,
        lastMessagePreview: "",
        createdAt: new Date().toISOString(),
        otherUserId,
        otherDisplayName: other?.name || "Stitcher",
        otherHandle: other?.handle || "",
        otherAvatarUrl: other?.avatar || "",
      };
      setDmThreads((prev) => [thread, ...prev.filter((t) => t.id !== id)]);
      navigate(`/messages/${id}`);
    } catch (error) {
      setRemoteError(friendlyUserError(error, "Could not open conversation"));
    }
  }

  async function messageStore(storeId: string) {
    if (!requireAuth("message a shop")) return;
    try {
      if (isSupabaseConfigured && user && !isDemoMode) {
        const thread = await openDmWithStoreOnline(storeId);
        setDmThreads((prev) => [thread, ...prev.filter((t) => t.id !== thread.id)]);
        navigate(`/messages/${thread.id}`);
        await refreshDmThreads();
        return;
      }
      const store = stores.find((s) => s.id === storeId);
      const id = `dm-store-demo-${storeId}-${viewerId || "me"}`;
      const thread: DmThread = {
        id,
        kind: "store",
        storeId,
        memberUserId: viewerId || DEMO_CREATOR_ID,
        createdBy: viewerId || DEMO_CREATOR_ID,
        lastMessagePreview: "",
        createdAt: new Date().toISOString(),
        otherDisplayName: store?.name || "Shop",
        otherHandle: store?.handle || "",
        otherAvatarUrl: store?.avatar || "",
        storeName: store?.name,
        storeHandle: store?.handle,
      };
      setDmThreads((prev) => [thread, ...prev.filter((t) => t.id !== id)]);
      navigate(`/messages/${id}`);
    } catch (error) {
      setRemoteError(friendlyUserError(error, "Could not message shop"));
    }
  }

  async function createDmGroup(memberUserIds: string[], title: string) {
    if (!requireAuth("create a group message")) return;
    try {
      if (isSupabaseConfigured && user && !isDemoMode) {
        const thread = await createGroupDmThreadOnline(memberUserIds, title);
        setDmThreads((prev) => [thread, ...prev.filter((t) => t.id !== thread.id)]);
        navigate(`/messages/${thread.id}`);
        await refreshDmThreads();
        return;
      }
      const memberNames = creators
        .filter((creator) => memberUserIds.includes(creator.id))
        .map((creator) => creator.name)
        .join(", ");
      const id = `dm-group-demo-${Date.now()}`;
      const thread: DmThread = {
        id,
        kind: "group",
        title,
        createdBy: viewerId || DEMO_CREATOR_ID,
        lastMessagePreview: "",
        createdAt: new Date().toISOString(),
        otherDisplayName: title.trim() || memberNames || "Group thread",
        otherHandle: "",
        otherAvatarUrl: "",
        unreadCount: 0,
        memberCount: memberUserIds.length + 1,
      };
      setDmThreads((prev) => [thread, ...prev]);
      navigate(`/messages/${id}`);
    } catch (error) {
      setRemoteError(friendlyUserError(error, "Could not create group"));
    }
  }

  async function sendDm(threadId: string, body: string, files: File[] = []) {
    if (!requireAuth("send a message")) return;
    setDmSendBusy(true);
    setDmSendError("");
    try {
      if (isSupabaseConfigured && user && !isDemoMode) {
        const attachments = await Promise.all(files.map((file) => uploadDmAttachmentOnline(user.id, threadId, file)));
        const message = await sendDmMessageOnline(threadId, body, attachments);
        setDmMessagesByThread((prev) => ({
          ...prev,
          [threadId]: [...(prev[threadId] ?? []), { ...message, senderId: user.id, senderName: "You" }],
        }));
        const preview = body.trim().slice(0, 140) || (attachments.length === 1 ? "Sent an attachment" : "Sent attachments");
        setDmThreads((prev) =>
          prev
            .map((t) => (t.id === threadId ? { ...t, lastMessageAt: message.createdAt, lastMessagePreview: preview } : t))
            .sort((a, b) => String(b.lastMessageAt || b.createdAt).localeCompare(String(a.lastMessageAt || a.createdAt))),
        );
        return;
      }
      const attachments = await Promise.all(files.map((file) => uploadDmAttachmentOnline(viewerId || DEMO_CREATOR_ID, threadId, file)));
      const message: DmMessage = {
        id: `dmm-${Date.now()}`,
        threadId,
        senderId: viewerId || DEMO_CREATOR_ID,
        body,
        createdAt: new Date().toISOString(),
        senderName: "You",
        senderHandle: "",
        attachments,
      };
      setDmMessagesByThread((prev) => ({
        ...prev,
        [threadId]: [...(prev[threadId] ?? []), message],
      }));
      const preview = body.trim().slice(0, 140) || (attachments.length === 1 ? "Sent an attachment" : "Sent attachments");
      setDmThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, lastMessageAt: message.createdAt, lastMessagePreview: preview } : t)),
      );
    } catch (error) {
      setDmSendError(friendlyDmError(error, "Could not send message"));
    } finally {
      setDmSendBusy(false);
    }
  }

  function applyMeetupCounts(
    meetup: StitchingMeetup,
    patch: {
      registeredCount?: number;
      waitlistCount?: number;
      spotsLeft?: number | null;
      capacity?: number | null;
      myRsvp?: StitchingMeetup["myRsvp"];
      myWaitlistPosition?: number | null;
      myRegistrationConfirmedAt?: string | null;
      myCheckInCode?: string | null;
      myHoldExpiresAt?: string | null;
      mySeatConfirmedAt?: string | null;
    },
  ): StitchingMeetup {
    const registered = patch.registeredCount ?? meetup.registeredCount ?? meetup.goingCount ?? 0;
    return {
      ...meetup,
      ...patch,
      registeredCount: registered,
      goingCount: registered,
      waitlistCount: patch.waitlistCount ?? meetup.waitlistCount ?? 0,
    };
  }

  function registerForMeetup(meetupId: string) {
    if (!requireAuth("register for a meetup")) return;
    setMeetupRsvpBusy(true);
    const current = meetups.find((m) => m.id === meetupId);
    if (current?.capacity != null) {
      const taken = current.registeredCount ?? current.goingCount ?? 0;
      if (taken >= current.capacity && current.myRsvp !== "registered" && current.myRsvp !== "going") {
        setRemoteError("This meetup is full — join the waitlist.");
        setMeetupRsvpBusy(false);
        return;
      }
    }

    setMeetups((list) =>
      list.map((meetup) => {
        if (meetup.id !== meetupId) return meetup;
        if (meetup.myRsvp === "registered" || meetup.myRsvp === "going" || meetup.myRsvp === "interested") {
          return meetup;
        }
        const wasWaitlisted = meetup.myRsvp === "waitlisted";
        const registered = (meetup.registeredCount ?? meetup.goingCount ?? 0) + 1;
        const waitlistCount = wasWaitlisted
          ? Math.max((meetup.waitlistCount ?? 1) - 1, 0)
          : (meetup.waitlistCount ?? 0);
        const spotsLeft = meetup.capacity != null ? Math.max(meetup.capacity - registered, 0) : null;
        return applyMeetupCounts(meetup, {
          myRsvp: "registered",
          registeredCount: registered,
          waitlistCount,
          spotsLeft,
          myWaitlistPosition: null,
          myRegistrationConfirmedAt: new Date().toISOString(),
        });
      }),
    );

    if (isSupabaseConfigured && user) {
      void registerForMeetupOnline(meetupId)
        .then((result) => {
          setMeetups((list) =>
            list.map((meetup) =>
              meetup.id === meetupId
                ? applyMeetupCounts(meetup, {
                    myRsvp: "registered",
                    registeredCount: result.registeredCount,
                    waitlistCount: result.waitlistCount,
                    capacity: result.capacity ?? meetup.capacity,
                    spotsLeft: result.spotsLeft,
                    myWaitlistPosition: null,
                    myRegistrationConfirmedAt: result.confirmedAt ?? new Date().toISOString(),
                    myCheckInCode: result.checkInCode ?? meetup.myCheckInCode ?? null,
                    myHoldExpiresAt: result.holdExpiresAt ?? null,
                    mySeatConfirmedAt: result.seatConfirmedAt ?? new Date().toISOString(),
                  })
                : meetup,
            ),
          );
        })
        .catch((error) => {
          setRemoteError(friendlyUserError(error, "Registration failed"));
          // Roll back optimistic UI by reloading meetups + rsvps
          setRemoteBootKey((k) => k + 1);
        })
        .finally(() => setMeetupRsvpBusy(false));
      return;
    }
    setMeetupRsvpBusy(false);
  }

  function joinMeetupWaitlist(meetupId: string) {
    if (!requireAuth("join a meetup waitlist")) return;
    setMeetupRsvpBusy(true);
    setMeetups((list) =>
      list.map((meetup) => {
        if (meetup.id !== meetupId) return meetup;
        if (meetup.myRsvp === "waitlisted" || meetup.myRsvp === "registered" || meetup.myRsvp === "going") {
          return meetup;
        }
        const waitlistCount = (meetup.waitlistCount ?? 0) + 1;
        return applyMeetupCounts(meetup, {
          myRsvp: "waitlisted",
          waitlistCount,
          myWaitlistPosition: waitlistCount,
          myRegistrationConfirmedAt: null,
        });
      }),
    );

    if (isSupabaseConfigured && user) {
      void joinMeetupWaitlistOnline(meetupId)
        .then((result) => {
          setMeetups((list) =>
            list.map((meetup) =>
              meetup.id === meetupId
                ? applyMeetupCounts(meetup, {
                    myRsvp: "waitlisted",
                    registeredCount: result.registeredCount,
                    waitlistCount: result.waitlistCount,
                    capacity: result.capacity ?? meetup.capacity,
                    spotsLeft: result.spotsLeft,
                    myWaitlistPosition: result.waitlistPosition ?? null,
                    myRegistrationConfirmedAt: null,
                  })
                : meetup,
            ),
          );
        })
        .catch((error) => {
          setRemoteError(friendlyUserError(error, "Could not join waitlist"));
          setRemoteBootKey((k) => k + 1);
        })
        .finally(() => setMeetupRsvpBusy(false));
      return;
    }
    setMeetupRsvpBusy(false);
  }

  function cancelMeetupRegistration(meetupId: string) {
    if (!requireAuth("cancel a meetup registration")) return;
    setMeetupRsvpBusy(true);
    setMeetups((list) =>
      list.map((meetup) => {
        if (meetup.id !== meetupId) return meetup;
        const wasReg =
          meetup.myRsvp === "registered" || meetup.myRsvp === "going" || meetup.myRsvp === "interested";
        const wasWl = meetup.myRsvp === "waitlisted";
        if (!wasReg && !wasWl) return meetup;

        // Demo auto-promote: if registered cancelled and waitlist > 0, keep registered count same and drop waitlist by 1
        if (wasReg) {
          const wl = meetup.waitlistCount ?? 0;
          if (wl > 0 && meetup.capacity != null) {
            return applyMeetupCounts(meetup, {
              myRsvp: null,
              registeredCount: meetup.registeredCount ?? meetup.goingCount ?? 0,
              waitlistCount: Math.max(wl - 1, 0),
              spotsLeft: 0,
              myWaitlistPosition: null,
              myRegistrationConfirmedAt: null,
              myCheckInCode: null,
              myHoldExpiresAt: null,
              mySeatConfirmedAt: null,
            });
          }
          const registered = Math.max((meetup.registeredCount ?? meetup.goingCount ?? 1) - 1, 0);
          const spotsLeft = meetup.capacity != null ? Math.max(meetup.capacity - registered, 0) : null;
          return applyMeetupCounts(meetup, {
            myRsvp: null,
            registeredCount: registered,
            spotsLeft,
            myWaitlistPosition: null,
            myRegistrationConfirmedAt: null,
            myCheckInCode: null,
            myHoldExpiresAt: null,
            mySeatConfirmedAt: null,
          });
        }

        const waitlistCount = Math.max((meetup.waitlistCount ?? 1) - 1, 0);
        return applyMeetupCounts(meetup, {
          myRsvp: null,
          waitlistCount,
          myWaitlistPosition: null,
          myRegistrationConfirmedAt: null,
        });
      }),
    );

    if (isSupabaseConfigured && user) {
      void cancelMeetupRegistrationOnline(meetupId)
        .then((result) => {
          setMeetups((list) =>
            list.map((meetup) =>
              meetup.id === meetupId
                ? applyMeetupCounts(meetup, {
                    myRsvp: null,
                    registeredCount: result.registeredCount,
                    waitlistCount: result.waitlistCount,
                    capacity: result.capacity ?? meetup.capacity,
                    spotsLeft: result.spotsLeft,
                    myWaitlistPosition: null,
                    myRegistrationConfirmedAt: null,
                    myCheckInCode: null,
                    myHoldExpiresAt: null,
                    mySeatConfirmedAt: null,
                  })
                : meetup,
            ),
          );
          void refreshNotifications();
        })
        .catch((error) => {
          setRemoteError(friendlyUserError(error, "Could not cancel registration"));
          setRemoteBootKey((k) => k + 1);
        })
        .finally(() => setMeetupRsvpBusy(false));
      return;
    }
    setMeetupRsvpBusy(false);
  }

  function confirmMeetupSeat(meetupId: string) {
    if (!requireAuth("confirm your meetup seat")) return;
    setMeetupRsvpBusy(true);
    if (isSupabaseConfigured && user) {
      void confirmMeetupSeatOnline(meetupId)
        .then((result) => {
          setMeetups((list) =>
            list.map((meetup) =>
              meetup.id === meetupId
                ? {
                    ...meetup,
                    myHoldExpiresAt: null,
                    mySeatConfirmedAt: result.seatConfirmedAt ?? new Date().toISOString(),
                    myCheckInCode: result.checkInCode ?? meetup.myCheckInCode ?? null,
                  }
                : meetup,
            ),
          );
        })
        .catch((error) => {
          setRemoteError(friendlyUserError(error, "Could not confirm seat"));
          setRemoteBootKey((k) => k + 1);
        })
        .finally(() => setMeetupRsvpBusy(false));
      return;
    }
    setMeetups((list) =>
      list.map((meetup) =>
        meetup.id === meetupId
          ? {
              ...meetup,
              myHoldExpiresAt: null,
              mySeatConfirmedAt: new Date().toISOString(),
              myCheckInCode: meetup.myCheckInCode || "DEMOCODE",
            }
          : meetup,
      ),
    );
    setMeetupRsvpBusy(false);
  }

  function cancelMeetup(meetupId: string) {
    if (!requireAuth("cancel a meetup")) return;
    setMeetups((current) =>
      current.map((meetup) => (meetup.id === meetupId ? { ...meetup, status: "cancelled" as const } : meetup)),
    );
    if (isSupabaseConfigured && user) {
      void cancelMeetupOnline(meetupId).catch((error) => {
        setRemoteError(friendlyUserError(error, "Could not cancel meetup"));
      });
    }
  }

  function dismissRecommendation(surface: "discover" | "studio", projectId: string) {
    if (!requireAuth("skip recommendations")) return;
    if (surface === "discover") {
      setDismissedDiscover((current) => (current.includes(projectId) ? current : [...current, projectId]));
    } else {
      setDismissedStudio((current) => (current.includes(projectId) ? current : [...current, projectId]));
    }
    if (isSupabaseConfigured && user) {
      void dismissRecommendedProjectOnline(user.id, projectId, surface).catch((error) => {
        setRemoteError(friendlyUserError(error, "Could not save skip"));
      });
    }
  }

  function retryRemoteHydrate() {
    if (!isSupabaseConfigured) return;
    setRemoteError("");
    setRemoteReady(false);
    setRemoteBootKey((key) => key + 1);
  }

  const noticeIsShareInfo =
    remoteError.startsWith("Public post link") ||
    remoteError.startsWith("Private link") ||
    remoteError.startsWith("This project is private") ||
    remoteError.startsWith("Share this public") ||
    remoteError.startsWith("Sign in to ");
  const studioRefreshFailed = remoteError === "studio-refresh";
  const bannerMessage = studioRefreshFailed
    ? "Studio couldn't refresh. You're seeing the last stitches we have."
    : remoteError;

  return (
    <AppLayout
      savedCount={savedProjects.length}
      messagesUnread={totalDmUnread(dmThreads)}
      setView={setView}
      canPost={Boolean(user) || isDemoMode || !isSupabaseConfigured}
      banner={bannerMessage}
      bannerInfo={noticeIsShareInfo}
      notifications={notifications}
      onOpenNotification={(item) => void openNotification(item)}
      onDismissAllNotifications={() => void dismissAllNotifications()}
    >
      <AppRoutes
        studioFeedProjects={studioFeedProjects}
        publicProjects={publicProjects}
        accessibleProjects={accessibleProjects}
        filteredProjects={filteredProjects}
        creatorById={creatorById}
        creatorByHandle={creatorByHandle}
        projectById={projectById}
        setView={setView}
        toggleLike={toggleLike}
        toggleSave={toggleSave}
        shareProject={shareProject}
        toggleFollow={toggleFollow}
        stitchAlong={stitchAlong}
        stitchAlongs={stitchAlongs}
        followedCreators={followedCreators}
        followedStores={followedStores}
        savedCount={savedProjects.length}
        stores={stores}
        openDiscover={openDiscover}
        dismissRecommendation={dismissRecommendation}
        hasInterests={hasInterests}
        canPost={Boolean(user) || isDemoMode || !isSupabaseConfigured}
        feedLoading={!remoteReady}
        followedStoresLoading={!remoteReady}
        storesLoading={!remoteReady}
        feedRefreshError={studioRefreshFailed}
        onRetryFeed={retryRemoteHydrate}
        categories={categories}
        stitches={stitches}
        colors={colors}
        query={query}
        filters={filters}
        setQuery={setQuery}
        setFilters={setFilters}
        collections={collections}
        canManageCollections={Boolean(user) || isDemoMode || !isSupabaseConfigured}
        onCreateCollection={(input) => createCollection(input)}
        onRenameCollection={(id, input) => renameCollection(id, input)}
        onDeleteCollection={(id) => deleteCollection(id)}
        onSetProjectInCollection={(collectionId: string, projectId: string, shouldContain: boolean) =>
          setProjectInCollection(collectionId, projectId, shouldContain)
        }
        onReport={(input) => submitReport(input)}
        draft={draft}
        setDraft={setDraft}
        submitProject={(event) => void submitProject(event)}
        myProjects={myProjects}
        journalLoading={!remoteReady}
        canUpload={Boolean(user) || !isSupabaseConfigured}
        uploadBusy={uploadBusy}
        uploadError={uploadError}
        imagePreview={imagePreview}
        onPickImage={pickDraftImage}
        onClearImage={clearDraftImage}
        toggleStoreFollow={toggleStoreFollow}
        viewerId={viewerId}
        isDemoMode={isDemoMode}
        isModerator={userIsModerator(user)}
        canModerateClaims={userIsModerator(user) || stores.some((store) => store.ownerUserId === viewerId)}
        claimBusy={claimBusy}
        claimPendingStoreIds={pendingClaimStoreIds}
        claimNotice={claimNotice}
        productBusy={productBusy}
        productError={productError}
        onClaimStore={(storeId) => void claimStore(storeId)}
        onRespondVenueRequest={(meetupId, approve) => void respondMeetupStoreLink(meetupId, approve)}
        dmThreads={dmThreads}
        dmMessagesByThread={dmMessagesByThread}
        dmCreators={creators}
        dmLoading={dmLoading}
        dmError={dmError}
        dmSendBusy={dmSendBusy}
        dmSendError={dmSendError}
        onRefreshDmThread={refreshDmThread}
        onSendDm={(threadId: string, body: string, files?: File[]) => void sendDm(threadId, body, files)}
        onCreateDmGroup={(memberUserIds, title) => void createDmGroup(memberUserIds, title)}
        onMessageUser={(userId) => void messageUser(userId)}
        onMessageStore={(storeId) => void messageStore(storeId)}
        onCreateProduct={(storeId, input, imageFile) => createStoreProduct(storeId, input, imageFile)}
        onUpdateProduct={(storeId, productId, input, imageFile) => updateStoreProduct(storeId, productId, input, imageFile)}
        onDeleteProduct={(storeId, productId) => deleteStoreProduct(storeId, productId)}
        profileBusy={profileBusy}
        profileError={profileError}
        profileSuccess={profileSuccess}
        onUpdateProfile={(storeId, input, files) => updateStoreProfile(storeId, input, files)}
        joinStitchAlong={joinStitchAlong}
        submitToStitchAlong={submitToStitchAlong}
        canHost={Boolean(user) || isDemoMode}
        onCreateStitchAlong={(input) => void createStitchAlong(input)}
        onEndStitchAlong={(id) => void endStitchAlong(id)}
        hostActionBusy={salHostActionBusy}
        hostActionError={salHostActionError}
        salCreateBusy={salCreateBusy}
        salCreateError={salCreateError}
        meetups={meetups}
        onCreateMeetup={(input) => void createMeetup(input)}
        meetupCreateBusy={meetupCreateBusy}
        meetupCreateError={meetupCreateError}
        onMeetupRegister={registerForMeetup}
        onMeetupJoinWaitlist={joinMeetupWaitlist}
        onMeetupCancelRegistration={cancelMeetupRegistration}
        onMeetupConfirmSeat={confirmMeetupSeat}
        onCancelMeetup={cancelMeetup}
        meetupRegisterBusy={meetupRsvpBusy}
        ownedStoreId={stores.find((store) => store.ownerUserId === viewerId)?.id ?? null}
        canUseMine={Boolean(user) || isDemoMode || !isSupabaseConfigured}
        updateNote={updateNote}
        updateMilestone={updateMilestone}
        commentText={commentText}
        canComment={Boolean(user) || isDemoMode || !isSupabaseConfigured}
        updateBusy={updateBusy}
        updateError={updateError}
        updateImagePreview={updateImagePreview}
        updateImageUrl={updateImageUrl}
        setUpdateNote={setUpdateNote}
        setUpdateMilestone={setUpdateMilestone}
        setCommentText={setCommentText}
        setUpdateImageUrl={setUpdateImageUrl}
        onPickUpdateImage={pickUpdateImage}
        onClearUpdateImage={clearUpdateImage}
        addProgressUpdate={(id) => void addProgressUpdate(id)}
        addComment={addComment}
        saveProjectEdits={saveProjectEdits}
        isOwnerFor={isOwnerOf}
        projectLoading={!remoteReady}
      />
    </AppLayout>
  );
}
