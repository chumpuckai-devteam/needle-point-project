import { useParams } from "react-router-dom";
import type { Project, Store } from "../types";
import type { StoreProductInput, StoreProfileInput } from "../api/stores";
import type { View } from "../appModel";
import { EmptyState } from "../components/ui";
import { StoreDetailView } from "./StoreDetailPage";

export function StoreRoute({
  stores,
  projects,
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
}: {
  stores: Store[];
  projects: Project[];
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
}) {
  const { handle = "" } = useParams();
  const store = stores.find((item) => item.handle === handle);
  if (!store) {
    return (
      <EmptyState
        variant="detail"
        minHeight={280}
        title="Store not found"
        body="That shop may have moved."
        action="Browse stores"
        onAction={() => setView({ name: "stores" })}
      />
    );
  }
  const linked = projects.filter((project) => (project.storeIds ?? []).includes(store.id));
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
    />
  );
}
