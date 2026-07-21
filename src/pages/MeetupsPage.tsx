import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, Plus, Users } from "lucide-react";
import type { Creator, StitchingMeetup, Store } from "../types";
import type { View } from "../appModel";
import type { MeetupRosterEntry, StitchingMeetupInput } from "../api/meetups";
import { isRegisteredStatus, isWaitlistedStatus, listMeetupRegistrationsOnline, setMeetupGuestCheckInOnline } from "../api/meetups";
import { EmptyState, SectionHeader } from "../components/ui";
import { isSupabaseConfigured } from "../lib/supabase";
import { downloadMeetupIcs } from "../lib/meetupIcs";
import {
  canFreeCancelMeetupRegistration,
  filterUpcomingMeetups,
  formatMeetupCapacity,
  formatMeetupConfirmation,
  formatMeetupPlace,
  formatMeetupWhen,
  hostLabel,
  isApprovedStoreMeetupLink,
  meetupConfirmationRef,
  MEETUP_CANCEL_LOCKED,
  MEETUP_CANCEL_POLICY,
  MEETUP_REGISTER_HELP,
  MEETUP_WAITLIST_HELP,
  meetupIsFull,
} from "../lib/meetups";

function locationTypeLabel(type: StitchingMeetup["locationType"]) {
  if (type === "hybrid") return "Hybrid";
  if (type === "online") return "Online";
  return "In person";
}

function meetupPageUrl(id: string) {
  if (typeof window === "undefined") return `/meetups/${id}`;
  return `${window.location.origin}/meetups/${id}`;
}

