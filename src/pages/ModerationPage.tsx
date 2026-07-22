import { useCallback, useEffect, useState } from "react";
import {
  fetchReportQueueOnline,
  friendlyReportError,
  reviewReportOnline,
  type ReportStatus,
  type ReportSubmission,
} from "../api/reports";
import { EmptyState, SectionHeader } from "../components/ui";

const REASON_LABEL: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  hate: "Hate or slurs",
  scam: "Scam or fraud",
  nudity: "Nudity",
  self_harm: "Self-harm",
  illegal: "Illegal content",
  other: "Other",
};

function formatWhen(iso: string) {
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

export function ModerationPage({
  enabled,
  onBack,
}: {
  enabled: boolean;
  onBack: () => void;
}) {
  const [filter, setFilter] = useState<ReportStatus | "all">("open");
  const [rows, setRows] = useState<ReportSubmission[]>([]);
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
      const list = await fetchReportQueueOnline(filter);
      setRows(list);
    } catch (err) {
      setError(friendlyReportError(err, "Could not load the report queue"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, status: "reviewed" | "dismissed") {
    setBusyId(id);
    setError("");
    try {
      const updated = await reviewReportOnline(id, status, notes[id] ?? "");
      setRows((current) =>
        filter === "open" ? current.filter((row) => row.id !== id) : current.map((row) => (row.id === id ? updated : row)),
      );
    } catch (err) {
      setError(friendlyReportError(err, "Could not update report"));
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
          title="Moderator access required"
          body="This queue is only for accounts marked admin or moderator in app metadata."
          action="Account"
          onAction={onBack}
        />
      </section>
    );
  }

  return (
    <section className="page" data-testid="moderation-queue">
      <button type="button" className="text-button" onClick={onBack}>
        ← Account
      </button>
      <SectionHeader eyebrow="Moderation" title="Report queue" />
      <p className="feed-rank-note">Review abuse reports. Mark reviewed when actioned, or dismiss false positives.</p>

      <div className="sal-filter-row" role="tablist" aria-label="Filter reports">
        {(
          [
            ["open", "Open"],
            ["reviewed", "Reviewed"],
            ["dismissed", "Dismissed"],
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
        <p className="field-help">Loading reports…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="No reports in this filter" body="When stitchers flag content, open items show up here." />
      ) : (
        <div className="mod-report-list">
          {rows.map((row) => (
            <article key={row.id} className="panel mod-report-card">
              <div className="mod-report-head">
                <strong>
                  {row.targetType} · {REASON_LABEL[row.reason] ?? row.reason}
                </strong>
                <span className={`sal-status sal-status-${row.status === "open" ? "active" : "ended"}`}>{row.status}</span>
              </div>
              <p className="field-help">
                {row.targetLabel || row.targetId} · {formatWhen(row.createdAt)}
              </p>
              {row.notes ? <p>{row.notes}</p> : <p className="field-help">No notes from reporter.</p>}
              {row.status === "open" ? (
                <>
                  <label className="field">
                    <span className="label-text">Decision note (optional)</span>
                    <textarea
                      rows={2}
                      value={notes[row.id] ?? ""}
                      onChange={(e) => setNotes((current) => ({ ...current, [row.id]: e.target.value }))}
                      maxLength={1000}
                      placeholder="What did you decide?"
                    />
                  </label>
                  <div className="card-actions wrap">
                    <button type="button" className="primary" disabled={busyId === row.id} onClick={() => void decide(row.id, "reviewed")}>
                      Mark reviewed
                    </button>
                    <button type="button" className="secondary" disabled={busyId === row.id} onClick={() => void decide(row.id, "dismissed")}>
                      Dismiss
                    </button>
                  </div>
                </>
              ) : (
                <p className="field-help">
                  {row.decisionNote ? `Note: ${row.decisionNote}` : "No decision note."}
                  {row.reviewedAt ? ` · ${formatWhen(row.reviewedAt)}` : ""}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
