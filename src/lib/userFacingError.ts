/** Map raw PostgREST/Postgres/network errors to guest-safe copy. */
export function friendlyUserError(error: unknown, fallback: string): string {
  const raw =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message || "")
      : error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "";
  const msg = raw.trim();
  if (!msg) return fallback;
  if (
    /ambiguous|column reference|relation |syntax error|permission denied|PGRST|JWT|function .* does not exist|duplicate key|violates |failed to fetch|NetworkError|Load failed/i.test(
      msg,
    )
  ) {
    return fallback;
  }
  // Keep short product-facing messages
  if (msg.length <= 140 && !/[\"'].*_id|SELECT |INSERT |UPDATE /i.test(msg)) return msg;
  return fallback;
}
