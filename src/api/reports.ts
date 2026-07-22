import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";

export type ReportTargetType = "project" | "profile" | "store" | "comment";
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
  decisionNote?: string;
  reviewedAt?: string | null;
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
  decision_note?: string | null;
  reviewed_at?: string | null;
};

const reportTargetTypes = new Set<ReportTargetType>(["project", "profile", "store", "comment"]);
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
    decisionNote: row.decision_note ?? "",
    reviewedAt: row.reviewed_at ?? null,
  };
}

export function friendlyReportError(error: unknown, fallback = "Could not submit report"): string {
  const raw =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message ?? "")
      : error instanceof Error
        ? error.message
        : String(error ?? "");
  const lower = raw.toLowerCase();
  if (lower.includes("already submitted") || lower.includes("duplicate") || lower.includes("23505")) {
    return "You already have an open report on this item. We’ll review it soon.";
  }
  if (lower.includes("please wait") || lower.includes("42900") || lower.includes("rate")) {
    return "Please wait a moment before submitting another report.";
  }
  if (lower.includes("authentication") || lower.includes("sign in") || lower.includes("jwt")) {
    return "Sign in to submit a report.";
  }
  if (lower.includes("moderator access")) {
    return "You don’t have moderator access.";
  }
  if (!raw || lower.includes("column") || lower.includes("sql") || lower.includes("postgres")) {
    return fallback;
  }
  // Prefer short human messages from the DB already.
  if (raw.length <= 140 && !lower.includes("violates")) return raw;
  return fallback;
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
export async function fetchReportQueueOnline(status: ReportStatus | "all" = "open"): Promise<ReportSubmission[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  let query = client.from("reports").select("*").order("created_at", { ascending: false }).limit(100);
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return ((data as DbReport[] | null) ?? []).map(mapReport);
}

export async function fetchMyReportsOnline(): Promise<ReportSubmission[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data, error } = await client.rpc("list_my_reports");
  if (error) {
    // Fallback to direct select (own rows via RLS)
    const { data: rows, error: selectError } = await client
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (selectError) throw selectError;
    return ((rows as DbReport[] | null) ?? []).map(mapReport);
  }
  return ((data as DbReport[] | null) ?? []).map(mapReport);
}

export async function reviewReportOnline(
  reportId: string,
  status: Extract<ReportStatus, "reviewed" | "dismissed" | "open">,
  decisionNote = "",
): Promise<ReportSubmission> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("review_report", {
    p_report_id: reportId,
    p_status: status,
    p_decision_note: decisionNote,
  });
  if (error) throw error;
  return mapReport(data as DbReport);
}

/** True when JWT app_metadata marks the user as admin/moderator. */
export function userIsModerator(user: unknown): boolean {
  if (!user || typeof user !== "object") return false;
  const meta = (user as { app_metadata?: Record<string, unknown> | null }).app_metadata;
  if (!meta) return false;
  const role = String(meta.role ?? "");
  if (role === "admin" || role === "moderator") return true;
  const roles = meta.roles;
  if (Array.isArray(roles)) return roles.some((r) => r === "admin" || r === "moderator");
  return false;
}
