import { useId, type FormEvent } from "react";
import { Plus } from "lucide-react";
import type { Difficulty, Project, Status, Store } from "../types";
import type { DraftProject, View } from "../appModel";
import { difficultyOptions, statusOptions, visibilityHelp, visibilityLabel } from "../appModel";
import { EmptyState, Field, SectionHeader, SectionTitle, Skeleton } from "../components/ui";
import { StoreSearchMultiSelect } from "../components/StoreSearchMultiSelect";
import { IMAGE_ACCEPT, MEDIA_HELP, VIDEO_ACCEPT } from "../api/images";
import { uiCopy } from "../lib/uiCopy";

export function JournalView({
  draft,
  setDraft,
  submitProject,
  myProjects,
  setView,
  canUpload,
  uploadBusy,
  uploadError,
  imagePreview,
  onPickImage,
  onClearImage,
  videoPreview,
  onPickVideo,
  onClearVideo,
  stores,
  journalLoading = false,
}: {
  draft: DraftProject;
  setDraft: (draft: DraftProject) => void;
  submitProject: (event: FormEvent<HTMLFormElement>) => void;
  myProjects: Project[];
  setView: (view: View) => void;
  canUpload: boolean;
  uploadBusy: boolean;
  uploadError: string;
  imagePreview: string;
  onPickImage: (file: File | null) => void;
  onClearImage: () => void;
  videoPreview: string;
  onPickVideo: (file: File | null) => void;
  onClearVideo: () => void;
  stores: Store[];
  /** True until first project hydrate resolves (online boot). */
  journalLoading?: boolean;
}) {
  const photoInputId = useId();
  const videoInputId = useId();
  const photoPreview = imagePreview || draft.image;
  const vidPreview = videoPreview || draft.videoUrl;

  return (
    <section className="page">
      <SectionHeader eyebrow="Project journal" title="Create a project entry" />
      <div className="editor-layout">
        <form className="panel form-grid" onSubmit={submitProject} aria-busy={uploadBusy || undefined}>
          <Field label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder="Monogram clutch canvas" required />

          <div className="full-field image-upload-field" data-testid="journal-photo-upload">
            <span className="field-label">Photo</span>
            {photoPreview ? (
              <div className="image-upload-preview">
                <img src={photoPreview} alt="Project preview" />
                <div className="card-actions wrap">
                  <label className="secondary file-button" htmlFor={photoInputId}>
                    Replace photo
                  </label>
                  <button className="secondary" type="button" onClick={onClearImage}>
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="image-upload-dropzone" htmlFor={photoInputId}>
                <span className="action-card-icon">
                  <Plus size={18} />
                </span>
                <strong>{canUpload ? "Upload a photo" : "Sign in to upload"}</strong>
                <span>{MEDIA_HELP.photo}</span>
              </label>
            )}
            <input
              id={photoInputId}
              type="file"
              accept={IMAGE_ACCEPT}
              className="visually-hidden"
              disabled={!canUpload || uploadBusy}
              onChange={(event) => {
                onPickImage(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
          </div>

          <div className="full-field image-upload-field" data-testid="journal-video-upload">
            <span className="field-label">Video (optional)</span>
            {vidPreview ? (
              <div className="image-upload-preview video-upload-preview">
                <video src={vidPreview} controls playsInline preload="metadata" />
                <div className="card-actions wrap">
                  <label className="secondary file-button" htmlFor={videoInputId}>
                    Replace video
                  </label>
                  <button className="secondary" type="button" onClick={onClearVideo}>
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="image-upload-dropzone" htmlFor={videoInputId}>
                <span className="action-card-icon">
                  <Plus size={18} />
                </span>
                <strong>{canUpload ? "Upload a video" : "Sign in to upload"}</strong>
                <span>{MEDIA_HELP.video}</span>
              </label>
            )}
            <input
              id={videoInputId}
              type="file"
              accept={VIDEO_ACCEPT}
              className="visually-hidden"
              disabled={!canUpload || uploadBusy}
              onChange={(event) => {
                onPickVideo(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
            <p className="field-help">Upload from your camera roll — no links needed. Limits match Instagram-style posts.</p>
          </div>

          {uploadBusy && (
            <p className="field-help full-field" aria-live="polite">
              Uploading media…
            </p>
          )}
          {uploadError ? (
            <p className="field-help field-error full-field" role="alert">
              {uploadError}
            </p>
          ) : null}

          <label htmlFor="project-status">
            <span className="label-text">Status</span>
            <select id="project-status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Status })}>
              {statusOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label htmlFor="project-difficulty">
            <span className="label-text">Difficulty</span>
            <select
              id="project-difficulty"
              value={draft.difficulty}
              onChange={(event) => setDraft({ ...draft, difficulty: event.target.value as Difficulty })}
            >
              {difficultyOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <Field label="Category" value={draft.category} onChange={(category) => setDraft({ ...draft, category })} placeholder="ornaments, florals…" />
          <Field label="Canvas" value={draft.canvasType} onChange={(canvasType) => setDraft({ ...draft, canvasType })} placeholder="18 mesh" />
          <Field label="Materials" value={draft.materials} onChange={(materials) => setDraft({ ...draft, materials })} placeholder="Silk, wool…" />
          <Field label="Stitch types" value={draft.stitchTypes} onChange={(stitchTypes) => setDraft({ ...draft, stitchTypes })} placeholder="Basketweave…" />
          <Field label="Colors" value={draft.colors} onChange={(colors) => setDraft({ ...draft, colors })} placeholder="Coral, sage…" />
          <Field label="Pattern source" value={draft.patternSource} onChange={(patternSource) => setDraft({ ...draft, patternSource })} />
          <label htmlFor="project-visibility">
            <span className="label-text">Visibility</span>
            <select
              id="project-visibility"
              value={draft.visibility}
              onChange={(event) => setDraft({ ...draft, visibility: event.target.value as "public" | "private" })}
            >
              <option value="public">{visibilityLabel("public")}</option>
              <option value="private">{visibilityLabel("private")}</option>
            </select>
            <p className="field-help">{visibilityHelp(draft.visibility)}</p>
          </label>
          <label className="full-field" htmlFor="project-notes">
            <span className="label-text">Notes</span>
            <textarea
              id="project-notes"
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              placeholder="What are you stitching, what are you testing, and what should future you remember?"
            />
          </label>
          {stores.length > 0 && (
            <StoreSearchMultiSelect
              stores={stores}
              selectedIds={draft.storeIds}
              onChange={(storeIds) => {
                const allowedProductIds = new Set(
                  stores.filter((s) => storeIds.includes(s.id)).flatMap((s) => (s.products ?? []).map((p) => p.id)),
                );
                setDraft({
                  ...draft,
                  storeIds,
                  productIds: draft.productIds.filter((id) => allowedProductIds.has(id)),
                });
              }}
              testId="journal-store-search"
            />
          )}
          {draft.storeIds.length > 0 ? (
            <div className="full-field product-picker" data-testid="journal-shop-look-products">
              <span className="field-label">Shop the look products (optional)</span>
              <p className="field-help">Optional specific items. Leave empty to sample each shop’s catalog.</p>
              <div className="store-picker-options product-picker-options">
                {stores
                  .filter((store) => draft.storeIds.includes(store.id))
                  .flatMap((store) =>
                    (store.products ?? []).map((product) => {
                      const checked = draft.productIds.includes(product.id);
                      return (
                        <label key={product.id} className="checkbox-field">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setDraft({
                                ...draft,
                                productIds: checked
                                  ? draft.productIds.filter((id) => id !== product.id)
                                  : [...draft.productIds, product.id],
                              })
                            }
                          />
                          <span>
                            {product.name}
                            <small> · @{store.handle}</small>
                          </span>
                        </label>
                      );
                    }),
                  )}
              </div>
            </div>
          ) : null}
          <button className="primary full-field" type="submit" disabled={!draft.title.trim() || uploadBusy}>
            <Plus size={18} /> {uploadBusy ? "Saving…" : "Save project"}
          </button>
        </form>
        <div className="panel">
          <SectionTitle title="Your journal" />
          {journalLoading ? (
            <div className="journal-list-skeleton" aria-busy="true" aria-label={uiCopy.journal.loading} role="status">
              <p className="field-help">{uiCopy.journal.loading}</p>
              {[0, 1, 2].map((index) => (
                <div className="mini-update mini-update-skeleton" key={index} aria-hidden="true">
                  <Skeleton className="journal-skel-thumb" width={48} height={48} radius={8} />
                  <div className="journal-skel-meta">
                    <Skeleton width="72%" height={12} />
                    <Skeleton width="48%" height={10} />
                  </div>
                </div>
              ))}
            </div>
          ) : myProjects.length > 0 ? (
            myProjects.map((project) => (
              <button className="mini-update" key={project.id} type="button" onClick={() => setView({ name: "project", id: project.id })}>
                <img src={project.image} alt="" />
                <span>
                  <strong>
                    {project.title}
                    {project.visibility === "private" ? <span className="visibility-badge private">Private</span> : null}
                  </strong>
                  <small>
                    {project.status} · {project.progress}% · {visibilityLabel(project.visibility)}
                  </small>
                </span>
              </button>
            ))
          ) : (
            <EmptyState
              variant="compact"
              minHeight={160}
              title={uiCopy.journal.empty.title}
              body={uiCopy.journal.empty.body}
            />
          )}
        </div>
      </div>
    </section>
  );
}

export { JournalView as JournalPage };
