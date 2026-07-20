import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { fetchStoreByIdentifier } from "../api/stores";
import type { StoreProductInput, StoreProfileInput } from "../api/stores";
import type { View } from "../appModel";
import { DetailSkeleton, EmptyState } from "../components/ui";
import { findStoreByIdentifier, resolveStoresReturnTo, storeDetailPath } from "../lib/storeLinks";
import { uiCopy } from "../lib/uiCopy";
import type { Project, StitchingMeetup, Store } from "../types";
import { StoreDetailView } from "./StoreDetailPage";

export function StoreRoute({
  stores,
  storesLoading = false,
  projects,
  meetups = [],
  followedStores,
  toggleStoreFollow,
  currentUserId,
  isDemoMode,
  claimBusy,
  claimPendingStoreIds = [],
  claimNotice = "",
  productBusy,
  productError,
  profileBusy,
  profileError,
  profileSuccess,
  onClaimStore,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateProfile,
  setView,
  onReport,
}: {
  stores: Store[];
  storesLoading?: boolean;
  projects: Project[];
  meetups?: StitchingMeetup[];
  followedStores: string[];
  toggleStoreFollow: (storeId: string) => void;
  currentUserId: string | null;
  isDemoMode: boolean;
  claimBusy: boolean;
  claimPendingStoreIds?: string[];
  claimNotice?: string;
  productBusy: boolean;
  productError: string;
  profileBusy: boolean;
  profileError: string;
  profileSuccess: string;
  onClaimStore: (storeId: string) => void;
  onCreateProduct: (storeId: string, input: StoreProductInput, imageFile?: File | null) => Promise<void>;
  onUpdateProduct: (storeId: string, productId: string, input: StoreProductInput, imageFile?: File | null) => Promise<void>;
  onDeleteProduct: (storeId: string, productId: string) => Promise<void>;
  onUpdateProfile: (
    storeId: string,
    input: StoreProfileInput,
    files?: { avatarFile?: File | null; coverFile?: File | null },
  ) => Promise<void>;
  setView: (view: View) => void;
  onReport?: (input: import("../api/reports").ReportInput) => void | Promise<void>;
}) {
  const { handle = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const browseReturnTo = resolveStoresReturnTo(location.state);

  const fromCatalog = findStoreByIdentifier(stores, handle);
  const [fetchedStore, setFetchedStore] = useState<Store | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailMiss, setDetailMiss] = useState(false);

  // Prefer live catalog (keeps owner product edits in sync); fall back to cold-open fetch.
  const store = fromCatalog ?? fetchedStore;

  useEffect(() => {
    setFetchedStore(null);
    setDetailMiss(false);
  }, [handle]);

  useEffect(() => {
    if (fromCatalog) {
      setFetchedStore(null);
      setDetailMiss(false);
      setDetailLoading(false);
      return;
    }
    // Wait for initial catalog hydrate before treating as missing / hitting detail RPC.
    if (storesLoading) return;

    let cancelled = false;
    setDetailLoading(true);
    setDetailMiss(false);

    void fetchStoreByIdentifier(handle)
      .then((remote) => {
        if (cancelled) return;
        if (remote) {
          setFetchedStore(remote);
          setDetailMiss(false);
        } else {
          setFetchedStore(null);
          setDetailMiss(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setFetchedStore(null);
        setDetailMiss(true);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fromCatalog, handle, storesLoading]);

  // Canonicalize UUID / mixed-case identifiers to /stores/:handle while keeping browse return state.
  useEffect(() => {
    if (!store?.handle) return;
    const current = (handle ?? "").trim();
    if (!current) return;
    if (current === store.handle) return;
    // Only rewrite when the param matched this store by id or case-folded handle.
    const matchedById = store.id.toLowerCase() === current.toLowerCase();
    const matchedByHandleCase = store.handle.toLowerCase() === current.toLowerCase() && current !== store.handle;
    if (!matchedById && !matchedByHandleCase) return;
    navigate(storeDetailPath(store.handle), { replace: true, state: location.state });
  }, [handle, location.state, navigate, store]);

  if (!store) {
    if (storesLoading || detailLoading) {
      return (
        <section className="page">
          <DetailSkeleton label={uiCopy.shops.loading} />
        </section>
      );
    }
    if (detailMiss || !handle.trim()) {
      return (
        <EmptyState
          variant="detail"
          minHeight={280}
          title={uiCopy.shopDetail.notFound.title}
          body={uiCopy.shopDetail.notFound.body}
          action={uiCopy.shopDetail.notFound.cta}
          onAction={() => navigate(browseReturnTo)}
        />
      );
    }
    // Brief gap while effect kicks in after catalog miss.
    return (
      <section className="page">
        <DetailSkeleton label={uiCopy.shops.loading} />
      </section>
    );
  }

  const linked = projects.filter((project) => (project.storeIds ?? []).includes(store.id));
  const shopMeetups = meetups.filter(
    (m) => m.hostStoreId === store.id && m.visibility === "public" && m.status === "scheduled",
  );
  // Demo + online: owner only when current user matches store.ownerUserId.
  // DEMO_STORES seeds Canopy as owned (CRUD, no Follow); other shops stay followable.
  const isOwner = Boolean(currentUserId && store.ownerUserId && store.ownerUserId === currentUserId);
  // Unowned shops are claimable; guests still see the CTA (requireAuth on click).
  const canClaim = !isOwner && !store.ownerUserId;
  const claimPending = claimPendingStoreIds.includes(store.id);

  return (
    <StoreDetailView
      store={store}
      projects={linked}
      meetups={shopMeetups}
      isFollowed={followedStores.includes(store.id)}
      isOwner={isOwner}
      canClaim={canClaim}
      claimBusy={claimBusy}
      claimPending={claimPending}
      claimNotice={claimNotice}
      productBusy={productBusy}
      productError={productError}
      profileBusy={profileBusy}
      profileError={profileError}
      profileSuccess={profileSuccess}
      canUpload={Boolean(currentUserId) || isDemoMode}
      toggleStoreFollow={toggleStoreFollow}
      onClaimStore={() => onClaimStore(store.id)}
      onCreateProduct={(input, imageFile) => onCreateProduct(store.id, input, imageFile)}
      onUpdateProduct={(productId, input, imageFile) => onUpdateProduct(store.id, productId, input, imageFile)}
      onDeleteProduct={(productId) => onDeleteProduct(store.id, productId)}
      onUpdateProfile={(input, files) => onUpdateProfile(store.id, input, files)}
      setView={setView}
      browseReturnTo={browseReturnTo}
      onReport={onReport}
    />
  );
}
