import { FormEvent, useEffect, useId, useState } from "react";
import { ExternalLink, MapPin, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Project, StitchingMeetup, Store, StoreProduct } from "../types";
import type { StoreProductInput, StoreProfileInput } from "../api/stores";
import type { ReportInput } from "../api/reports";
import { formatMeetupPlace, formatMeetupWhen } from "../lib/meetups";
import { recordOutboundClickEvent } from "../api/clickEvents";
import type { View } from "../appModel";
import { ImageFilePicker } from "../components/ImageFilePicker";
import { ReportControl } from "../components/ReportControl";
import { StoreOwnerAnalytics } from "../components/StoreOwnerAnalytics";
import { EmptyState, SectionTitle } from "../components/ui";
import { isStoresBrowseReturnPath } from "../lib/storeLinks";
import { storeMapLinks } from "../lib/storeMaps";
import { uiCopy } from "../lib/uiCopy";

function storeProfileFromStore(store: Store): StoreProfileInput {
  return {
    name: store.name,
    description: store.description,
    websiteUrl: store.websiteUrl,
    location: store.location,
    city: store.city,
    avatar: store.avatar,
    coverImage: store.coverImage,
    specialties: store.specialties,
  };
}

function isLikelyUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function trackShopLinkClick(product: StoreProduct, surface: string, placement: string) {
  void recordOutboundClickEvent({
    eventName: "shop_link_click",
    productId: product.id,
    storeId: product.storeId,
    destinationType: "product_external_url",
    destinationUrl: product.externalUrl,
    surface,
    placement,
  }).catch(() => {
    /* never block navigation */
  });
}

function trackStoreWebsiteClick(store: Store, surface: string, placement: string) {
  void recordOutboundClickEvent({
    eventName: "store_website_click",
    storeId: store.id,
    destinationType: "store_website_url",
    destinationUrl: store.websiteUrl,
    surface,
    placement,
  }).catch(() => {
    /* never block navigation */
  });
}

