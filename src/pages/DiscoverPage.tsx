import { Filter, Search } from "lucide-react";
import type { Creator, Project } from "../types";
import type { View } from "../appModel";
import { difficultyOptions, statusOptions } from "../appModel";
import { FeedPost } from "../components/feed";
import { EmptyState, SectionHeader, Select } from "../components/ui";

export function DiscoverView(props: {
  projects: Project[];
  categories: string[];
  stitches: string[];
  colors: string[];
  query: string;
  filters: { category: string; difficulty: string; stitch: string; color: string; status: string };
  setQuery: (query: string) => void;
  setFilters: (filters: { category: string; difficulty: string; stitch: string; color: string; status: string }) => void;
  clearFilters: () => void;
  creatorById: (id: string) => Creator;
  setView: (view: View) => void;
  toggleLike: (id: string) => void;
  canComment?: boolean;
  onAddComment?: (projectId: string, body: string) => void | Promise<void>;
  onRequireAuth?: () => void;
  toggleSave: (id: string) => void;
  shareProject: (id: string) => void;
  /** Skip/dismiss recommendation from Discover surface. */
  dismissRecommendation?: (projectId: string) => void;
  /** When true, show light “matched to interests” empty copy. */
  hasInterests?: boolean;
}) {
  return (
    <section className="page feed-page">
      <SectionHeader eyebrow="Discover" title="Explore canvases, stitches, and creators" />
      {props.hasInterests ? (
        <p className="feed-rank-note">Ordered with your onboarding interests — filters still win when you narrow the list.</p>
      ) : null}
      <div className="searchbar">
        <Search size={18} />
        <input value={props.query} onChange={(event) => props.setQuery(event.target.value)} placeholder="Try florals, velvet, basketweave..." />
      </div>
      <div className="filters">
        <Filter size={18} />
        <Select label="Category" value={props.filters.category} options={props.categories} onChange={(category) => props.setFilters({ ...props.filters, category })} />
        <Select label="Difficulty" value={props.filters.difficulty} options={difficultyOptions} onChange={(difficulty) => props.setFilters({ ...props.filters, difficulty })} />
        <Select label="Stitch" value={props.filters.stitch} options={props.stitches} onChange={(stitch) => props.setFilters({ ...props.filters, stitch })} />
        <Select label="Color" value={props.filters.color} options={props.colors} onChange={(color) => props.setFilters({ ...props.filters, color })} />
        <Select label="Status" value={props.filters.status} options={statusOptions} onChange={(status) => props.setFilters({ ...props.filters, status })} />
        <button className="secondary" onClick={props.clearFilters}>Clear</button>
      </div>
      {props.projects.length > 0 ? (
        <div className="feed-timeline discover-feed" aria-label="Discover feed">
          {props.projects.map((project) => (
            <FeedPost
              key={project.id}
              project={project}
              creator={props.creatorById(project.creatorId)}
              setView={props.setView}
              toggleLike={props.toggleLike}
              toggleSave={props.toggleSave}
              shareProject={props.shareProject}
              onDismiss={props.dismissRecommendation}
              canComment={Boolean(props.canComment)}
              onAddComment={props.onAddComment}
              onRequireAuth={props.onRequireAuth}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          variant="panel"
          minHeight={280}
          title="No matching projects"
          body="Try a broader stitch, color, status, or creator search."
          action="Reset filters"
          onAction={props.clearFilters}
        />
      )}
    </section>
  );
}

export { DiscoverView as DiscoverPage };
