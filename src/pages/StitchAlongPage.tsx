import { useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Plus, Sparkles, Users } from "lucide-react";
import type { Creator, Project, StitchAlong } from "../types";
import type { View } from "../appModel";
import { visibilityLabel } from "../appModel";
import { EmptyState, Field, SectionHeader, SectionTitle } from "../components/ui";

function statusLabel(status?: StitchAlong["status"]) {
  if (status === "ended") return "Ended";
  if (status === "draft") return "Draft";
  return "Active";
}

function isSubmitClosed(event: StitchAlong) {
  if (event.status === "ended") return true;
  if (!event.endDate) return false;
  const end = new Date(`${event.endDate}T23:59:59`);
  return !Number.isNaN(end.getTime()) && end.getTime() < Date.now();
}

const FLAGSHIP_TEMPLATES = [
  {
    id: "holiday",
    label: "Holiday ornaments",
    title: "Holiday ornament stitch-along",
    theme: "Ornaments, metallics, seasonal finishes",
    description: "Stitch a small holiday ornament or mini and share progress with the group.",
    rules: ["One public project", "Share at least one progress photo", "Be kind in comments"],
  },
  {
    id: "beginner",
    label: "Beginner sampler",
    title: "Beginner-friendly sampler stitch-along",
    theme: "Simple stitches, practice canvases",
    description: "A welcoming SAL for new stitchers. Continental and basketweave welcome.",
    rules: ["Public project only", "Ask questions freely", "Celebrate small wins"],
  },
  {
    id: "seasonal",
    label: "Seasonal finish",
    title: "Seasonal finish challenge",
    theme: "Finish a WIP this season",
    description: "Pick a project already on your stand and finish it together.",
    rules: ["One WIP focus", "Weekly progress check-in", "Finishing tips encouraged"],
  },
] as const;

type ListFilter = "all" | "active" | "hosting" | "joined";

