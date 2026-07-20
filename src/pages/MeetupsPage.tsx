import { FormEvent, useMemo, useState } from "react";
import { CalendarDays, MapPin, Plus, Users } from "lucide-react";
import type { Creator, StitchingMeetup, StitchingMeetupRsvpStatus, Store } from "../types";
import type { View } from "../appModel";
import type { StitchingMeetupInput } from "../api/meetups";
import { EmptyState, SectionHeader } from "../components/ui";
import { filterUpcomingMeetups, formatMeetupPlace, formatMeetupWhen, hostLabel } from "../lib/meetups";

function locationTypeLabel(type: StitchingMeetup["locationType"]) {
  if (type === "hybrid") return "Hybrid";
  if (type === "online") return "Online";
  return "In person";
}

export function MeetupsListView({
  meetups,
  stores,
  creatorById,
  setView,
  canHost,
  onCreate,
  createBusy,
  createError,
  ownedStoreId,
}: {
  meetups: StitchingMeetup[];
  stores: Store[];
  creatorById: (id: string) => Creator;
  setView: (view: View) => void;
  canHost: boolean;
  onCreate?: (input: StitchingMeetupInput) => void | Promise<void>;
  createBusy?: boolean;
  createError?: string;
  /** Demo/online shop the current user owns — optional link on create. */
  ownedStoreId?: string | null;
}) {
  const [showForm, setShowForm] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [venueName, setVenueName] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [topics, setTopics] = useState("beginners welcome");
  const [linkStore, setLinkStore] = useState(Boolean(ownedStoreId));
  const [locationType, setLocationType] = useState<StitchingMeetup["locationType"]>("in_person");

  const filtered = useMemo(
    () => filterUpcomingMeetups(meetups, { city: cityFilter }),
    [meetups, cityFilter],
  );

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!onCreate) return;
    await onCreate({
      title,
      description,
      startsAt: startsAt ? new Date(startsAt).toISOString() : "",
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      venueName,
      city,
      region,
      locationType,
      hostStoreId: linkStore && ownedStoreId ? ownedStoreId : null,
      topics: topics
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: "scheduled",
      visibility: "public",
      rsvpMode: "in_app_rsvp",
    });
    setTitle("");
    setDescription("");
    setStartsAt("");
    setEndsAt("");
    setVenueName("");
    setCity("");
    setRegion("");
    setTopics("beginners welcome");
    setShowForm(false);
  }

  return (
    <section className="page">
      <SectionHeader eyebrow="Community" title="Stitching meetups" />
      <p className="feed-rank-note">
        In-person sit-and-stitches, guild nights, and shop open-stitch hours. Different from multi-week online stitch-alongs.
      </p>

      <div className="meetup-toolbar">
        <label className="field meetup-filter-field">
          <span className="label-text">City filter</span>
          <input
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Portland, Brooklyn…"
            maxLength={80}
          />
        </label>
        {canHost ? (
          <button className="primary" type="button" onClick={() => setShowForm((o) => !o)}>
            <Plus size={16} /> {showForm ? "Cancel" : "Host a meetup"}
          </button>
        ) : null}
      </div>

      {showForm && canHost ? (
        <form className="panel meetup-create-form" onSubmit={(e) => void handleCreate(e)}>
          <h2>Host a stitching meetup</h2>
          <label className="field">
            <span className="label-text">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder="Thursday Sit & Stitch" />
          </label>
          <label className="field">
            <span className="label-text">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} rows={3} />
          </label>
          <div className="meetup-form-row">
            <label className="field">
              <span className="label-text">Starts</span>
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
            </label>
            <label className="field">
              <span className="label-text">Ends (optional)</span>
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </label>
          </div>
          <div className="meetup-form-row">
            <label className="field">
              <span className="label-text">Venue</span>
              <input value={venueName} onChange={(e) => setVenueName(e.target.value)} maxLength={120} placeholder="Shop or library name" />
            </label>
            <label className="field">
              <span className="label-text">Type</span>
              <select value={locationType} onChange={(e) => setLocationType(e.target.value as StitchingMeetup["locationType"])}>
                <option value="in_person">In person</option>
                <option value="hybrid">Hybrid</option>
                <option value="online">Online</option>
              </select>
            </label>
          </div>
          <div className="meetup-form-row">
            <label className="field">
              <span className="label-text">City</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} placeholder="Portland" />
            </label>
            <label className="field">
              <span className="label-text">Region</span>
              <input value={region} onChange={(e) => setRegion(e.target.value)} maxLength={8} placeholder="OR" />
            </label>
          </div>
          <label className="field">
            <span className="label-text">Topics (comma-separated)</span>
            <input value={topics} onChange={(e) => setTopics(e.target.value)} maxLength={200} />
          </label>
          {ownedStoreId ? (
            <label className="checkbox-row">
              <input type="checkbox" checked={linkStore} onChange={(e) => setLinkStore(e.target.checked)} />
              <span>Link to my shop profile</span>
            </label>
          ) : null}
          {createError ? <p className="field-help error-text">{createError}</p> : null}
          <button className="primary" type="submit" disabled={createBusy || !title.trim() || !startsAt}>
            {createBusy ? "Publishing…" : "Publish meetup"}
          </button>
        </form>
      ) : null}

      <div className="meetup-list">
        {filtered.map((meetup) => (
          <article className="panel meetup-card" key={meetup.id}>
            {meetup.coverImageUrl ? <img className="meetup-card-cover" src={meetup.coverImageUrl} alt="" /> : null}
            <div className="meetup-card-body">
              <p className="eyebrow">
                {locationTypeLabel(meetup.locationType)} · {hostLabel(meetup, creatorById, stores)}
              </p>
              <h2>{meetup.title}</h2>
              <p className="meetup-meta">
                <CalendarDays size={14} aria-hidden /> {formatMeetupWhen(meetup)}
              </p>
              <p className="meetup-meta">
                <MapPin size={14} aria-hidden /> {formatMeetupPlace(meetup)}
              </p>
              <p className="meetup-meta">
                <Users size={14} aria-hidden /> {(meetup.goingCount ?? 0) + (meetup.interestedCount ?? 0)} interested ·{" "}
                {meetup.goingCount ?? 0} going
              </p>
              {meetup.topics.length ? (
                <div className="tag-row">
                  {meetup.topics.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              ) : null}
              <button className="secondary" type="button" onClick={() => setView({ name: "meetup", id: meetup.id })}>
                View meetup
              </button>
            </div>
          </article>
        ))}
        {!filtered.length ? (
          <EmptyState
            variant="panel"
            minHeight={220}
            title="No upcoming meetups"
            body={
              cityFilter
                ? "Try another city, or clear the filter to see all public nights."
                : canHost
                  ? "Host the first sit-and-stitch for your city or shop."
                  : "Check back soon — shops and guilds can post local stitch nights here."
            }
            action={canHost ? "Host a meetup" : undefined}
            onAction={canHost ? () => setShowForm(true) : undefined}
          />
        ) : null}
      </div>
    </section>
  );
}

