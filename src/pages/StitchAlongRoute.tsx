import { useParams } from "react-router-dom";
import type { Creator, Project, StitchAlong } from "../types";
import type { View } from "../appModel";
import { StitchAlongListView, StitchAlongView } from "./StitchAlongPage";

export function StitchAlongRoute({
  stitchAlongs,
  projects,
  myProjects,
  creatorById,
  joinStitchAlong,
  submitToStitchAlong,
  setView,
  canHost,
  onCreate,
  createBusy,
  createError,
}: {
  stitchAlongs: StitchAlong[];
  projects: Project[];
  myProjects: Project[];
  creatorById: (id: string) => Creator;
  joinStitchAlong: (stitchAlongId?: string) => void;
  submitToStitchAlong: (projectId: string, stitchAlongId?: string) => void;
  setView: (view: View) => void;
  canHost: boolean;
  onCreate?: (input: {
    title: string;
    description: string;
    theme: string;
    rules: string[];
    startDate: string;
    endDate: string;
    coverImageUrl: string;
  }) => Promise<void> | void;
  createBusy?: boolean;
  createError?: string;
}) {
  const { id } = useParams();

  if (!id) {
    return (
      <StitchAlongListView
        stitchAlongs={stitchAlongs}
        creatorById={creatorById}
        setView={setView}
        canHost={canHost}
        onCreate={onCreate}
        createBusy={createBusy}
        createError={createError}
      />
    );
  }

  const stitchAlong = stitchAlongs.find((event) => event.id === id);
  if (!stitchAlong) {
    return (
      <section className="page">
        <button type="button" className="text-button sal-back" onClick={() => setView({ name: "stitchAlong" })}>
          ← All stitch-alongs
        </button>
        <div className="empty-state">
          <strong>Stitch-along not found</strong>
          <p>This event may be private, ended without a public listing, or the link is outdated.</p>
          <button className="secondary" type="button" onClick={() => setView({ name: "stitchAlong" })}>
            Browse stitch-alongs
          </button>
        </div>
      </section>
    );
  }

  return (
    <StitchAlongView
      stitchAlong={stitchAlong}
      projects={projects}
      myProjects={myProjects}
      creatorById={creatorById}
      joinStitchAlong={() => joinStitchAlong(stitchAlong.id)}
      submitToStitchAlong={(projectId) => submitToStitchAlong(projectId, stitchAlong.id)}
      setView={setView}
    />
  );
}
