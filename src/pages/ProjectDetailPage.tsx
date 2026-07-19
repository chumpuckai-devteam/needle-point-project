import { FormEvent, useEffect, useId, useState } from "react";
import { Bookmark, ExternalLink, Heart, Share2, Store as StoreIcon, UserRound } from "lucide-react";
import type { Creator, Difficulty, Project, Status, Store } from "../types";
import type { DraftProject, View } from "../appModel";
import { difficultyOptions, statusOptions, visibilityHelp, visibilityLabel } from "../appModel";
import { Field, Meta, SectionTitle } from "../components/ui";

export function ProjectDetail(props: {
  project: Project;
  creator: Creator;
  isOwner: boolean;
  canUpload: boolean;
  followedCreators: string[];
  updateNote: string;
  updateMilestone: string;
  commentText: string;
  updateBusy: boolean;
  updateError: string;
  updateImagePreview: string;
  updateImageUrl: string;
  setUpdateNote: (value: string) => void;
  setUpdateMilestone: (value: string) => void;
  setCommentText: (value: string) => void;
  setUpdateImageUrl: (value: string) => void;
  onPickUpdateImage: (file: File | null) => void;
  onClearUpdateImage: () => void;
  addProgressUpdate: (id: string) => void;
  addComment: (id: string) => void;
  toggleFollow: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  shareProject: (id: string) => void;
  saveProjectEdits: (id: string, draft: DraftProject & { progress: number }, imageFile?: File | null) => Promise<void>;
  stores: Store[];
  projectStores: Store[];
  setView: (view: View) => void;
}) {
  const isFollowed = props.followedCreators.includes(props.creator.id);
  const [editing, setEditing] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [editDraft, setEditDraft] = useState<DraftProject & { progress: number }>(() => projectToDraft(props.project));
  const [editPreview, setEditPreview] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const editFileId = useId();
  const updateFileId = useId();
  const updatePreview = props.updateImagePreview || props.updateImageUrl || "";
  const isPrivate = props.project.visibility === "private";

  useEffect(() => {
    if (!editing) setEditDraft(projectToDraft(props.project));
  }, [props.project, editing]);

  function pickEditImage(file: File | null) {
    if (!file) return;
    if (editPreview.startsWith("blob:")) URL.revokeObjectURL(editPreview);
    setEditFile(file);
    setEditPreview(URL.createObjectURL(file));
    setEditDraft((current) => ({ ...current, image: "" }));
  }

  async function onSaveEdits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editDraft.title.trim() || editBusy) return;
    setEditBusy(true);
    setEditError("");
    try {
      await props.saveProjectEdits(props.project.id, { ...editDraft }, editFile);
      if (editPreview.startsWith("blob:")) URL.revokeObjectURL(editPreview);
      setEditFile(null);
      setEditPreview("");
      setEditing(false);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Could not save project");
    } finally {
      setEditBusy(false);
    }
  }

  return (
    <section className="page">
      <div className="detail-layout">
        <div>
          {props.project.videoUrl ? (
            <video className="detail-image" controls playsInline preload="metadata" poster={props.project.image || undefined} src={props.project.videoUrl} />
          ) : props.project.image ? (
            <img className="detail-image" src={props.project.image} alt={props.project.title} />
          ) : (
            <div className="detail-image text-detail-card"><span>{props.project.title}</span></div>
          )}
          <div className="panel">
            <SectionTitle title="Progress updates" />
            {props.isOwner ? (
              <div className="update-composer">
                <label htmlFor="update-milestone">
                  <span className="label-text">Milestone</span>
                  <input
                    id="update-milestone"
                    value={props.updateMilestone}
                    onChange={(event) => props.setUpdateMilestone(event.target.value)}
                    placeholder="Border done, thread swap…"
                  />
                </label>
                <textarea
                  value={props.updateNote}
                  onChange={(event) => props.setUpdateNote(event.target.value)}
                  placeholder="Log a stitch choice, milestone, or thread swap..."
                />
                <div className="image-upload-field">
                  <span className="field-label">Update photo</span>
                  {updatePreview ? (
                    <div className="image-upload-preview compact">
                      <img src={updatePreview} alt="Update preview" />
                      <div className="card-actions wrap">
                        <label className="secondary file-button" htmlFor={updateFileId}>
                          Replace photo
                        </label>
                        <button className="secondary" type="button" onClick={props.onClearUpdateImage}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="image-upload-dropzone compact" htmlFor={updateFileId}>
                      <strong>{props.canUpload ? "Upload a photo" : "Add a photo URL"}</strong>
                      <span>Optional — JPG/PNG/WebP up to 8MB</span>
                    </label>
                  )}
                  <input
                    id={updateFileId}
                    type="file"
                    accept="image/*"
                    className="visually-hidden"
                    disabled={!props.canUpload || props.updateBusy}
                    onChange={(event) => {
                      props.onPickUpdateImage(event.target.files?.[0] ?? null);
                      event.target.value = "";
                    }}
                  />
                  <Field label="Or image URL" value={props.updateImageUrl} onChange={props.setUpdateImageUrl} placeholder="https://…" />
                </div>
                {props.updateError && (
                  <p className="field-help" style={{ color: "#8a2f2f" }}>
                    {props.updateError}
                  </p>
                )}
                <button
                  className="primary"
                  type="button"
                  disabled={props.updateBusy || (!props.updateNote.trim() && !updatePreview)}
                  onClick={() => props.addProgressUpdate(props.project.id)}
                >
                  {props.updateBusy ? "Saving…" : "Add update"}
                </button>
              </div>
            ) : (
              <p className="field-help">Only the project owner can post progress updates.</p>
            )}
            {props.project.updates.map((update) => (
              <article className="timeline" key={update.id}>
                <img src={update.image || props.project.image} alt="" />
                <div>
                  <strong>{update.milestone}</strong>
                  <small>{update.date}</small>
                  <p>{update.note}</p>
                  {update.comments.map((comment) => (
                    <p className="comment" key={comment.id}>
                      <b>{comment.author}:</b> {comment.body}
                    </p>
                  ))}
                </div>
              </article>
            ))}
            <div className="comment-box">
              <input value={props.commentText} onChange={(event) => props.setCommentText(event.target.value)} placeholder="Comment on the latest update" />
              <button className="secondary" type="button" onClick={() => props.addComment(props.project.id)}>
                Comment
              </button>
            </div>
          </div>
        </div>
        <aside className="panel sticky">
          <div className="detail-status-row">
            <p className="eyebrow">{props.project.status}</p>
            <span className={`visibility-badge ${isPrivate ? "private" : "public"}`}>{visibilityLabel(props.project.visibility)}</span>
          </div>
          <h1>{props.project.title}</h1>
          {props.isOwner && isPrivate ? (
            <div className="visibility-callout private" role="note">
              <strong>Private project</strong>
              <p>{visibilityHelp("private")}</p>
            </div>
          ) : null}
          {props.isOwner && !isPrivate ? (
            <div className="visibility-callout public" role="note">
              <strong>Public project</strong>
              <p>{visibilityHelp("public")}</p>
            </div>
          ) : null}
          <button className="profile-chip" type="button" onClick={() => props.setView({ name: "profile", id: props.creator.id })}>
            <img src={props.creator.avatar} alt="" />
            <span>
              {props.creator.name}
              <small>@{props.creator.handle}</small>
            </span>
          </button>
          {props.isOwner && !editing && (
            <div className="card-actions wrap" style={{ marginBottom: 12 }}>
              <button className="secondary" type="button" onClick={() => setEditing(true)}>
                Edit project
              </button>
              <button className="secondary" type="button" onClick={() => props.shareProject(props.project.id)}>
                <Share2 size={16} /> {isPrivate ? "Copy private link" : "Share"}
              </button>
            </div>
          )}
          {editing ? (
            <form className="form-grid" onSubmit={(event) => void onSaveEdits(event)}>
              <Field label="Title" value={editDraft.title} onChange={(title) => setEditDraft({ ...editDraft, title })} required className="full-field" />
              <div className="full-field image-upload-field">
                <span className="field-label">Cover photo</span>
                <div className="image-upload-preview compact">
                  <img src={editPreview || editDraft.image || props.project.image} alt="" />
                  <div className="card-actions wrap">
                    <label className="secondary file-button" htmlFor={editFileId}>
                      Upload photo
                    </label>
                  </div>
                </div>
                <input
                  id={editFileId}
                  type="file"
                  accept="image/*"
                  className="visually-hidden"
                  disabled={!props.canUpload || editBusy}
                  onChange={(event) => {
                    pickEditImage(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
                <Field label="Or image URL" value={editDraft.image} onChange={(image) => setEditDraft({ ...editDraft, image })} placeholder="https://…" />
              </div>
              <label htmlFor="edit-status">
                <span className="label-text">Status</span>
                <select id="edit-status" value={editDraft.status} onChange={(event) => setEditDraft({ ...editDraft, status: event.target.value as Status })}>
                  {statusOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label htmlFor="edit-difficulty">
                <span className="label-text">Difficulty</span>
                <select
                  id="edit-difficulty"
                  value={editDraft.difficulty}
                  onChange={(event) => setEditDraft({ ...editDraft, difficulty: event.target.value as Difficulty })}
                >
                  {difficultyOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <Field label="Category" value={editDraft.category} onChange={(category) => setEditDraft({ ...editDraft, category })} />
              <Field label="Canvas type" value={editDraft.canvasType} onChange={(canvasType) => setEditDraft({ ...editDraft, canvasType })} />
              <Field label="Materials" value={editDraft.materials} onChange={(materials) => setEditDraft({ ...editDraft, materials })} className="full-field" />
              <Field label="Stitch types" value={editDraft.stitchTypes} onChange={(stitchTypes) => setEditDraft({ ...editDraft, stitchTypes })} className="full-field" />
              <Field label="Colors" value={editDraft.colors} onChange={(colors) => setEditDraft({ ...editDraft, colors })} className="full-field" />
              <Field label="Pattern source" value={editDraft.patternSource} onChange={(patternSource) => setEditDraft({ ...editDraft, patternSource })} />
              <Field label="Pattern URL" value={editDraft.patternUrl} onChange={(patternUrl) => setEditDraft({ ...editDraft, patternUrl })} />
              <label htmlFor="edit-visibility" className="full-field">
                <span className="label-text">Visibility</span>
                <select
                  id="edit-visibility"
                  value={editDraft.visibility}
                  onChange={(event) => setEditDraft({ ...editDraft, visibility: event.target.value as "public" | "private" })}
                >
                  <option value="public">Public — anyone can view</option>
                  <option value="private">Private — only you</option>
                </select>
                <span className="field-help">{visibilityHelp(editDraft.visibility)}</span>
              </label>
              <label htmlFor="edit-progress">
                <span className="label-text">Progress %</span>
                <input
                  id="edit-progress"
                  type="number"
                  min={0}
                  max={100}
                  value={editDraft.progress}
                  onChange={(event) => setEditDraft({ ...editDraft, progress: Number(event.target.value) || 0 })}
                />
              </label>
              <label className="full-field" htmlFor="edit-notes">
                <span className="label-text">Notes</span>
                <textarea id="edit-notes" value={editDraft.notes} onChange={(event) => setEditDraft({ ...editDraft, notes: event.target.value })} rows={4} />
              </label>
              {props.stores.length > 0 && (
                <div className="full-field store-picker">
                  <span className="field-label">Available at (stores)</span>
                  <div className="store-picker-options">
                    {props.stores.map((store) => {
                      const checked = editDraft.storeIds.includes(store.id);
                      return (
                        <label key={store.id} className="checkbox-field">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setEditDraft((current) => ({
                                ...current,
                                storeIds: checked ? current.storeIds.filter((id) => id !== store.id) : [...current.storeIds, store.id],
                              }))
                            }
                          />
                          <span>
                            {store.name}
                            <small> @{store.handle}</small>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              {editError && (
                <p className="full-field field-help" style={{ color: "#8a2f2f" }}>
                  {editError}
                </p>
              )}
              <div className="full-field card-actions wrap">
                <button className="primary" type="submit" disabled={editBusy || !editDraft.title.trim()}>
                  {editBusy ? "Saving…" : "Save changes"}
                </button>
                <button
                  className="secondary"
                  type="button"
                  disabled={editBusy}
                  onClick={() => {
                    if (editPreview.startsWith("blob:")) URL.revokeObjectURL(editPreview);
                    setEditFile(null);
                    setEditPreview("");
                    setEditing(false);
                    setEditError("");
                    setEditDraft(projectToDraft(props.project));
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <p>{props.project.notes}</p>
              <div className="progress large">
                <span style={{ width: `${props.project.progress}%` }} />
              </div>
              <div className="card-actions wrap">
                <button type="button" onClick={() => props.toggleLike(props.project.id)} className={props.project.isLiked ? "selected" : ""}>
                  <Heart size={17} /> {props.project.likes}
                </button>
                <button type="button" onClick={() => props.toggleSave(props.project.id)} className={props.project.isSaved ? "selected" : ""}>
                  <Bookmark size={17} /> Save
                </button>
                {!props.isOwner && (
                  <button type="button" onClick={() => props.toggleFollow(props.creator.id)} className={isFollowed ? "selected" : ""}>
                    <UserRound size={17} /> {isFollowed ? "Following" : "Follow"}
                  </button>
                )}
                {!props.isOwner && (
                  <button type="button" onClick={() => props.shareProject(props.project.id)} aria-label="Share">
                    <Share2 size={17} /> Share
                  </button>
                )}
              </div>
              <Meta label="Difficulty" value={props.project.difficulty} />
              <Meta label="Canvas" value={props.project.canvasType} />
              <Meta label="Materials" value={props.project.materials.join(", ") || "—"} />
              <Meta label="Stitches" value={props.project.stitchTypes.join(", ") || "—"} />
              <Meta label="Colors" value={props.project.colors.join(", ") || "—"} />
              <Meta label="Visibility" value={visibilityLabel(props.project.visibility)} />
              {props.projectStores.length > 0 && (
                <div className="available-at">
                  <Meta label="Available at" value="" />
                  <div className="store-chip-list">
                    {props.projectStores.map((store) => (
                      <button
                        key={store.id}
                        type="button"
                        className="store-chip"
                        onClick={() => props.setView({ name: "store", handle: store.handle })}
                      >
                        <StoreIcon size={14} />
                        {store.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {props.projectStores.some((store) => store.products.length > 0) && (
                <div className="shop-the-look">
                  <SectionTitle title="Shop the look" />
                  <p className="field-help">Link-outs from shops tagged on this project. No checkout on Needlepoint.</p>
                  <div className="product-grid shop-look-grid">
                    {props.projectStores.flatMap((store) =>
                      store.products.slice(0, 3).map((product) => (
                        <article key={`${store.id}-${product.id}`} className="product-card panel shop-look-card">
                          <img src={product.image} alt={product.name} />
                          <strong>{product.name}</strong>
                          <p className="shop-look-store">@{store.handle}</p>
                          <div className="metric-row product-card-meta">
                            <span>{product.priceLabel || product.category}</span>
                            {product.externalUrl ? (
                              <a href={product.externalUrl} target="_blank" rel="noreferrer">
                                Shop <ExternalLink size={13} />
                              </a>
                            ) : null}
                          </div>
                        </article>
                      )),
                    )}
                  </div>
                </div>
              )}
              <a className="external" href={props.project.patternUrl} target="_blank" rel="noreferrer">
                Pattern source: {props.project.patternSource} <ExternalLink size={15} />
              </a>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

function projectToDraft(project: Project): DraftProject & { progress: number } {
  return {
    title: project.title,
    image: project.image.startsWith("http") ? project.image : project.image,
    videoUrl: project.videoUrl ?? "",
    status: project.status,
    difficulty: project.difficulty,
    category: project.category,
    canvasType: project.canvasType,
    materials: project.materials.join(", "),
    stitchTypes: project.stitchTypes.join(", "),
    colors: project.colors.join(", "),
    notes: project.notes,
    patternSource: project.patternSource,
    patternUrl: project.patternUrl,
    visibility: project.visibility,
    storeIds: project.storeIds ?? [],
    progress: project.progress,
  };
}

export { ProjectDetail as ProjectDetailPage };
