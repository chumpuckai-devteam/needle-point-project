import { useCallback, useEffect, useState } from "react";
import {
  approveStoreClaimRequestOnline,
  denyStoreClaimRequestOnline,
  fetchStoreClaimQueueOnline,
  type StoreClaimQueueItem,
  type StoreClaimRequest,
} from "../api/stores";
import { friendlyUserError } from "../lib/userFacingError";
import { EmptyState, SectionHeader } from "../components/ui";

type ClaimFilter = StoreClaimRequest["status"] | "all";

function formatWhen(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function placeLine(item: StoreClaimQueueItem) {
  return [item.storeCity, item.storeRegion].filter(Boolean).join(", ") || "Location TBA";
}

export function ClaimsQueuePage({
  enabled,
  onBack,
  onOpenStore,
}: {
  enabled: boolean;
  onBack: () => void;
  onOpenStore?: (handle: string) => void;
}) {
  const [filter, setFilter] = useState<ClaimFilter>("pending");
  const [rows, setRows] = useState<StoreClaimQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setRows(await fetchStoreClaimQueueOnline(filter));
    } catch (err) {
      setError(friendlyUserError(err, "Could not load the claim queue"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    setBusyId(id);
    setError("");
    try {
      await approveStoreClaimRequestOnline(id, undefined, notes[id] ?? "");
      setRows((current) =>
        filter === "pending" ? current.filter((row) => row.id !== id) : current.map((row) => (row.id === id ? { ...row, status: "approved" } : row)),
      );
    } catch (err) {
      setError(friendlyUserError(err, "Could not approve claim"));
    } finally {
      setBusyId(null);
    }
  }

  async function deny(id: string) {
    setBusyId(id);
    setError("");
    try {
      await denyStoreClaimRequestOnline(id, notes[id] ?? "");
      setRows((current) =>
        filter === "pending" ? current.filter((row) => row.id !== id) : current.map((row) => (row.id === id ? { ...row, status: "denied" } : row)),
      );
    } catch (err) {
      setError(friendlyUserError(err, "Could not deny claim"));
    } finally {
      setBusyId(null);
    }
  }

  if (!enabled) {
    return (
      <section className="page">
        <button type="button" className="text-button" onClick={onBack}>
          ← Back
        </button>
        <EmptyState
          title="Claim queue access required"
          body="Shop owners see claims on their shops. Moderators can review directory placeholder claims."
          action="Account"
          onAction={onBack}
        />
      </section>
    );
  }

  return (
    <section className="page" data-testid="claims-queue">
      <button type="button" className="text-button" onClick={onBack}>
        ← Account
      </button>
      <SectionHeader eyebrow="Moderation" title="Shop claim queue" />
      <p className="feed-rank-note">
        Approve real owners claiming directory shops, or deny weak requests. Decisions are recorded with your note.
      </p>

      <div className="sal-filter-row" role="tablist" aria-label="Filter claims">
        {(
          [
            ["pending", "Pending"],
            ["approved", "Approved"],
            ["denied", "Denied"],
            ["all", "All"],
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
        <button type="button" className="secondary" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>

      {error ? (
        <p className="field-help error-text" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="field-help">Loading claims…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="No claims in this filter" body="When stitchers claim a directory shop, pending requests show up here." />
      ) : (
        <div className="claim-queue-list">
          {rows.map((row) => (
            <article key={row.id} className="panel claim-queue-card" data-testid="claim-queue-card">
              <div className="claim-queue-head">
                <div>
                  <strong>{row.storeName}</strong>
                  <p className="field-help">
                    {row.storeHandle ? `@${row.storeHandle}` : "no handle"} · {placeLine(row)}
                  </p>
                </div>
                <span className={`sal-status sal-status-${row.status === "pending" ? "active" : "ended"}`}>{row.status}</span>
              </div>
              <p>
                Claimant:{" "}
                <strong>
                  {row.requesterName || "Stitcher"}
                  {row.requesterHandle ? ` (@${row.requesterHandle})` : ""}
                </strong>
              </p>
              <p className="field-help">Requested {formatWhen(row.createdAt)}</p>
              {row.message ? <p className="claim-queue-message">{row.message}</p> : <p className="field-help">No message from claimant.</p>}
              {row.status === "pending" ? (
                <>
                  <label className="field">
                    <span className="label-text">Decision note (optional)</span>
                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={notes[row.id] ?? ""}
                      onChange={(e) => setNotes((current) => ({ ...current, [row.id]: e.target.value }))}
                      placeholder="Why approve or deny?"
                    />
                  </label>
                  <div className="card-actions wrap">
                    {row.storeHandle && onOpenStore ? (
                      <button type="button" className="secondary" onClick={() => onOpenStore(row.storeHandle)}>
                        View shop
                      </button>
                    ) : null}
                    <button type="button" className="primary" disabled={busyId === row.id} onClick={() => void approve(row.id)}>
                      {busyId === row.id ? "Working…" : "Approve owner"}
                    </button>
                    <button type="button" className="secondary" disabled={busyId === row.id} onClick={() => void deny(row.id)}>
                      Deny
                    </button>
                  </div>
                </>
              ) : (
                <p className="field-help">
                  {row.decisionNote ? `Note: ${row.decisionNote}` : "No decision note."}
                  {row.decidedAt ? ` · ${formatWhen(row.decidedAt)}` : ""}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
