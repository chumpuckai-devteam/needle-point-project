import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";

export type ReportTargetType = "project" | "profile" | "store";
export type ReportReason = "spam" | "harassment" | "hate" | "scam" | "nudity" | "self_harm" | "illegal" | "other";
export type ReportStatus = "queued" | "open" | "reviewed" | "dismissed";

export type ReportInput = {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  notes?: string;
  targetLabel?: string;
};

export type ReportSubmission = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  notes: string;
  targetLabel: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
};

type DbReport = {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  notes: string;
  target_label: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
};

const reportTargetTypes = new Set<ReportTargetType>(["project", "profile", "store"]);
const reportReasons = new Set<ReportReason>([
  "spam",
  "harassment",
  "hate",
  "scam",
  "nudity",
  "self_harm",
  "illegal",
  "other",
]);

function mapReport(row: DbReport): ReportSubmission {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    notes: row.notes,
    targetLabel: row.target_label,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function validateReportInput(input: ReportInput): Required<ReportInput> {
  const targetType = input.targetType;
  const targetId = (input.targetId ?? "").trim();
  const reason = input.reason;
  const notes = (input.notes ?? "").trim();
  const targetLabel = (input.targetLabel ?? "").trim();

  if (!reportTargetTypes.has(targetType)) throw new Error("Choose a valid report target.");
  if (!targetId) throw new Error("Report target is required.");
  if (!reportReasons.has(reason)) throw new Error("Choose a valid report reason.");
  if (notes.length > 1000) throw new Error("Report notes must be 1000 characters or less.");
  if (targetLabel.length > 160) throw new Error("Report label must be 160 characters or less.");

  return { targetType, targetId, reason, notes, targetLabel };
}

/** Submit an authenticated moderation report. The database sets the actor from auth.uid(). */
export async function submitReportOnline(input: ReportInput): Promise<ReportSubmission | null> {
  const normalized = validateReportInput(input);
  if (!isSupabaseConfigured) return null;

  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Sign in to submit a report.");

  const { data, error } = await client.rpc("submit_report", {
    p_target_type: normalized.targetType,
    p_target_id: normalized.targetId,
    p_reason: normalized.reason,
    p_notes: normalized.notes,
    p_target_label: normalized.targetLabel,
  });
  if (error) throw error;
  return data ? mapReport(data as DbReport) : null;
}

/** Admin/moderator queue read path; RLS returns rows only to authorized users. */
export async function fetchReportQueueOnline(): Promise<ReportSubmission[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data, error } = await client.from("reports").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as DbReport[] | null) ?? []).map(mapReport);
}