function MeetupCard({
  meetup,
  stores,
  creatorById,
  setView,
  showCalendar,
}: {
  meetup: StitchingMeetup;
  stores: Store[];
  creatorById: (id: string) => Creator;
  setView: (view: View) => void;
  showCalendar?: boolean;
}) {
  return (
    <article className="panel meetup-card">
      {meetup.coverImageUrl ? <img className="meetup-card-cover" src={meetup.coverImageUrl} alt="" /> : null}
      <div className="meetup-card-body">
        <p className="eyebrow">
          {locationTypeLabel(meetup.locationType)} · {hostLabel(meetup, creatorById, stores)}
          {isRegisteredStatus(meetup.myRsvp) ? " · Registered" : ""}
          {isWaitlistedStatus(meetup.myRsvp) ? " · Waitlisted" : ""}
        </p>
        <h3>{meetup.title}</h3>
        <p className="meetup-meta">
          <CalendarDays size={14} aria-hidden /> {formatMeetupWhen(meetup)}
        </p>
        <p className="meetup-meta">
          <MapPin size={14} aria-hidden /> {formatMeetupPlace(meetup)}
        </p>
        <p className="meetup-meta">
          <Users size={14} aria-hidden /> {formatMeetupCapacity(meetup)}
        </p>
        {meetup.topics.length ? (
          <div className="tag-row">
            {meetup.topics.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}
        <div className="card-actions wrap">
          <button className="secondary" type="button" onClick={() => setView({ name: "meetup", id: meetup.id })}>
            {meetupIsFull(meetup) && !isRegisteredStatus(meetup.myRsvp) ? "View · Full" : "View meetup"}
          </button>
          {showCalendar ? (
            <button
              className="secondary"
              type="button"
              onClick={() => downloadMeetupIcs(meetup, { pageUrl: meetupPageUrl(meetup.id) })}
            >
              Add to calendar
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
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
  tab = "browse",
  viewerId = null,
  canUseMine = true,
}: {
  meetups: StitchingMeetup[];
  stores: Store[];
  creatorById: (id: string) => Creator;
  setView: (view: View) => void;
  canHost: boolean;
  onCreate?: (input: StitchingMeetupInput) => void | Promise<void>;
  createBusy?: boolean;
  createError?: string;
  ownedStoreId?: string | null;
  tab?: "browse" | "mine";
  viewerId?: string | null;
  canUseMine?: boolean;
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
  const [capacity, setCapacity] = useState("18");
  const [linkStore, setLinkStore] = useState(Boolean(ownedStoreId));
  const [requestStoreId, setRequestStoreId] = useState("");
  const [locationType, setLocationType] = useState<StitchingMeetup["locationType"]>("in_person");

  const filtered = useMemo(
    () => filterUpcomingMeetups(meetups, { city: cityFilter }),
    [meetups, cityFilter],
  );

  const myRegistered = useMemo(
    () => filterUpcomingMeetups(meetups).filter((m) => isRegisteredStatus(m.myRsvp)),
    [meetups],
  );
  const myWaitlisted = useMemo(
    () => filterUpcomingMeetups(meetups).filter((m) => isWaitlistedStatus(m.myRsvp)),
    [meetups],
  );
  const myHosting = useMemo(
    () =>
      filterUpcomingMeetups(meetups).filter(
        (m) => Boolean(viewerId) && m.hostId === viewerId && m.status === "scheduled",
      ),
    [meetups, viewerId],
  );

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!onCreate) return;
    const ownsSelected = Boolean(ownedStoreId && linkStore);
    const requesting = !ownsSelected && Boolean(requestStoreId);
    await onCreate({
      title,
      description,
      startsAt: startsAt ? new Date(startsAt).toISOString() : "",
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      venueName,
      city,
      region,
      locationType,
      hostStoreId: ownsSelected ? ownedStoreId : requesting ? requestStoreId : null,
      requestStoreVenue: requesting,
      topics: topics
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      capacity: capacity.trim() ? Number(capacity) : null,
      status: "scheduled",
      visibility: "public",
      rsvpMode: "registration",
    });
    setTitle("");
    setDescription("");
    setStartsAt("");
    setEndsAt("");
    setVenueName("");
    setCity("");
    setRegion("");
    setTopics("beginners welcome");
    setCapacity("18");
    setRequestStoreId("");
    setShowForm(false);
  }

  return (
    <section className="page">
      <SectionHeader eyebrow="Community" title="Stitching meetups" />
      <p className="feed-rank-note">
        In-person sit-and-stitches, guild nights, and shop open-stitch hours. Different from multi-week online stitch-alongs.
      </p>

      <div className="meetup-tabs" role="tablist" aria-label="Meetups sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "browse"}
          className={tab === "browse" ? "meetup-tab active" : "meetup-tab"}
          onClick={() => setView({ name: "meetups", tab: "browse" })}
        >
          Browse
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "mine"}
          className={tab === "mine" ? "meetup-tab active" : "meetup-tab"}
          onClick={() => setView({ name: "meetups", tab: "mine" })}
          data-testid="meetups-tab-mine"
        >
          My meetups
        </button>
      </div>

      {tab === "mine" ? (
        <div className="meetup-mine" data-testid="meetups-mine">
          {!canUseMine ? (
            <EmptyState
              variant="panel"
              minHeight={240}
              title="Sign in to see your meetups"
              body="Registered seats, waitlist spots, and nights you host show up here."
              action="Account / sign in"
              onAction={() => setView({ name: "auth" })}
            />
          ) : (
            <>
              <section className="meetup-mine-section" aria-label="Registered">
                <h2 className="meetup-roster-title">Registered ({myRegistered.length})</h2>
                {myRegistered.length ? (
                  <div className="meetup-list">
                    {myRegistered.map((meetup) => (
                      <MeetupCard
                        key={meetup.id}
                        meetup={meetup}
                        stores={stores}
                        creatorById={creatorById}
                        setView={setView}
                        showCalendar
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    variant="panel"
                    minHeight={160}
                    title="No seats yet"
                    body="Browse upcoming nights and register for a seat."
                    action="Browse meetups"
                    onAction={() => setView({ name: "meetups", tab: "browse" })}
                  />
                )}
              </section>

              <section className="meetup-mine-section" aria-label="Waitlist">
                <h2 className="meetup-roster-title">Waitlisted ({myWaitlisted.length})</h2>
                {myWaitlisted.length ? (
                  <div className="meetup-list">
                    {myWaitlisted.map((meetup) => (
                      <MeetupCard
                        key={meetup.id}
                        meetup={meetup}
                        stores={stores}
                        creatorById={creatorById}
                        setView={setView}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="field-help">You are not on any waitlists.</p>
                )}
              </section>

              <section className="meetup-mine-section" aria-label="Hosting">
                <h2 className="meetup-roster-title">Hosting ({myHosting.length})</h2>
                {myHosting.length ? (
                  <div className="meetup-list">
                    {myHosting.map((meetup) => (
                      <MeetupCard
                        key={meetup.id}
                        meetup={meetup}
                        stores={stores}
                        creatorById={creatorById}
                        setView={setView}
                        showCalendar
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    variant="panel"
                    minHeight={160}
                    title="Not hosting yet"
                    body={canHost ? "Create a public stitching night for your shop or guild." : "Sign in to host."}
                    action={canHost ? "Browse to host" : undefined}
                    onAction={canHost ? () => setView({ name: "meetups", tab: "browse" }) : undefined}
                  />
                )}
              </section>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="meetup-toolbar">
            <label className="field meetup-filter-field">
              <span className="label-text">City</span>
              <input
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                placeholder="Portland, Brooklyn…"
              />
            </label>
            {canHost ? (
              <button className="primary" type="button" onClick={() => setShowForm((v) => !v)}>
                <Plus size={16} /> {showForm ? "Close" : "Host a meetup"}
              </button>
            ) : null}
          </div>

          {showForm && canHost && onCreate ? (
            <form className="panel meetup-create-form" onSubmit={(e) => void handleCreate(e)}>
              <h2>Host a stitching meetup</h2>
              {createError ? <p className="form-error">{createError}</p> : null}
              <label className="field">
                <span className="label-text">Title</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
              </label>
              <label className="field">
                <span className="label-text">Description</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={4000} />
              </label>
              <div className="form-grid-2">
                <label className="field">
                  <span className="label-text">Starts</span>
                  <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
                </label>
                <label className="field">
                  <span className="label-text">Ends</span>
                  <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                </label>
              </div>
              <div className="form-grid-2">
                <label className="field">
                  <span className="label-text">Venue</span>
                  <input value={venueName} onChange={(e) => setVenueName(e.target.value)} maxLength={120} />
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
              <div className="form-grid-2">
                <label className="field">
                  <span className="label-text">City</span>
                  <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} />
                </label>
                <label className="field">
                  <span className="label-text">Region / state</span>
                  <input value={region} onChange={(e) => setRegion(e.target.value)} maxLength={40} />
                </label>
              </div>
              <label className="field">
                <span className="label-text">Topics (comma-separated)</span>
                <input value={topics} onChange={(e) => setTopics(e.target.value)} maxLength={200} />
              </label>
              <label className="field">
                <span className="label-text">Capacity (optional)</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="e.g. 18 — leave blank for unlimited"
                />
              </label>
              {ownedStoreId ? (
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={linkStore}
                    onChange={(e) => {
                      setLinkStore(e.target.checked);
                      if (e.target.checked) setRequestStoreId("");
                    }}
                  />
                  Host as my shop (links shop page immediately)
                </label>
              ) : null}
              {!linkStore || !ownedStoreId ? (
                <label className="field">
                  <span className="label-text">Request a shop venue (optional)</span>
                  <select
                    value={requestStoreId}
                    onChange={(e) => setRequestStoreId(e.target.value)}
                    disabled={Boolean(ownedStoreId && linkStore)}
                  >
                    <option value="">No shop — use venue name only</option>
                    {stores
                      .filter((s) => s.id !== ownedStoreId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.city ? ` · ${s.city}` : ""}
                        </option>
                      ))}
                  </select>
                  <span className="field-help">
                    Stores create and host shop nights freely. Anyone can host a community meetup, but using a shop as the location needs that shop’s approval first.
                  </span>
                </label>
              ) : null}
              <p className="field-help">
                Registration is always on Needlepoint — guests register and manage seats here (no external Eventbrite link).
              </p>
              <button className="primary" type="submit" disabled={createBusy}>
                {createBusy ? "Publishing…" : "Publish meetup"}
              </button>
            </form>
          ) : null}

          <div className="meetup-list">
            {filtered.map((meetup) => (
              <MeetupCard
                key={meetup.id}
                meetup={meetup}
                stores={stores}
                creatorById={creatorById}
                setView={setView}
              />
            ))}
          </div>

          {!filtered.length ? (
            <EmptyState
              variant="panel"
              minHeight={240}
              title="No meetups match"
              body="Try another city, or host the first night in your area."
              action={canHost ? "Host a meetup" : undefined}
              onAction={canHost ? () => setShowForm(true) : undefined}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

export function MeetupDetailView({
  meetup,
  stores,
  creatorById,
  setView,
  isHost,
  onRegister,
  onJoinWaitlist,
  onCancelRegistration,
  onCancel,
  registerBusy,
}: {
  meetup: StitchingMeetup;
  stores: Store[];
  creatorById: (id: string) => Creator;
  setView: (view: View) => void;
  isHost: boolean;
  onRegister: () => void;
  onJoinWaitlist: () => void;
  onCancelRegistration: () => void;
  onCancel?: () => void;
  registerBusy?: boolean;
}) {
  const host = creatorById(meetup.hostId);
  const store = meetup.hostStoreId ? stores.find((s) => s.id === meetup.hostStoreId) : undefined;
  const cancelled = meetup.status === "cancelled";
  const registered = isRegisteredStatus(meetup.myRsvp);
  const waitlisted = isWaitlistedStatus(meetup.myRsvp);
  const full = meetupIsFull(meetup) && !registered;
  const canFreeCancel = canFreeCancelMeetupRegistration(meetup, meetup.myRsvp);
  const [roster, setRoster] = useState<MeetupRosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");
  const [checkInBusyId, setCheckInBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isHost || cancelled) {
      setRoster([]);
      setRosterError("");
      return;
    }
    let cancelledFetch = false;
    setRosterLoading(true);
    setRosterError("");

    if (!isSupabaseConfigured) {
      // Demo roster: synthetic from capacity counts only
      const registeredN = meetup.registeredCount ?? meetup.goingCount ?? 0;
      const waitN = meetup.waitlistCount ?? 0;
      const demo: MeetupRosterEntry[] = [];
      for (let i = 0; i < Math.min(registeredN, 8); i += 1) {
        demo.push({
          userId: `demo-reg-${i}`,
          handle: `guest${i + 1}`,
          displayName: `Registered guest ${i + 1}`,
          avatarUrl: "",
          status: "registered",
          confirmedAt: new Date().toISOString(),
        });
      }
      for (let i = 0; i < Math.min(waitN, 5); i += 1) {
        demo.push({
          userId: `demo-wl-${i}`,
          handle: `wait${i + 1}`,
          displayName: `Waitlist guest ${i + 1}`,
          avatarUrl: "",
          status: "waitlisted",
        });
      }
      setRoster(demo);
      setRosterLoading(false);
      return () => {
        cancelledFetch = true;
      };
    }

    void listMeetupRegistrationsOnline(meetup.id)
      .then((rows) => {
        if (!cancelledFetch) setRoster(rows);
      })
      .catch((error) => {
        if (!cancelledFetch) setRosterError(error instanceof Error ? error.message : "Could not load roster");
      })
      .finally(() => {
        if (!cancelledFetch) setRosterLoading(false);
      });

    return () => {
      cancelledFetch = true;
    };
  }, [
    isHost,
    cancelled,
    meetup.id,
    meetup.registeredCount,
    meetup.goingCount,
    meetup.waitlistCount,
  ]);

  const rosterRegistered = roster.filter((r) => r.status === "registered");
  const rosterWaitlisted = roster.filter((r) => r.status === "waitlisted");
  const checkedInCount = rosterRegistered.filter((r) => Boolean(r.checkedInAt)).length;

  async function toggleGuestCheckIn(entry: MeetupRosterEntry) {
    if (!isHost || entry.status !== "registered") return;
    const next = !entry.checkedInAt;
    setCheckInBusyId(entry.userId);
    setRosterError("");
    try {
      if (!isSupabaseConfigured) {
        setRoster((rows) =>
          rows.map((r) =>
            r.userId === entry.userId
              ? { ...r, checkedInAt: next ? new Date().toISOString() : null }
              : r,
          ),
        );
        return;
      }
      const result = await setMeetupGuestCheckInOnline(meetup.id, entry.userId, next);
      setRoster((rows) =>
        rows.map((r) => (r.userId === entry.userId ? { ...r, checkedInAt: result.checkedInAt } : r)),
      );
    } catch (error) {
      setRosterError(error instanceof Error ? error.message : "Could not update check-in");
    } finally {
      setCheckInBusyId(null);
    }
  }

  return (
    <section className="page">
      <button className="text-button" type="button" onClick={() => setView({ name: "meetups" })}>
        ← All meetups
      </button>
      <div className="panel meetup-detail">
        {meetup.coverImageUrl ? <img className="meetup-detail-cover" src={meetup.coverImageUrl} alt="" /> : null}
        <p className="eyebrow">
          {locationTypeLabel(meetup.locationType)}
          {cancelled ? " · Cancelled" : full ? " · Full" : ""}
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
          {store && isApprovedStoreMeetupLink(meetup) ? (
            <button className="secondary" type="button" onClick={() => setView({ name: "store", handle: store.handle })}>
              Shop: {store.name}
            </button>
          ) : meetup.storeLinkStatus === "pending" ? (
            <p className="field-help">Shop venue pending approval from the store.</p>
          ) : null}
        </div>

        <p className="meetup-capacity-line" aria-live="polite">
          {formatMeetupCapacity(meetup)}
        </p>

        {!cancelled && meetup.rsvpMode === "external_link" && meetup.externalRsvpUrl ? (
          <div className="meetup-register-block">
            <p className="field-help">
              This older listing still points off-site. Prefer on-site Register below when available.
            </p>
            <a className="secondary" href={meetup.externalRsvpUrl} target="_blank" rel="noreferrer">
              Open legacy host link
            </a>
          </div>
        ) : null}

        {!cancelled ? (
          <div className="meetup-register-block">
            {meetup.rsvpMode === "external_link" && !meetup.externalRsvpUrl ? null : null}
            {meetup.rsvpMode === "external_link" ? (
              <p className="field-help">On-site registration is preferred for new meetups.</p>
            ) : null}
            {registered ? (
              <>
                <div className="meetup-confirmation-card" data-testid="meetup-confirmation">
                  <p className="meetup-registered-banner">You’re registered — seat confirmed.</p>
                  <dl className="meetup-confirmation-meta">
                    <div>
                      <dt>Status</dt>
                      <dd>{formatMeetupConfirmation(meetup.myRegistrationConfirmedAt)}</dd>
                    </div>
                    <div>
                      <dt>Reference</dt>
                      <dd>
                        <code>{meetupConfirmationRef(meetup)}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>When</dt>
                      <dd>{formatMeetupWhen(meetup)}</dd>
                    </div>
                    <div>
                      <dt>Where</dt>
                      <dd>{formatMeetupPlace(meetup)}</dd>
                    </div>
                  </dl>
                  <p className="field-help meetup-policy">
                    Screenshot this confirmation for your records. Email tickets and host check-in come later — this holds your seat now.
                  </p>
                </div>
                <div className="card-actions wrap">
                  <button
                    className="secondary"
                    type="button"
                    disabled={registerBusy || !canFreeCancel}
                    onClick={onCancelRegistration}
                    title={!canFreeCancel ? MEETUP_CANCEL_LOCKED : undefined}
                  >
                    {registerBusy ? "Updating…" : "Cancel registration"}
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    onClick={() =>
                      downloadMeetupIcs(meetup, {
                        pageUrl:
                          typeof window !== "undefined"
                            ? `${window.location.origin}/meetups/${meetup.id}`
                            : `/meetups/${meetup.id}`,
                      })
                    }
                  >
                    Add to calendar
                  </button>
                </div>
                <p className="field-help meetup-policy">{canFreeCancel ? MEETUP_CANCEL_POLICY : MEETUP_CANCEL_LOCKED}</p>
              </>
            ) : waitlisted ? (
              <>
                <p className="meetup-waitlist-banner">
                  You’re on the waitlist
                  {meetup.myWaitlistPosition ? ` · #${meetup.myWaitlistPosition} in line` : ""}.
                </p>
                <button className="secondary" type="button" disabled={registerBusy} onClick={onCancelRegistration}>
                  {registerBusy ? "Updating…" : "Leave waitlist"}
                </button>
                <p className="field-help meetup-policy">
                  If a seat opens, you’re registered automatically in order. Leave anytime.
                </p>
              </>
            ) : full ? (
              <>
                <button className="primary" type="button" disabled={registerBusy} onClick={onJoinWaitlist}>
                  {registerBusy ? "Joining…" : "Join waitlist"}
                </button>
                <p className="field-help meetup-policy">{MEETUP_WAITLIST_HELP}</p>
              </>
            ) : (
              <>
                <button className="primary" type="button" disabled={registerBusy} onClick={onRegister}>
                  {registerBusy ? "Registering…" : meetup.capacity != null ? "Register for a seat" : "Register"}
                </button>
                <p className="field-help meetup-policy">{MEETUP_REGISTER_HELP}</p>
                <p className="field-help meetup-policy">{MEETUP_CANCEL_POLICY}</p>
              </>
            )}
          </div>
        ) : null}

        {isHost && !cancelled ? (
          <section className="meetup-host-roster" aria-label="Host roster" data-testid="meetup-host-roster">
            <h2 className="meetup-roster-title">Guest roster</h2>
            <p className="field-help">
              Only you (the host) can see names. Tap <strong>Check in</strong> when a guest arrives.
              {rosterRegistered.length ? ` · ${checkedInCount}/${rosterRegistered.length} checked in` : ""}
            </p>
            {rosterLoading ? <p className="field-help">Loading roster…</p> : null}
            {rosterError ? <p className="form-error">{rosterError}</p> : null}
            {!rosterLoading && !rosterError ? (
              <>
                <h3 className="meetup-roster-sub">
                  Registered ({rosterRegistered.length}
                  {rosterRegistered.length ? ` · ${checkedInCount} in` : ""})
                </h3>
                {rosterRegistered.length ? (
                  <ul className="meetup-roster-list">
                    {rosterRegistered.map((entry) => {
                      const inDoor = Boolean(entry.checkedInAt);
                      const busy = checkInBusyId === entry.userId;
                      return (
                        <li key={entry.userId} className={inDoor ? "is-checked-in" : undefined}>
                          <span className="meetup-roster-name">{entry.displayName}</span>
                          {entry.handle ? <span className="meetup-roster-handle">@{entry.handle}</span> : null}
                          <span className={`meetup-roster-status${inDoor ? " is-in" : ""}`}>
                            {inDoor ? "checked in" : "confirmed"}
                          </span>
                          <button
                            type="button"
                            className={inDoor ? "secondary meetup-checkin-btn" : "primary meetup-checkin-btn"}
                            disabled={busy}
                            aria-pressed={inDoor}
                            onClick={() => void toggleGuestCheckIn(entry)}
                          >
                            {busy ? "…" : inDoor ? "Undo check-in" : "Check in"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="field-help">No registrations yet.</p>
                )}
                <h3 className="meetup-roster-sub">Waitlist ({rosterWaitlisted.length})</h3>
                {rosterWaitlisted.length ? (
                  <ul className="meetup-roster-list">
                    {rosterWaitlisted.map((entry, index) => (
                      <li key={entry.userId}>
                        <span className="meetup-roster-name">
                          #{index + 1} {entry.displayName}
                        </span>
                        {entry.handle ? <span className="meetup-roster-handle">@{entry.handle}</span> : null}
                        <span className="meetup-roster-status">waitlisted</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="field-help">Waitlist empty.</p>
                )}
              </>
            ) : null}
          </section>
        ) : null}

        {isHost && !cancelled ? (
          <button
            className="secondary"
            type="button"
            onClick={() =>
              downloadMeetupIcs(meetup, {
                pageUrl:
                  typeof window !== "undefined"
                    ? `${window.location.origin}/meetups/${meetup.id}`
                    : `/meetups/${meetup.id}`,
              })
            }
          >
            Add to calendar
          </button>
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
