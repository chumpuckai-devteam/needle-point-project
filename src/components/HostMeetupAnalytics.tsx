import { useEffect, useMemo, useState } from "react";
import { fetchHostMeetupDrawStats, type HostMeetupDrawStats } from "../api/meetups";
import { isSupabaseConfigured } from "../lib/supabase";

const EMPTY: HostMeetupDrawStats = {
  meetupsHosted: 0,
  registrations: 0,
  checkedIn: 0,
  waitlisted: 0,
};

/** Host-only strip: meetup draw (registrations + check-ins) for the last N days. */
export function HostMeetupAnalytics({ enabled = true }: { enabled?: boolean }) {
  const [stats, setStats] = useState<HostMeetupDrawStats>(EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const startAt = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured || !enabled) {
      setLoading(false);
      setStats(EMPTY);
      setError("");
      return;
    }
    setLoading(true);
    void fetchHostMeetupDrawStats({ startAt })
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load host stats");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, startAt]);

  if (!isSupabaseConfigured || !enabled) return null;

  return (
    <section
      className="host-meetup-analytics panel"
      data-testid="host-meetup-analytics"
      aria-label="Meetup draw stats"
    >
      <h2 className="host-meetup-analytics-title">Meetup draw · last 90 days</h2>
      {loading ? <p className="field-help">Loading host stats…</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {!loading && !error ? (
        <div className="host-meetup-analytics-grid">
          <div>
            <strong>{stats.meetupsHosted}</strong>
            <span>Nights hosted</span>
          </div>
          <div>
            <strong>{stats.registrations}</strong>
            <span>Registrations</span>
          </div>
          <div>
            <strong>{stats.checkedIn}</strong>
            <span>Checked in</span>
          </div>
          <div>
            <strong>{stats.waitlisted}</strong>
            <span>Waitlisted</span>
          </div>
        </div>
      ) : null}
      <p className="field-help">
        Seat counts and door check-ins across nights you host. Totals only — no guest names.
      </p>
    </section>
  );
}
