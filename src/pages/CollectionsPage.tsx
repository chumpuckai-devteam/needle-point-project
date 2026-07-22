import { FormEvent, useState } from "react";
import type { Collection, Creator, Project } from "../types";
import type { View } from "../appModel";
import { EmptyState, SectionHeader } from "../components/ui";

export function CollectionsView({
  collections,
  projects,
  creatorById,
  setView,
  canManage = true,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onRemoveProjectFromCollection,
}: {
  collections: Collection[];
  projects: Project[];
  creatorById: (id: string) => Creator;
  setView: (view: View) => void;
  canManage?: boolean;
  onCreateCollection?: (input: { name: string; description: string }) => void | Promise<void>;
  onRenameCollection?: (id: string, input: { name: string; description: string }) => void | Promise<void>;
  onDeleteCollection?: (id: string) => void | Promise<void>;
  onRemoveProjectFromCollection?: (collectionId: string, projectId: string) => void | Promise<void>;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!onCreateCollection) return;
    setBusy(true);
    setError("");
    try {
      await onCreateCollection({ name, description });
      setName("");
      setDescription("");
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create board.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(event: FormEvent, id: string) {
    event.preventDefault();
    if (!onRenameCollection) return;
    setBusy(true);
    setError("");
    try {
      await onRenameCollection(id, { name: editName, description: editDescription });
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename board.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <SectionHeader eyebrow="Collections" title="Saved projects and inspiration boards" />
      <p className="feed-rank-note">
        Default Saved is always there. Create extra boards for holidays, finishing ideas, or guild inspiration.
      </p>

      {canManage ? (
        <div className="collection-toolbar">
          <button className="primary" type="button" onClick={() => setShowCreate((open) => !open)}>
            {showCreate ? "Cancel" : "New board"}
          </button>
        </div>
      ) : (
        <p className="field-help">Sign in to create and organize boards.</p>
      )}

      {showCreate && canManage ? (
        <form className="panel collection-create-form" onSubmit={(e) => void handleCreate(e)}>
          <label className="field">
            <span className="label-text">Board name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required placeholder="Holiday finishing" />
          </label>
          <label className="field">
            <span className="label-text">Description (optional)</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={240}
              placeholder="Ornaments and metallic notes"
            />
          </label>
          {error ? <p className="field-help error-text">{error}</p> : null}
          <button className="primary" type="submit" disabled={busy || !name.trim()}>
            {busy ? "Saving…" : "Create board"}
          </button>
        </form>
      ) : null}

      <div className="collection-list">
        {collections.map((collection) => {
          const isDefault = Boolean(collection.isDefault || collection.id === "col1");
          const isEditing = editingId === collection.id;
          return (
            <article className="panel" key={collection.id}>
              <div className="collection-card-head">
                <div>
                  <h2>
                    {collection.name}{" "}
                    {isDefault ? <span className="visibility-badge public">Default</span> : null}
                  </h2>
                  <p>{collection.description || "No description yet."}</p>
                </div>
                {canManage ? (
                  <div className="card-actions wrap">
                    {!isDefault ? (
                      <button
                        className="secondary"
                        type="button"
                        onClick={() => {
                          setEditingId(isEditing ? null : collection.id);
                          setEditName(collection.name);
                          setEditDescription(collection.description);
                          setError("");
                        }}
                      >
                        {isEditing ? "Cancel" : "Rename"}
                      </button>
                    ) : null}
                    {!isDefault && onDeleteCollection ? (
                      <button
                        className="secondary"
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (!window.confirm(`Delete board “${collection.name}”? Saved items stay in other boards.`)) return;
                          void onDeleteCollection(collection.id);
                        }}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {isEditing && canManage ? (
                <form className="collection-edit-form" onSubmit={(e) => void handleRename(e, collection.id)}>
                  <label className="field">
                    <span className="label-text">Board name</span>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={80} required />
                  </label>
                  <label className="field">
                    <span className="label-text">Description</span>
                    <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} maxLength={240} />
                  </label>
                  {error ? <p className="field-help error-text">{error}</p> : null}
                  <button className="primary" type="submit" disabled={busy || !editName.trim()}>
                    Save board
                  </button>
                </form>
              ) : null}

              <div className="project-grid">
                {collection.projectIds
                  .map((id) => projects.find((project) => project.id === id))
                  .filter((project): project is Project => Boolean(project))
                  .map((project) => (
                    <div className="saved-tile-wrap" key={project.id}>
                      <button className="saved-tile" type="button" onClick={() => setView({ name: "project", id: project.id })}>
                        <img src={project.image} alt="" />
                        <span>
                          {project.title}
                          <small>{creatorById(project.creatorId).name}</small>
                        </span>
                      </button>
                      {canManage && onRemoveProjectFromCollection ? (
                        <button
                          type="button"
                          className="text-button saved-tile-remove"
                          onClick={() => void onRemoveProjectFromCollection(collection.id, project.id)}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                {collection.projectIds.length === 0 ? (
                  <EmptyState title="Nothing saved here yet" body="Save projects from Studio or Discover to fill this board." />
                ) : null}
              </div>
            </article>
          );
        })}
        {!collections.length ? (
          <EmptyState title="No boards yet" body="Save a project to create your default Saved board." />
        ) : null}
      </div>
    </section>
  );
}

export { CollectionsView as CollectionsPage };
