import type { Collection, Creator, Project } from "../types";
import type { View } from "../appModel";
import { EmptyState, SectionHeader } from "../components/ui";

export function CollectionsView({
  collections,
  projects,
  creatorById,
  setView,
}: {
  collections: Collection[];
  projects: Project[];
  creatorById: (id: string) => Creator;
  setView: (view: View) => void;
}) {
  return (
    <section className="page">
      <SectionHeader eyebrow="Collections" title="Saved projects and inspiration boards" />
      <div className="collection-list">
        {collections.map((collection) => (
          <article className="panel" key={collection.id}>
            <h2>{collection.name}</h2>
            <p>{collection.description}</p>
            <div className="project-grid">
              {collection.projectIds
                .map((id) => projects.find((project) => project.id === id))
                .filter((project): project is Project => Boolean(project))
                .map((project) => (
                  <button className="saved-tile" key={project.id} onClick={() => setView({ name: "project", id: project.id })}>
                    <img src={project.image} alt="" />
                    <span>{project.title}<small>{creatorById(project.creatorId).name}</small></span>
                  </button>
                ))}
              {collection.projectIds.length === 0 && <EmptyState title="Nothing saved here yet" body="Save projects from discovery to build this board." />}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export { CollectionsView as CollectionsPage };
