import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";

export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  meetupId?: string | null;
  readAt?: string | null;
  createdAt: string;
};

function mapRow(row: Record<string, unknown>): AppNotification {
  return {
    id: String(row.id),
    kind: String(row.kind ?? "general"),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    href: String(row.href ?? ""),
    meetupId: (row.meetup_id as string | null) ?? null,
    readAt: (row.read_at as string | null) ?? null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function listMyNotificationsOnline(limit = 30): Promise<AppNotification[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data, error } = await client.rpc("list_my_notifications", { p_limit: limit });
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map(mapRow);
}

export async function markNotificationReadOnline(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const client = requireSupabase();
  const { error } = await client.rpc("mark_notification_read", { p_id: id });
  if (error) throw error;
}

export async function markAllNotificationsReadOnline(): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const client = requireSupabase();
  const { data, error } = await client.rpc("mark_all_notifications_read");
  if (error) throw error;
  return Number(data) || 0;
}

export function unreadNotifications(items: AppNotification[]): AppNotification[] {
  return items.filter((n) => !n.readAt);
}