export function MeetupDetailView({
  meetup,
  stores,
  creatorById,
  setView,
  isHost,
  onRsvp,
  onCancel,
  rsvpBusy,
}: {
  meetup: StitchingMeetup;
  stores: Store[];
  creatorById: (id: string) => Creator;
  setView: (view: View) => void;
  isHost: boolean;
  onRsvp: (status: StitchingMeetupRsvpStatus | null) => void;
  onCancel?: () => void;
  rsvpBusy?: boolean;
}) {
  const host = creatorById(meetup.hostId);
  const store = meetup.hostStoreId ? stores.find((s) => s.id === meetup.hostStoreId) : undefined;
  const cancelled = meetup.status === "cancelled";

  return (
    <section className="page">
      <button className="text-button" type="button" onClick={() => setView({ name: "meetups" })}>
        ← All meetups
      </button>
      <div className="panel meetup-detail">
        {meetup.coverImageUrl ? <img className="meetup-detail-cover" src={meetup.coverImageUrl} alt="" /> : null}
        <p className="eyebrow">
          {locationTypeLabel(meetup.locationType)}
          {cancelled ? " · Cancelled" : ""}
        </p>
        <h1>{meetup.title}</h1>
        <p className="meetup-meta">
          <CalendarDays size={16} aria-hidden /> {formatMeetupWhen(meetup)}
        </p>
        <p className="meetup-meta">
          <MapPin size={16} aria-hidden /> {formatMeetupPlace(meetup)}
          {meetup.address ? ` · ${meetup.address}` : ""}
        </p>
        <p>{meetup.description}</p>
        {meetup.topics.length ? (
          <div className="tag-row">
            {meetup.topics.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}

        <div className="meetup-host-row">
          <button className="profile-chip" type="button" onClick={() => setView({ name: "profile", id: host.handle || host.id })}>
            <img src={host.avatar} alt="" />
            <span>
              {host.name}
              <small>Host</small>
            </span>
          </button>
          {store ? (
            <button className="secondary" type="button" onClick={() => setView({ name: "store", handle: store.handle })}>
              Shop: {store.name}
            </button>
          ) : null}
        </div>

        <p className="field-help">
          {meetup.goingCount ?? 0} going · {meetup.interestedCount ?? 0} interested
          {meetup.capacity ? ` · capacity ${meetup.capacity}` : ""}
        </p>

        {!cancelled && meetup.rsvpMode === "external_link" && meetup.externalRsvpUrl ? (
          <a className="primary" href={meetup.externalRsvpUrl} target="_blank" rel="noreferrer">
            RSVP on host site
          </a>
        ) : null}

        {!cancelled && meetup.rsvpMode !== "external_link" ? (
          <div className="card-actions wrap">
            <button
              className={`primary ${meetup.myRsvp === "going" ? "selected" : ""}`}
              type="button"
              disabled={rsvpBusy}
              onClick={() => onRsvp(meetup.myRsvp === "going" ? null : "going")}
            >
              {meetup.myRsvp === "going" ? "Going ✓" : "Going"}
            </button>
            <button
              className={`secondary ${meetup.myRsvp === "interested" ? "selected" : ""}`}
              type="button"
              disabled={rsvpBusy}
              onClick={() => onRsvp(meetup.myRsvp === "interested" ? null : "interested")}
            >
              {meetup.myRsvp === "interested" ? "Interested ✓" : "Interested"}
            </button>
          </div>
        ) : null}

        {isHost && !cancelled && onCancel ? (
          <button className="secondary" type="button" onClick={onCancel}>
            Cancel meetup
          </button>
        ) : null}
      </div>
    </section>
  );
}

export { MeetupsListView as MeetupsPage };