export function StitchAlongListView({
  stitchAlongs,
  creatorById,
  setView,
  canHost,
  viewerId,
  onCreate,
  createBusy,
  createError,
}: {
  stitchAlongs: StitchAlong[];
  creatorById: (id: string) => Creator;
  setView: (view: View) => void;
  canHost: boolean;
  viewerId?: string | null;
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
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<ListFilter>("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState("");
  const [rulesText, setRulesText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  function applyTemplate(id: (typeof FLAGSHIP_TEMPLATES)[number]["id"]) {
    const template = FLAGSHIP_TEMPLATES.find((item) => item.id === id);
    if (!template) return;
    setTitle(template.title);
    setTheme(template.theme);
    setDescription(template.description);
    setRulesText(template.rules.join("\n"));
    setShowForm(true);
  }

  const ordered = useMemo(() => {
    const score = (event: StitchAlong) => {
      if ((event.status ?? "active") === "active") return 0;
      if (event.status === "draft") return 1;
      return 2;
    };
    let list = [...stitchAlongs];
    if (filter === "active") list = list.filter((event) => (event.status ?? "active") === "active" && !isSubmitClosed(event));
    if (filter === "hosting" && viewerId) list = list.filter((event) => event.hostId === viewerId);
    if (filter === "joined") list = list.filter((event) => event.joined);
    return list.sort((a, b) => {
      const byStatus = score(a) - score(b);
      if (byStatus !== 0) return byStatus;
      return (b.startDate || "").localeCompare(a.startDate || "");
    });
  }, [stitchAlongs, filter, viewerId]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!onCreate) return;
    await onCreate({
      title,
      description,
      theme,
      rules: rulesText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      startDate,
      endDate,
      coverImageUrl,
    });
    setTitle("");
    setDescription("");
    setTheme("");
    setRulesText("");
    setStartDate("");
    setEndDate("");
    setCoverImageUrl("");
    setShowForm(false);
  }

  return (
    <section className="page">
      <SectionHeader eyebrow="Community" title="Stitch-alongs" />
      <p className="feed-rank-note">
        Browse multiple public challenges, join galleries, or host a flagship event for your guild.
      </p>

      <div className="sal-list-toolbar">
        {canHost ? (
          <button className="primary" type="button" onClick={() => setShowForm((open) => !open)}>
            <Plus size={18} /> {showForm ? "Close form" : "Host a stitch-along"}
          </button>
        ) : (
          <button className="secondary" type="button" onClick={() => setView({ name: "auth" })}>
            Sign in to host
          </button>
        )}
      </div>

      <div className="sal-filter-row" role="tablist" aria-label="Filter stitch-alongs">
        {(
          [
            ["all", "All"],
            ["active", "Active"],
            ["hosting", "Hosting"],
            ["joined", "Joined"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            className={filter === id ? "secondary selected" : "secondary"}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {showForm && canHost ? (
        <form className="panel form-grid sal-create-form" onSubmit={(e) => void handleCreate(e)} data-testid="sal-create-form">
          <h2 className="full-field">New stitch-along</h2>
          <div className="full-field sal-template-row">
            <span className="label-text">Start from a flagship template</span>
            <div className="sal-template-chips">
              {FLAGSHIP_TEMPLATES.map((template) => (
                <button key={template.id} type="button" className="secondary" onClick={() => applyTemplate(template.id)}>
                  {template.label}
                </button>
              ))}
            </div>
          </div>
          <Field label="Title" value={title} onChange={setTitle} required className="full-field" placeholder="Autumn botanicals stitch-along" />
          <Field label="Theme" value={theme} onChange={setTheme} className="full-field" placeholder="Leaves, berries, warm metallics" />
          <label className="full-field">
            <span className="label-text">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What stitchers should bring and share." />
          </label>
          <label className="full-field">
            <span className="label-text">Rules (one per line)</span>
            <textarea value={rulesText} onChange={(e) => setRulesText(e.target.value)} rows={3} placeholder={"One public project\nShare a progress update"} />
          </label>
          <label>
            <span className="label-text">Start date</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label>
            <span className="label-text">End date</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          <Field label="Cover image URL" value={coverImageUrl} onChange={setCoverImageUrl} className="full-field" placeholder="https://…" />
          {createError ? (
            <p className="field-help full-field" role="alert">
              {createError}
            </p>
          ) : null}
          <button className="primary full-field" type="submit" disabled={createBusy || !title.trim()}>
            {createBusy ? "Creating…" : "Create public stitch-along"}
          </button>
        </form>
      ) : null}

      {ordered.length ? (
        <div className="sal-card-grid" role="list">
          {ordered.map((event) => {
            const host = creatorById(event.hostId);
            const participants = event.participantCount ?? event.participantProjectIds.length;
            return (
              <button
                key={event.id}
                type="button"
                role="listitem"
                className="sal-card"
                onClick={() => setView({ name: "stitchAlong", id: event.id })}
              >
                <div
                  className="sal-card-cover"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(31,42,36,0.15), rgba(31,42,36,0.72)), url(${event.coverImageUrl || "/assets/needlepoint-hero.png"})`,
                  }}
                >
                  <span className={`sal-status sal-status-${event.status ?? "active"}`}>{statusLabel(event.status)}</span>
                </div>
                <div className="sal-card-body">
                  <p className="eyebrow">{event.dates}</p>
                  <strong>{event.title}</strong>
                  <p>{event.theme || event.description}</p>
                  <div className="sal-card-meta">
                    <span>
                      <Users size={14} aria-hidden /> {participants} joined
                    </span>
                    <span>Host @{host.handle}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={filter === "all" ? "No stitch-alongs yet" : "Nothing in this filter"}
          body={
            filter === "hosting"
              ? "Host a public challenge to see it here."
              : filter === "joined"
                ? "Join a stitch-along to track it here."
                : canHost
                  ? "Host the first public challenge for your community."
                  : "Check back soon for active community challenges."
          }
          action={canHost && filter !== "joined" ? "Host a stitch-along" : undefined}
          onAction={canHost ? () => setShowForm(true) : undefined}
        />
      )}
    </section>
  );
}

export function StitchAlongView({
  stitchAlong,
  projects,
  myProjects,
  creatorById,
  joinStitchAlong,
  submitToStitchAlong,
  setView,
  viewerId,
  onEndStitchAlong,
  hostActionBusy,
  hostActionError,
}: {
  stitchAlong: StitchAlong;
  projects: Project[];
  myProjects: Project[];
  creatorById: (id: string) => Creator;
  joinStitchAlong: () => void;
  submitToStitchAlong: (projectId: string) => void;
  setView: (view: View) => void;
  viewerId?: string | null;
  onEndStitchAlong?: () => Promise<void> | void;
  hostActionBusy?: boolean;
  hostActionError?: string;
}) {
  const host = creatorById(stitchAlong.hostId);
  const isHost = Boolean(viewerId && stitchAlong.hostId === viewerId);
  const participantProjects = stitchAlong.participantProjectIds
    .map((id) => projects.find((project) => project.id === id))
    .filter((project): project is Project => Boolean(project));
  const submittable = myProjects.filter((project) => project.visibility === "public");
  const closed = isSubmitClosed(stitchAlong);
  const participants = stitchAlong.participantCount ?? Math.max(participantProjects.length, stitchAlong.participantProjectIds.length);
  const cover = stitchAlong.coverImageUrl || "/assets/needlepoint-hero.png";
  const rosterIds = stitchAlong.participantUserIds?.length
    ? stitchAlong.participantUserIds
    : participantProjects.map((project) => project.creatorId);

  return (
    <section className="page">
      <button type="button" className="text-button sal-back" onClick={() => setView({ name: "stitchAlong" })}>
        ← All stitch-alongs
      </button>
      <div
        className="stitch-hero"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(32, 37, 31, 0.92), rgba(32, 37, 31, 0.28)), url(${cover})`,
        }}
      >
        <div>
          <p className="eyebrow">
            {stitchAlong.dates} · {statusLabel(stitchAlong.status)}
          </p>
          <h1>{stitchAlong.title}</h1>
          <p>{stitchAlong.description}</p>
          <div className="sal-hero-meta">
            <span>
              <Users size={16} aria-hidden /> {participants} joined
            </span>
            <span>
              <CalendarDays size={16} aria-hidden /> {stitchAlong.theme || "Open theme"}
            </span>
          </div>
          <button className={`primary ${stitchAlong.joined ? "selected" : ""}`} type="button" onClick={joinStitchAlong} disabled={closed && !stitchAlong.joined}>
            <Sparkles size={18} /> {stitchAlong.joined ? "Joined" : closed ? "Submissions closed" : "Join stitch-along"}
          </button>
        </div>
      </div>
      <div className="two-column">
        <div className="panel">
          <h2>Rules and theme</h2>
          <p>{stitchAlong.theme}</p>
          <ul>
            {stitchAlong.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <button className="profile-chip" type="button" onClick={() => setView({ name: "profile", id: host.id })}>
            <img src={host.avatar} alt="" />
            <span>
              Hosted by {host.name}
              <small>@{host.handle}</small>
            </span>
          </button>
        </div>
        <div className="panel">
          <h2>Submit a project</h2>
          {closed ? (
            <p className="field-help">This stitch-along has ended. You can still browse the gallery.</p>
          ) : (
            <p className="field-help">Only public projects can join the gallery. Private journal drafts stay hidden.</p>
          )}
          {!closed && submittable.length > 0 ? (
            submittable.map((project) => (
              <button
                className={`mini-update ${stitchAlong.participantProjectIds.includes(project.id) ? "submitted" : ""}`}
                key={project.id}
                type="button"
                onClick={() => submitToStitchAlong(project.id)}
              >
                {project.image ? <img src={project.image} alt="" /> : <span className="mini-update-fallback" aria-hidden />}
                <span>
                  <strong>{project.title}</strong>
                  <small>
                    {stitchAlong.participantProjectIds.includes(project.id)
                      ? "Submitted"
                      : `Tap to submit · ${visibilityLabel(project.visibility)}`}
                  </small>
                </span>
              </button>
            ))
          ) : !closed ? (
            <EmptyState
              title="No public projects to submit"
              body="Create a public journal entry first, then submit it here."
              action="New project"
              onAction={() => setView({ name: "journal" })}
            />
          ) : null}
        </div>
      </div>

      {isHost ? (
        <section className="panel sal-host-tools" data-testid="sal-host-tools" aria-label="Host tools">
          <h2>Host tools</h2>
          <p className="field-help">Manage this challenge. Ending closes new joins and submissions.</p>
          <div className="sal-host-roster">
            <strong>Roster ({rosterIds.length})</strong>
            {rosterIds.length ? (
              <ul className="sal-roster-list">
                {rosterIds.map((userId) => {
                  const person = creatorById(userId);
                  return (
                    <li key={userId}>
                      <button type="button" className="text-button" onClick={() => setView({ name: "profile", id: userId })}>
                        @{person.handle || "stitcher"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="field-help">No joins yet — share your stitch-along link.</p>
            )}
          </div>
          {(stitchAlong.status ?? "active") !== "ended" ? (
            <button
              type="button"
              className="secondary"
              disabled={hostActionBusy}
              onClick={() => {
                if (!window.confirm("End this stitch-along? Guests can still browse the gallery.")) return;
                void onEndStitchAlong?.();
              }}
            >
              {hostActionBusy ? "Ending…" : "End stitch-along"}
            </button>
          ) : (
            <p className="field-help">This stitch-along is ended.</p>
          )}
          {hostActionError ? (
            <p className="field-help error-text" role="alert">
              {hostActionError}
            </p>
          ) : null}
        </section>
      ) : null}

      <SectionTitle title="Participant projects" />
      <div className="project-grid">
        {participantProjects.length ? (
          participantProjects.map((project) => (
            <button className="profile-project" key={project.id} type="button" onClick={() => setView({ name: "project", id: project.id })}>
              {project.image ? (
                <img src={project.image} alt="" />
              ) : (
                <div className="visual-tile-text-only">
                  <span>{project.title}</span>
                </div>
              )}
              <strong>{project.title}</strong>
              <small>{creatorById(project.creatorId).name}</small>
            </button>
          ))
        ) : (
          <EmptyState title="No submissions yet" body="Be the first to share a public project with this stitch-along." />
        )}
      </div>
    </section>
  );
}

export { StitchAlongView as StitchAlongPage };
