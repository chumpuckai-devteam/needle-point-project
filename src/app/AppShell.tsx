import { createProjectOnline, fetchRecommendedProjects, dismissRecommendedProjectOnline, addProgressUpdateOnline, updateProjectOnline } from "../api/projects";
import { fetchProfiles, toggleFollowOnline } from "../api/profiles";
import { addCommentOnline, toggleProjectLikeOnline, toggleSaveOnline } from "../api/social";
import {
  createStitchAlongOnline,
  getStitchAlongOnline,
  joinStitchAlongOnline,
  leaveStitchAlongOnline,
  listPublicStitchAlongsOnline,
  submitToStitchAlongOnline,
} from "../api/stitchAlongs";
import { uploadProjectImage, validateImageFile } from "../api/images";
import {
  claimStoreOnline,
  createStoreProductOnline,
  deleteStoreProductOnline,
  fetchFollowedStoreIds,
  fetchStores,
  setProjectStores,
  toggleStoreFollowOnline,
  updateStoreProfileOnline,
  updateStoreProductOnline,
  uploadStoreProfileImage,
  type StoreProductInput,
  type StoreProfileInput,
} from "../api/stores";
import { creators as seedCreators, initialCollections, initialProjects, initialStitchAlongs, stitchAlong as seedStitchAlong } from "../data";
import type { Collection, Creator, MediaKind, Project, StitchAlong, Store } from "../types";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";
import { loadFromStorage, saveToStorage } from "../lib/storage";
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
  const [followedCreators, setFollowedCreators] = useState<string[]>(() => loadFromStorage(STORAGE_KEYS.follows, ["c1"]));
  const [followedStores, setFollowedStores] = useState<string[]>(() => loadFromStorage(STORAGE_KEYS.storeFollows, ["store-local-1"]));
  const [dismissedDiscover, setDismissedDiscover] = useState<string[]>(() => loadFromStorage(STORAGE_KEYS.dismissDiscover, [] as string[]));
  const [dismissedStudio, setDismissedStudio] = useState<string[]>(() => loadFromStorage(STORAGE_KEYS.dismissStudio, [] as string[]));
  const [interestProfile, setInterestProfile] = useState(() => ({
    interests: loadFromStorage(STORAGE_KEYS.interests, ["ornaments", "florals"] as string[]),
    skillLevel: loadFromStorage(STORAGE_KEYS.skill, "confident beginner"),
  }));
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
  const [stores, setStores] = useState<Store[]>(DEMO_STORES);
  const [claimBusy, setClaimBusy] = useState(false);
  const [productBusy, setProductBusy] = useState(false);
  const [productError, setProductError] = useState("");
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
  useEffect(() => saveToStorage(STORAGE_KEYS.dismissDiscover, dismissedDiscover), [dismissedDiscover]);
  useEffect(() => saveToStorage(STORAGE_KEYS.dismissStudio, dismissedStudio), [dismissedStudio]);

  // Refresh onboarding prefs when returning from /onboarding (same tab localStorage).
  useEffect(() => {
    if (location.pathname !== "/" && location.pathname !== "/discover") return;
    setInterestProfile({
      interests: loadFromStorage(STORAGE_KEYS.interests, interestProfile.interests),
      skillLevel: loadFromStorage(STORAGE_KEYS.skill, interestProfile.skillLevel),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-read storage on route change
  }, [location.pathname]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStores(DEMO_STORES);
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
    (async () => {
      try {
        // Soft-fail optional streams so one missing RPC/table never blanks Studio.
        const settled = await Promise.allSettled([
          fetchRecommendedProjects({ surface: "studio", currentUserId: user?.id ?? null }),
          fetchProfiles(),
          fetchStores(),
          user?.id ? fetchFollowedStoreIds(user.id) : Promise.resolve([] as string[]),
          listPublicStitchAlongsOnline(user?.id ?? null),
        ]);
        if (cancelled) return;

        const remoteProjects = settled[0].status === "fulfilled" ? settled[0].value : [];
        const remoteProfiles = settled[1].status === "fulfilled" ? settled[1].value : [];
        const remoteStores = settled[2].status === "fulfilled" ? settled[2].value : [];
        const remoteStoreFollows = settled[3].status === "fulfilled" ? settled[3].value : [];
        const remoteStitchAlongs = settled[4].status === "fulfilled" ? settled[4].value : [];

        const hardFailures = settled
          .map((result, index) => ({ result, index }))
          .filter(({ result, index }) => result.status === "rejected" && (index === 1 || index === 2));
        // Profiles + stores are core; if both core paths fail, surface error.
        if (hardFailures.length >= 2 && !remoteProfiles.length && !remoteStores.length && !remoteProjects.length) {
          const reason = hardFailures[0]?.result;
          const message =
            reason && reason.status === "rejected" && reason.reason instanceof Error
              ? reason.reason.message
              : "Failed to load remote data";
          setRemoteError(message);
          return;
        }

        if (remoteProfiles.length) setCreators(remoteProfiles);
        if (remoteStores.length) setStores(remoteStores);
        else setStores(DEMO_STORES);
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
        if (user?.id) setFollowedStores(remoteStoreFollows);
        setRemoteError("");
      } catch (error) {
        if (!cancelled) {
          setRemoteError(error instanceof Error ? error.message : "Failed to load remote data");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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

  const categories = unique(publicProjects.map((project) => project.category));
  const stitches = unique(publicProjects.flatMap((project) => project.stitchTypes));
  const colors = unique(publicProjects.flatMap((project) => project.colors));

  // Studio: followed first, then interest-ranked recommendations (client rank for demo + dismiss layer).
  const studioFeedProjects = useMemo(() => {
    const ranked = rankProjectsByInterest(publicProjects, interestProfile, {
      dismissedIds: dismissedStudio,
      followedCreatorIds: followedCreators,
      surface: "studio",
    });
    return composeStudioFeed(ranked, followedCreators, dismissedStudio);
  }, [dismissedStudio, followedCreators, interestProfile, publicProjects]);

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
    return rankProjectsByInterest(filtered, interestProfile, {
      dismissedIds: dismissedDiscover,
      surface: "discover",
    });
  }, [creatorById, dismissedDiscover, filters, interestProfile, publicProjects, query]);

  function setView(view: View) {
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
    const project = projects.find((item) => item.id === id);
    setProjects((current) =>
      current.map((item) =>
        item.id === id ? { ...item, isLiked: !item.isLiked, likes: item.likes + (item.isLiked ? -1 : 1) } : item,
      ),
    );
    if (isSupabaseConfigured && user && project) {
      void toggleProjectLikeOnline(id, user.id, project.isLiked).catch((error) => {
        setRemoteError(error instanceof Error ? error.message : "Like failed");
      });
    }
  }

  function toggleSave(id: string) {
    const project = projects.find((item) => item.id === id);
    setProjects((current) => current.map((item) => (item.id === id ? { ...item, isSaved: !item.isSaved } : item)));
    setCollections((current) =>
      current.map((collection) =>
        collection.id === "col1"
          ? {
              ...collection,
              projectIds: collection.projectIds.includes(id)
                ? collection.projectIds.filter((projectId) => projectId !== id)
                : [...collection.projectIds, id],
            }
          : collection,
      ),
    );
    if (isSupabaseConfigured && user && project) {
      void toggleSaveOnline(user.id, id, project.isSaved).catch((error) => {
        setRemoteError(error instanceof Error ? error.message : "Save failed");
      });
    }
  }

  function toggleFollow(id: string) {
    const currently = followedCreators.includes(id);
    setFollowedCreators((current) => (currently ? current.filter((creatorId) => creatorId !== id) : [...current, id]));
    if (isSupabaseConfigured && user) {
      void toggleFollowOnline(user.id, id, currently).catch((error) => {
        setRemoteError(error instanceof Error ? error.message : "Follow failed");
      });
    }
  }

  function toggleStoreFollow(storeId: string) {
    // Online guests must sign in. Demo/offline toggles local state → localStorage storeFollows.
    if (isSupabaseConfigured && !user) {
      setRemoteError("Sign in to follow stores.");
      setView({ name: "auth" });
      return;
    }
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
        setRemoteError(error instanceof Error ? error.message : "Store follow failed");
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
    if (isSupabaseConfigured && !user) {
      setRemoteError("Sign in to claim a shop.");
      setView({ name: "auth" });
      return;
    }
    setClaimBusy(true);
    setRemoteError("");
    try {
      // Demo uses meCreatorId so StoreRoute isOwner matches after claim (not auth "demo-user" id).
      const ownerId = isDemoMode ? meCreatorId : user!.id;
      if (isSupabaseConfigured && user) {
        await claimStoreOnline(storeId, user.id);
      }
      setStores((current) => current.map((store) => (store.id === storeId ? { ...store, ownerUserId: ownerId } : store)));
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : "Could not claim shop");
    } finally {
      setClaimBusy(false);
    }
  }

  async function createStoreProduct(storeId: string, input: StoreProductInput, imageFile?: File | null) {
    setProductBusy(true);
    setProductError("");
    try {
      // UI task stub: local blob preview until Storage wire-up (t_8b921d69).
      let image = input.image?.trim() || "";
      if (imageFile) {
        const invalid = validateImageFile(imageFile);
        if (invalid) throw new Error(invalid);
        image = URL.createObjectURL(imageFile);
      }
      const payload: StoreProductInput = { ...input, image };
      const created = await createStoreProductOnline(storeId, payload);
      const product = {
        ...created,
        storeId,
        image: created.image || image || "/assets/needlepoint-hero.png",
      };
      setStores((current) =>
        current.map((store) => (store.id === storeId ? { ...store, products: [...store.products, product] } : store)),
      );
    } catch (error) {
      setProductError(error instanceof Error ? error.message : "Could not add product");
      throw error;
    } finally {
      setProductBusy(false);
    }
  }

  async function updateStoreProduct(storeId: string, productId: string, input: StoreProductInput, imageFile?: File | null) {
    setProductBusy(true);
    setProductError("");
    try {
      let image = input.image?.trim() || "";
      if (imageFile) {
        const invalid = validateImageFile(imageFile);
        if (invalid) throw new Error(invalid);
        image = URL.createObjectURL(imageFile);
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
      setProductError(error instanceof Error ? error.message : "Could not update product");
      throw error;
    } finally {
      setProductBusy(false);
    }
  }

  async function deleteStoreProduct(storeId: string, productId: string) {
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
      setProductError(error instanceof Error ? error.message : "Could not delete product");
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
      const message = error instanceof Error ? error.message : "Could not save shop profile";
      setProfileError(message);
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
      setUploadError(invalid);
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
      } else {
        project = {
          id: `p${Date.now()}`,
          creatorId: meCreatorId,
          isLiked: false,
          isSaved: false,
          likes: 0,
          storeIds: draft.storeIds,
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
      const message = error instanceof Error ? error.message : "Could not save project";
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
      setUpdateError(invalid);
      return;
    }
    if (updateImagePreview.startsWith("blob:")) URL.revokeObjectURL(updateImagePreview);
    setUpdateImageFile(file);
    setUpdateImagePreview(URL.createObjectURL(file));
    setUpdateImageUrl("");
    setUpdateError("");
  }

  async function saveProjectEdits(projectId: string, draft: DraftProject & { progress: number }, imageFile?: File | null) {
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
            }
          : item,
      ),
    );

    if (isSupabaseConfigured && user) {
      await setProjectStores(projectId, draft.storeIds ?? []);
    }
    setRemoteError("");
  }

  async function addProgressUpdate(projectId: string) {
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
      const message = error instanceof Error ? error.message : "Update failed";
      setUpdateError(message);
      setRemoteError(message);
    } finally {
      setUpdateBusy(false);
    }
  }

  function addComment(projectId: string) {
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
        setRemoteError(error instanceof Error ? error.message : "Comment failed");
      });
    }
  }

  function joinStitchAlong(stitchAlongId = stitchAlong.id) {
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
        setRemoteError(error instanceof Error ? error.message : "Stitch-along join failed");
      });
    }
  }

  function submitToStitchAlong(projectId: string, stitchAlongId = stitchAlong.id) {
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
        setRemoteError(error instanceof Error ? error.message : "Stitch-along submission failed");
      });
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
        setSalCreateError(error instanceof Error ? error.message : "Could not create stitch-along");
      } finally {
        setSalCreateBusy(false);
      }
      return;
    }
    setStitchAlongs((current) => [local, ...current]);
    navigate(`/stitch-along/${local.id}`);
  }

  function dismissRecommendation(surface: "discover" | "studio", projectId: string) {
    if (surface === "discover") {
      setDismissedDiscover((current) => (current.includes(projectId) ? current : [...current, projectId]));
    } else {
      setDismissedStudio((current) => (current.includes(projectId) ? current : [...current, projectId]));
    }
    if (isSupabaseConfigured && user) {
      void dismissRecommendedProjectOnline(user.id, projectId, surface).catch((error) => {
        setRemoteError(error instanceof Error ? error.message : "Could not save skip");
      });
    } else if (isSupabaseConfigured && !user) {
      setRemoteError("Sign in to remember skipped recommendations across devices.");
    }
  }


  const noticeIsShareInfo =
    remoteError.startsWith("Public post link") ||
    remoteError.startsWith("Private link") ||
    remoteError.startsWith("This project is private") ||
    remoteError.startsWith("Share this public");

  return (
    <AppLayout
      savedCount={savedProjects.length}
      setView={setView}
      banner={remoteError}
      bannerInfo={noticeIsShareInfo}
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
        categories={categories}
        stitches={stitches}
        colors={colors}
        query={query}
        filters={filters}
        setQuery={setQuery}
        setFilters={setFilters}
        collections={collections}
        draft={draft}
        setDraft={setDraft}
        submitProject={(event) => void submitProject(event)}
        myProjects={myProjects}
        canUpload={Boolean(user) || !isSupabaseConfigured}
        uploadBusy={uploadBusy}
        uploadError={uploadError}
        imagePreview={imagePreview}
        onPickImage={pickDraftImage}
        onClearImage={clearDraftImage}
        toggleStoreFollow={toggleStoreFollow}
        viewerId={viewerId}
        isDemoMode={isDemoMode}
        claimBusy={claimBusy}
        productBusy={productBusy}
        productError={productError}
        onClaimStore={(storeId) => void claimStore(storeId)}
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
        salCreateBusy={salCreateBusy}
        salCreateError={salCreateError}
        updateNote={updateNote}
        updateMilestone={updateMilestone}
        commentText={commentText}
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
      />
    </AppLayout>
  );
}
