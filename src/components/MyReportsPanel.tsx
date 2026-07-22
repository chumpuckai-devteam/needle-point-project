import { useEffect, useState } from "react";
import { fetchMyReportsOnline, friendlyReportError, type ReportSubmission } from "../api/reports";
import { EmptyState } from "./ui";

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

function statusLabel(status: string) {
  if (status === "open" || status === "queued") return "In review";
  if (status === "reviewed") return "Reviewed";
  if (status === "dismissed") return "Closed";
  return status;
}

export function MyReportsPanel({ enabled }: { enabled: boolean }) {
  const [rows, setRows] = useState<ReportSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    void fetchMyReportsOnline()
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .catch((err) => {
        if (!cancelled) setError(friendlyReportError(err, "Could not load your reports"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="panel my-reports-panel" data-testid="my-reports-panel">
      <h2>Your reports</h2>
      <p className="field-help">Status of items you’ve flagged. Moderators review open reports.</p>
      {loading ? <p className="field-help">Loading…</p> : null}
      {error ? (
        <p className="field-help error-text" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState variant="compact" minHeight={80} title="No reports yet" body="Use Report on a project, profile, or shop if something looks wrong." />
      ) : null}
      <ul className="my-reports-list">
        {rows.map((row) => (
          <li key={row.id}>
            <strong>
              {row.targetLabel || row.targetType} · {REASON_LABEL[row.reason] ?? row.reason}
            </strong>
            <span className="field-help">
              {statusLabel(row.status)}
              {row.decisionNote ? ` · ${row.decisionNote}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
