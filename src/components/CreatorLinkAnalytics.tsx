import { useEffect, useMemo, useState } from "react";
import {
  fetchCreatorLinkClickCounts,
  type CreatorLinkClickCount,
} from "../api/creatorLinkClicks";
import { isSupabaseConfigured } from "../lib/supabase";

/** Owner-only strip: profile external-link clicks for the last N days. */
export function CreatorLinkAnalytics({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<CreatorLinkClickCount[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const startAt = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured || !profileId) {
      setLoading(false);
      setRows([]);
      setError("");
      return;
    }
    setLoading(true);
    void fetchCreatorLinkClickCounts({ profileId, startAt })
      .then((data) => {
        if (!cancelled) {
          setRows(data);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load analytics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId, startAt]);

  const byLink = useMemo(() => {
    const map = new Map<string, { label: string; url: string; clicks: number }>();
    for (const row of rows) {
      const key = row.profileLinkId || row.linkUrl;
      const prev = map.get(key);
      const clicks = (prev?.clicks ?? 0) + row.clickCount;
      let label = row.linkUrl;
      try {
        label = new URL(row.linkUrl).hostname.replace(/^www\./, "");
      } catch {
        /* keep url */
      }
      map.set(key, { label, url: row.linkUrl, clicks });
    }
    return [...map.values()].sort((a, b) => b.clicks - a.clicks);
  }, [rows]);

  const total = byLink.reduce((sum, row) => sum + row.clicks, 0);

  if (!isSupabaseConfigured) return null;

  return (
    <section
      className="creator-link-analytics panel"
      data-testid="creator-link-analytics"
      aria-label="Profile link analytics"
    >
      <h2 className="creator-link-analytics-title">Link clicks · last 30 days</h2>
      {loading ? <p className="field-help">Loading analytics…</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {!loading && !error ? (
        <>
          <div className="creator-link-analytics-grid">
            <div>
              <strong>{total}</strong>
              <span>Total outbound</span>
            </div>
            <div>
              <strong>{byLink.length}</strong>
              <span>{byLink.length === 1 ? "Link with clicks" : "Links with clicks"}</span>
            </div>
          </div>
          {byLink.length ? (
            <ul className="creator-link-analytics-list">
              {byLink.map((row) => (
                <li key={row.url}>
                  <span className="creator-link-analytics-label" title={row.url}>
                    {row.label}
                  </span>
                  <strong>{row.clicks}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="field-help">
              No link clicks yet. When people open your profile links, counts show here.
            </p>
          )}
        </>
      ) : null}
      <p className="field-help">
        Counts when visitors open your profile links from Needlepoint. Totals only — no visitor names.
      </p>
    </section>
  );
}
