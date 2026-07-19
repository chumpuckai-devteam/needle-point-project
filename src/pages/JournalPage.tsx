import { useId, type FormEvent } from "react";
import { Plus } from "lucide-react";
import type { Difficulty, Project, Status, Store } from "../types";
import type { DraftProject, View } from "../appModel";
import { difficultyOptions, statusOptions, visibilityHelp, visibilityLabel } from "../appModel";
import { EmptyState, Field, SectionHeader, SectionTitle } from "../components/ui";

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
  stores,
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
  stores: Store[];
}) {
  const fileInputId = useId();
  const preview = imagePreview || draft.image;

  return (
    <section className="page">
      <SectionHeader eyebrow="Project journal" title="Create a project entry" />
      <div className="editor-layout">
        <form className="panel form-grid" onSubmit={submitProject}>
          <Field label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder="Monogram clutch canvas" required />
          <div className="full-field image-upload-field">
            <span className="field-label">Project photo</span>
            {preview ? (
              <div className="image-upload-preview">
                <img src={preview} alt="Project preview" />
                <div className="card-actions wrap">
                  <label className="secondary file-button" htmlFor={fileInputId}>
                    Replace photo
                  </label>
                  <button className="secondary" type="button" onClick={onClearImage}>
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="image-upload-dropzone" htmlFor={fileInputId}>
                <span className="action-card-icon">
                  <Plus size={18} />
                </span>
                <strong>{canUpload ? "Upload a photo" : "Add a photo URL"}</strong>
                <span>{canUpload ? "JPG, PNG, or WebP up to 8MB. You can also paste a URL below." : "Sign in with Supabase to upload files, or paste a URL."}</span>
              </label>
            )}
            <input
              id={fileInputId}
              type="file"
              accept="image/*"
              className="visually-hidden"
              disabled={!canUpload || uploadBusy}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                onPickImage(file);
                event.target.value = "";
              }}
            />
            <Field label="Or image URL" value={draft.image} onChange={(image) => setDraft({ ...draft, image })} placeholder="https://…" />
            <Field label="Video URL (optional)" value={draft.videoUrl} onChange={(videoUrl) => setDraft({ ...draft, videoUrl })} placeholder="https://…/clip.mp4" />
            {uploadBusy && <p className="field-help">Uploading photo…</p>}
            {uploadError && (
              <p className="field-help" style={{ color: "#8a2f2f" }}>
                {uploadError}
              </p>
            )}
          </div>
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
            <select id="project-difficulty" value={draft.difficulty} onChange={(event) => setDraft({ ...draft, difficulty: event.target.value as Difficulty })}>
              {difficultyOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <Field label="Category" value={draft.category} onChange={(category) => setDraft({ ...draft, category })} />
          <Field label="Canvas type" value={draft.canvasType} onChange={(canvasType) => setDraft({ ...draft, canvasType })} />
          <Field label="Materials" value={draft.materials} onChange={(materials) => setDraft({ ...draft, materials })} />
          <Field label="Stitch types" value={draft.stitchTypes} onChange={(stitchTypes) => setDraft({ ...draft, stitchTypes })} />
          <Field label="Colors" value={draft.colors} onChange={(colors) => setDraft({ ...draft, colors })} />
          <Field label="Pattern source" value={draft.patternSource} onChange={(patternSource) => setDraft({ ...draft, patternSource })} />
          <Field label="Pattern URL" value={draft.patternUrl} onChange={(patternUrl) => setDraft({ ...draft, patternUrl })} placeholder="https://…" />
          <label htmlFor="project-visibility" className="full-field">
            <span className="label-text">Visibility</span>
            <select
              id="project-visibility"
              value={draft.visibility}
              onChange={(event) => setDraft({ ...draft, visibility: event.target.value as "public" | "private" })}
            >
              <option value="public">Public — anyone can view</option>
              <option value="private">Private — only you</option>
            </select>
            <span className="field-help">{visibilityHelp(draft.visibility)}</span>
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
            <div className="full-field store-picker">
              <span className="field-label">Available at (stores)</span>
              <div className="store-picker-options">
                {stores.map((store) => {
                  const checked = draft.storeIds.includes(store.id);
                  return (
                    <label key={store.id} className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setDraft({
                            ...draft,
                            storeIds: checked ? draft.storeIds.filter((id) => id !== store.id) : [...draft.storeIds, store.id],
                          })
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
              <p className="field-help">Tag local or online shops that supply this canvas / kit / finishing. Private projects still hide shop links from others.</p>
            </div>
          )}
          <button className="primary full-field" type="submit" disabled={!draft.title.trim() || uploadBusy}>
            <Plus size={18} /> {uploadBusy ? "Saving…" : "Save project"}
          </button>
        </form>
        <div className="panel">
          <SectionTitle title="Your journal" />
          {myProjects.length > 0 ? (
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
            <EmptyState title="No journal entries yet" body="Save a project to start tracking progress." />
          )}
        </div>
      </div>
    </section>
  );
}

export { JournalView as JournalPage };