export function StoreDetailView({
  store,
  projects,
  meetups = [],
  pendingVenueMeetups = [],
  isFollowed,
  isOwner,
  canClaim,
  claimBusy,
  claimPending = false,
  claimNotice = "",
  productBusy,
  productError,
  profileBusy,
  profileError,
  profileSuccess,
  canUpload = true,
  toggleStoreFollow,
  onClaimStore,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateProfile,
  setView,
  browseReturnTo = "/stores",
  onReport,
  onRespondVenueRequest,
  onMessageStore,
}: {
  store: Store;
  projects: Project[];
  meetups?: StitchingMeetup[];
  pendingVenueMeetups?: StitchingMeetup[];
  isFollowed: boolean;
  isOwner: boolean;
  canClaim: boolean;
  claimBusy?: boolean;
  claimPending?: boolean;
  claimNotice?: string;
  productBusy?: boolean;
  productError?: string;
  profileBusy?: boolean;
  profileError?: string;
  profileSuccess?: string;
  canUpload?: boolean;
  toggleStoreFollow: (storeId: string) => void;
  onClaimStore?: () => void;
  onCreateProduct?: (input: StoreProductInput, imageFile?: File | null) => Promise<void>;
  onUpdateProduct?: (productId: string, input: StoreProductInput, imageFile?: File | null) => Promise<void>;
  onDeleteProduct?: (productId: string) => void | Promise<void>;
  onUpdateProfile?: (input: StoreProfileInput, files?: { avatarFile?: File | null; coverFile?: File | null }) => Promise<void>;
  setView: (view: View) => void;
  /** Browse path (+ query) to restore city/ZIP/location context. */
  browseReturnTo?: string;
  onReport?: (input: ReportInput) => void | Promise<void>;
  onRespondVenueRequest?: (meetupId: string, approve: boolean) => void | Promise<void>;
  onMessageStore?: () => void;
}) {
  const navigate = useNavigate();
  const shopsBackPath = isStoresBrowseReturnPath(browseReturnTo) ? browseReturnTo : "/stores";
  const shopsBackLabel = shopsBackPath.includes("?") ? "Back to shops" : "All stores";
  const blankProduct = (): StoreProductInput => ({
    name: "",
    description: "",
    image: "",
    priceLabel: "",
    externalUrl: "",
    category: "canvas",
  });
  const avatarFileId = useId();
  const coverFileId = useId();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StoreProductInput>(blankProduct());
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImageError, setProductImageError] = useState("");
  const [existingProductImage, setExistingProductImage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileDraft, setProfileDraft] = useState<StoreProfileInput>(() => storeProfileFromStore(store));
  const [specialtiesText, setSpecialtiesText] = useState(store.specialties.join(", "));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [localProfileError, setLocalProfileError] = useState("");

  useEffect(() => {
    if (!showProfileForm) {
      setProfileDraft(storeProfileFromStore(store));
      setSpecialtiesText(store.specialties.join(", "));
    }
  }, [store, showProfileForm]);

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
      if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    };
  }, [avatarPreview, coverPreview]);

  function resetProductImage() {
    setProductImageFile(null);
    setProductImageError("");
    setExistingProductImage("");
  }

  function startCreate() {
    setShowProfileForm(false);
    setEditingId(null);
    setDraft(blankProduct());
    resetProductImage();
    setShowForm(true);
  }

  function startEdit(product: StoreProduct) {
    setShowProfileForm(false);
    setEditingId(product.id);
    const keepImage = product.image && !product.image.startsWith("/assets/") ? product.image : "";
    setDraft({
      name: product.name,
      description: product.description,
      image: keepImage,
      priceLabel: product.priceLabel,
      externalUrl: product.externalUrl,
      category: product.category || "canvas",
    });
    setProductImageFile(null);
    setProductImageError("");
    setExistingProductImage(product.image || "");
    setShowForm(true);
  }

  function startProfileEdit() {
    setShowForm(false);
    setEditingId(null);
    setProfileDraft(storeProfileFromStore(store));
    setSpecialtiesText(store.specialties.join(", "));
    setAvatarFile(null);
    setCoverFile(null);
    if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setAvatarPreview("");
    setCoverPreview("");
    setLocalProfileError("");
    setShowProfileForm(true);
  }

  function cancelProfileEdit() {
    setShowProfileForm(false);
    setAvatarFile(null);
    setCoverFile(null);
    if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setAvatarPreview("");
    setCoverPreview("");
    setLocalProfileError("");
  }

  function pickAvatar(file: File | null) {
    if (!file) return;
    if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setLocalProfileError("");
  }

  function pickCover(file: File | null) {
    if (!file) return;
    if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setLocalProfileError("");
  }

  async function submitProduct(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim() || productBusy) return;
    if (productImageError) return;
    try {
      if (editingId) {
        await onUpdateProduct?.(editingId, draft, productImageFile);
      } else {
        await onCreateProduct?.(draft, productImageFile);
      }
      setShowForm(false);
      setEditingId(null);
      setDraft(blankProduct());
      resetProductImage();
    } catch {
      /* parent sets productError */
    }
  }

  async function submitProfile(event: FormEvent) {
    event.preventDefault();
    if (profileBusy || !isOwner) return;
    const name = profileDraft.name.trim();
    if (!name) {
      setLocalProfileError("Shop name is required.");
      return;
    }
    if (!isLikelyUrl(profileDraft.websiteUrl || "")) {
      setLocalProfileError("Website URL must start with http:// or https://.");
      return;
    }
    const specialties = specialtiesText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    setLocalProfileError("");
    try {
      await onUpdateProfile?.(
        {
          ...profileDraft,
          name,
          description: profileDraft.description?.trim() || "",
          websiteUrl: profileDraft.websiteUrl?.trim() || "",
          location: profileDraft.location?.trim() || "",
          city: profileDraft.city?.trim() || "",
          avatar: profileDraft.avatar?.trim() || "",
          coverImage: profileDraft.coverImage?.trim() || "",
          specialties,
        },
        { avatarFile, coverFile },
      );
      setShowProfileForm(false);
      setAvatarFile(null);
      setCoverFile(null);
      if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
      if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
      setAvatarPreview("");
      setCoverPreview("");
    } catch {
      /* parent sets profileError */
    }
  }

  const shownAvatar = avatarPreview || profileDraft.avatar || store.avatar;
  const shownCover = coverPreview || profileDraft.coverImage || store.coverImage || store.avatar;
  const profileMessage = localProfileError || profileError || "";
  const maps = storeMapLinks(store);

  return (
    <section className="page">
      <div className="store-detail-hero panel">
        <img className="store-detail-cover" src={store.coverImage || store.avatar} alt="" />
        <div className="store-detail-head">
          <img src={store.avatar} alt="" />
          <div>
            <p className="eyebrow">{isOwner ? "Your shop" : "Store"}</p>
            <h1>{store.name}</h1>
            <p className="store-detail-meta">
              @{store.handle}
              {store.location ? ` · ${store.location}` : ""}
              {store.shipsNationwide ? " · Ships nationwide" : ""}
              {typeof store.followerCount === "number" ? ` · ${store.followerCount} followers` : ""}
            </p>
            {maps ? (
              <div className="store-maps-links" data-testid="store-maps-links">
                <span className="store-maps-label">
                  <MapPin size={15} aria-hidden /> Open in maps
                </span>
                <a
                  className="store-maps-link"
                  href={maps.apple}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${store.name} in Apple Maps`}
                >
                  Apple Maps <ExternalLink size={13} aria-hidden />
                </a>
                <a
                  className="store-maps-link"
                  href={maps.google}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${store.name} in Google Maps`}
                >
                  Google Maps <ExternalLink size={13} aria-hidden />
                </a>
              </div>
            ) : null}
            <p className="store-detail-desc">{store.description}</p>
            <div className="tag-row">
              {store.specialties.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="card-actions wrap store-detail-actions">
          {!isOwner ? (
            <button type="button" className={isFollowed ? "secondary selected" : "secondary"} onClick={() => toggleStoreFollow(store.id)}>
              {isFollowed ? "Following" : "Follow store"}
            </button>
          ) : null}
          {!isOwner && onMessageStore && store.ownerUserId ? (
            <button type="button" className="secondary" onClick={onMessageStore}>
              Message shop
            </button>
          ) : null}
          {canClaim && onClaimStore ? (
            <button type="button" className="primary" disabled={claimBusy || claimPending} onClick={() => onClaimStore()}>
              {claimBusy ? "Submitting…" : claimPending ? "Claim pending review" : "Request to claim shop"}
            </button>
          ) : null}
          {isOwner ? (
            <>
              <button type="button" className="secondary" onClick={startProfileEdit} disabled={profileBusy}>
                Edit shop profile
              </button>
              <button type="button" className="primary" onClick={startCreate}>
                <Plus size={16} /> Add product
              </button>
            </>
          ) : null}
          {store.websiteUrl ? (
            <a
              className="secondary"
              href={store.websiteUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackStoreWebsiteClick(store, "store_detail", "header_website")}
            >
              Visit website <ExternalLink size={14} />
            </a>
          ) : null}
          {!isOwner && onReport ? (
            <ReportControl targetType="store" targetId={store.id} targetLabel={store.name} onSubmit={onReport} />
          ) : null}
          <button type="button" className="secondary" onClick={() => navigate(shopsBackPath)}>
            {shopsBackLabel}
          </button>
        </div>
      </div>

      {claimNotice ? <p className="field-help success-text store-profile-banner">{claimNotice}</p> : null}
      {profileSuccess && !showProfileForm ? <p className="field-help success-text store-profile-banner">{profileSuccess}</p> : null}
      {isOwner ? <StoreOwnerAnalytics storeId={store.id} /> : null}

      {isOwner && showProfileForm ? (
        <form className="panel store-product-form store-profile-form" onSubmit={(event) => void submitProfile(event)}>
          <SectionTitle title="Edit shop profile" />
          <p className="field-help">These details appear on your public shop page. Only you can edit them.</p>

          <label>
            <span className="field-label">Shop name</span>
            <input
              required
              value={profileDraft.name}
              onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Canopy Canvas"
              maxLength={80}
              disabled={profileBusy}
            />
          </label>

          <label>
            <span className="field-label">Description</span>
            <textarea
              rows={4}
              value={profileDraft.description || ""}
              onChange={(event) => setProfileDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="Painted canvases, threads, and finishing for local stitchers."
              maxLength={1000}
              disabled={profileBusy}
            />
          </label>

          <label>
            <span className="field-label">Website</span>
            <input
              type="url"
              value={profileDraft.websiteUrl || ""}
              onChange={(event) => setProfileDraft((current) => ({ ...current, websiteUrl: event.target.value }))}
              placeholder="https://yourshop.com"
              disabled={profileBusy}
            />
          </label>

          <div className="form-grid-2">
            <label>
              <span className="field-label">Location label</span>
              <input
                value={profileDraft.location || ""}
                onChange={(event) => setProfileDraft((current) => ({ ...current, location: event.target.value }))}
                placeholder="Portland, OR"
                maxLength={120}
                disabled={profileBusy}
              />
            </label>
            <label>
              <span className="field-label">City</span>
              <input
                value={profileDraft.city || ""}
                onChange={(event) => setProfileDraft((current) => ({ ...current, city: event.target.value }))}
                placeholder="Portland"
                maxLength={80}
                disabled={profileBusy}
              />
            </label>
          </div>

          <label>
            <span className="field-label">Specialties</span>
            <input
              value={specialtiesText}
              onChange={(event) => setSpecialtiesText(event.target.value)}
              placeholder="painted canvases, finishing, threads"
              disabled={profileBusy}
            />
            <span className="field-help">Comma-separated tags (up to 10) shown on your public profile.</span>
          </label>

          <div className="store-profile-media">
            <div className="image-upload-field">
              <span className="field-label">Avatar</span>
              <div className="image-upload-preview compact store-avatar-preview">
                <img src={shownAvatar} alt="" />
                <div className="card-actions wrap">
                  <label className="secondary file-button" htmlFor={avatarFileId}>
                    {canUpload ? "Upload avatar" : "Choose avatar"}
                  </label>
                </div>
              </div>
              <input
                id={avatarFileId}
                type="file"
                accept="image/*"
                className="visually-hidden"
                disabled={!canUpload || profileBusy}
                onChange={(event) => {
                  pickAvatar(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
              <label>
                <span className="field-label">Or avatar URL</span>
                <input
                  value={profileDraft.avatar || ""}
                  onChange={(event) => {
                    setAvatarFile(null);
                    if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
                    setAvatarPreview("");
                    setProfileDraft((current) => ({ ...current, avatar: event.target.value }));
                  }}
                  placeholder="https://…"
                  disabled={profileBusy}
                />
              </label>
            </div>

            <div className="image-upload-field">
              <span className="field-label">Cover image</span>
              <div className="image-upload-preview compact store-cover-preview">
                <img src={shownCover} alt="" />
                <div className="card-actions wrap">
                  <label className="secondary file-button" htmlFor={coverFileId}>
                    {canUpload ? "Upload cover" : "Choose cover"}
                  </label>
                </div>
              </div>
              <input
                id={coverFileId}
                type="file"
                accept="image/*"
                className="visually-hidden"
                disabled={!canUpload || profileBusy}
                onChange={(event) => {
                  pickCover(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
              <label>
                <span className="field-label">Or cover URL</span>
                <input
                  value={profileDraft.coverImage || ""}
                  onChange={(event) => {
                    setCoverFile(null);
                    if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
                    setCoverPreview("");
                    setProfileDraft((current) => ({ ...current, coverImage: event.target.value }));
                  }}
                  placeholder="https://…"
                  disabled={profileBusy}
                />
              </label>
            </div>
          </div>

          {profileMessage ? <p className="field-help error-text">{profileMessage}</p> : null}
          {profileSuccess && showProfileForm ? <p className="field-help success-text">{profileSuccess}</p> : null}

          <div className="card-actions wrap">
            <button type="submit" className="primary" disabled={profileBusy || !profileDraft.name.trim()}>
              {profileBusy ? "Saving…" : "Save shop profile"}
            </button>
            <button type="button" className="secondary" onClick={cancelProfileEdit} disabled={profileBusy}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {isOwner && showForm ? (
        <form className="panel store-product-form" onSubmit={(event) => void submitProduct(event)}>
          <SectionTitle title={editingId ? "Edit catalog item" : "New catalog item"} />
          <p className="field-help">Link-out only — price is a label, shoppers leave Needlepoint to buy.</p>
          <label>
            <span className="field-label">Name</span>
            <input
              required
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Persimmon Garden pillow canvas"
            />
          </label>
          <label>
            <span className="field-label">Description</span>
            <textarea
              rows={3}
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="18 mesh painted canvas"
            />
          </label>
          <div className="form-grid-2">
            <label>
              <span className="field-label">Price label</span>
              <input
                value={draft.priceLabel}
                onChange={(event) => setDraft((current) => ({ ...current, priceLabel: event.target.value }))}
                placeholder="from $86"
              />
            </label>
            <label>
              <span className="field-label">Category</span>
              <select
                value={draft.category}
                onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
              >
                <option value="canvas">Canvas</option>
                <option value="thread">Thread</option>
                <option value="kit">Kit</option>
                <option value="finishing">Finishing</option>
                <option value="class">Class</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
          <label>
            <span className="field-label">Shop link (external URL)</span>
            <input
              type="url"
              value={draft.externalUrl}
              onChange={(event) => setDraft((current) => ({ ...current, externalUrl: event.target.value }))}
              placeholder="https://yourshop.com/product"
            />
          </label>
          <ImageFilePicker
            label="Product photo (optional)"
            compact
            canUpload={canUpload}
            disabled={Boolean(productBusy)}
            file={productImageFile}
            onFileChange={setProductImageFile}
            urlValue={draft.image || ""}
            onUrlChange={(image) => setDraft((current) => ({ ...current, image }))}
            existingPreview={existingProductImage}
            onClearExisting={() => setExistingProductImage("")}
            error={productImageError}
            onErrorChange={setProductImageError}
            showUrlField={false}
            helpText="JPG, PNG, WebP, HEIC, or GIF · up to 8MB"
          />
          {productError ? <p className="field-help error-text">{productError}</p> : null}
          <div className="card-actions wrap">
            <button type="submit" className="primary" disabled={productBusy || !draft.name.trim() || Boolean(productImageError)}>
              {productBusy ? "Saving…" : editingId ? "Save changes" : "Add to catalog"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setDraft(blankProduct());
                resetProductImage();
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {store.products.length > 0 ? (
        <>
          <SectionTitle title="Catalog" />
          <div className="product-grid">
            {store.products.map((product) => (
              <article key={product.id} className="product-card panel">
                <img src={product.image} alt={product.name} />
                <strong>{product.name}</strong>
                <p className="product-card-desc">{product.description}</p>
                <div className="metric-row product-card-meta">
                  <span>{product.priceLabel || product.category}</span>
                  {product.externalUrl ? (
                    <a
                      href={product.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => trackShopLinkClick(product, "store_detail", "catalog_card")}
                    >
                      Shop link <ExternalLink size={13} />
                    </a>
                  ) : null}
                </div>
                {isOwner ? (
                  <div className="card-actions wrap product-owner-actions">
                    <button type="button" className="secondary" onClick={() => startEdit(product)} disabled={productBusy}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="secondary danger-btn"
                      disabled={productBusy}
                      onClick={() => {
                        if (window.confirm(`Remove “${product.name}” from the catalog?`)) {
                          void onDeleteProduct?.(product.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          variant="inline"
          minHeight={160}
          title={isOwner ? uiCopy.shopDetail.catalogEmpty.owner.title : uiCopy.shopDetail.catalogEmpty.visitor.title}
          body={isOwner ? uiCopy.shopDetail.catalogEmpty.owner.body : uiCopy.shopDetail.catalogEmpty.visitor.body}
          action={isOwner ? uiCopy.shopDetail.catalogEmpty.owner.cta : undefined}
          onAction={
            isOwner
              ? () => {
                  setShowForm(true);
                  setEditingId(null);
                  setDraft(blankProduct());
                  resetProductImage();
                }
              : undefined
          }
        />
      )}

      {isOwner && pendingVenueMeetups.length > 0 ? (
              <div className="panel store-meetup-pending">
                <SectionTitle title="Venue requests" />
                <p className="field-help">Community hosts asked to list your shop as the meetup location.</p>
                <div className="store-meetup-list">
                  {pendingVenueMeetups.map((meetup) => (
                    <div key={meetup.id} className="panel store-meetup-card">
                      <strong>{meetup.title}</strong>
                      <span>{formatMeetupWhen(meetup)}</span>
                      <span>{formatMeetupPlace(meetup)}</span>
                      <div className="card-actions wrap">
                        <button className="secondary" type="button" onClick={() => setView({ name: "meetup", id: meetup.id })}>
                          View
                        </button>
                        <button
                          className="primary"
                          type="button"
                          onClick={() => void onRespondVenueRequest?.(meetup.id, true)}
                        >
                          Approve shop link
                        </button>
                        <button
                          className="secondary"
                          type="button"
                          onClick={() => void onRespondVenueRequest?.(meetup.id, false)}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {meetups.length > 0 ? (
              <div className="panel">
                <SectionTitle title="Upcoming at this shop" />
                <div className="store-meetup-list">
                  {meetups.map((meetup) => (
                    <button
                      key={meetup.id}
                      type="button"
                      className="panel store-meetup-card"
                      onClick={() => setView({ name: "meetup", id: meetup.id })}
                    >
                      <strong>{meetup.title}</strong>
                      <span>{formatMeetupWhen(meetup)}</span>
                      <span>{formatMeetupPlace(meetup)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

      <SectionTitle title="Projects available here" />
      {projects.length ? (
        <div className="visual-grid">
          {projects.map((project) => (
            <button key={project.id} type="button" className="ig-grid-cell" onClick={() => setView({ name: "project", id: project.id })}>
              <img src={project.image} alt={project.title} />
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          variant="inline"
          minHeight={140}
          title={isOwner ? uiCopy.shopDetail.projectsEmpty.owner.title : uiCopy.shopDetail.projectsEmpty.visitor.title}
          body={isOwner ? uiCopy.shopDetail.projectsEmpty.owner.body : uiCopy.shopDetail.projectsEmpty.visitor.body}
        />
      )}
    </section>
  );
}

export { StoreDetailView as StoreDetailPage };
