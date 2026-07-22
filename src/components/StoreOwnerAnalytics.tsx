import { useEffect, useMemo, useState } from "react";
import {
  fetchOutboundClickEventCounts,
  type OutboundClickEventCount,
} from "../api/clickEvents";
import { isSupabaseConfigured } from "../lib/supabase";

/** Owner-only strip: outbound catalog / website clicks for the last N days. */
export function StoreOwnerAnalytics({ storeId }: { storeId: string }) {
  const [rows, setRows] = useState<OutboundClickEventCount[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const startAt = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured || !storeId) {
      setLoading(false);
      setRows([]);
      return;
    }
    setLoading(true);
    void fetchOutboundClickEventCounts({ storeId, startAt })
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
  }, [storeId, startAt]);

  const totals = useMemo(() => {
    let shop = 0;
    let website = 0;
    for (const row of rows) {
      if (row.eventName === "shop_link_click") shop += row.clickCount;
      if (row.eventName === "store_website_click") website += row.clickCount;
    }
    return { shop, website, all: shop + website };
  }, [rows]);

  if (!isSupabaseConfigured) return null;

  return (
    <section className="store-owner-analytics panel" data-testid="store-owner-analytics" aria-label="Shop link analytics">
      <h2 className="store-owner-analytics-title">Link clicks · last 30 days</h2>
      {loading ? <p className="field-help">Loading analytics…</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {!loading && !error ? (
        <div className="store-owner-analytics-grid">
          <div>
            <strong>{totals.all}</strong>
            <span>Total outbound</span>
          </div>
          <div>
            <strong>{totals.shop}</strong>
            <span>Product links</span>
          </div>
          <div>
            <strong>{totals.website}</strong>
            <span>Website</span>
          </div>
        </div>
      ) : null}
      <p className="field-help">Counts when visitors open your product or website links from Needlepoint. No personal data.</p>
    </section>
  );
}
