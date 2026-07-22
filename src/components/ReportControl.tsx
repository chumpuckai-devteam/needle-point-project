import { FormEvent, useState } from "react";
import { Flag } from "lucide-react";
import { friendlyReportError, type ReportReason, type ReportTargetType } from "../api/reports";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "hate", label: "Hate or slurs" },
  { value: "scam", label: "Scam or fraud" },
  { value: "nudity", label: "Nudity" },
  { value: "self_harm", label: "Self-harm" },
  { value: "illegal", label: "Illegal content" },
  { value: "other", label: "Other" },
];

export function ReportControl({
  targetType,
  targetId,
  targetLabel,
  onSubmit,
  disabled,
}: {
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string;
  onSubmit: (input: {
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportReason;
    notes: string;
    targetLabel: string;
  }) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit({
        targetType,
        targetId,
        reason,
        notes,
        targetLabel: targetLabel ?? "",
      });
      setDone(true);
      setOpen(false);
      setNotes("");
    } catch (err) {
      setError(friendlyReportError(err, "Could not submit report."));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="field-help success-text" role="status" data-testid="report-thanks">
        Thanks — your report is queued. You can check status under Account → Your reports.
      </p>
    );
  }

  return (
    <div className="report-control">
      <button className="secondary report-trigger" type="button" disabled={disabled} onClick={() => setOpen((v) => !v)}>
        <Flag size={15} aria-hidden /> {open ? "Cancel report" : "Report"}
      </button>
      {open ? (
        <form className="report-form panel" onSubmit={(e) => void handleSubmit(e)}>
          <p className="field-help">
            Reports go to moderators. Please don’t report content you simply dislike — abuse of reporting may be limited.
          </p>
          <label className="field">
            <span className="label-text">Reason</span>
            <select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)} required>
              {REASONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label-text">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="What should reviewers know?"
            />
          </label>
          {error ? (
            <p className="field-help error-text" role="alert">
              {error}
            </p>
          ) : null}
          <button className="primary" type="submit" disabled={busy || disabled}>
            {busy ? "Sending…" : "Submit report"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
