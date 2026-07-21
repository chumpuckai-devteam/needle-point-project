import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";

export type DmThread = {
  id: string;
  kind: "direct" | "store";
  userA?: string | null;
  userB?: string | null;
  storeId?: string | null;
  memberUserId?: string | null;
  createdBy: string;
  lastMessageAt?: string | null;
  lastMessagePreview: string;
  createdAt: string;
  otherUserId?: string | null;
  otherDisplayName: string;
  otherHandle: string;
  otherAvatarUrl: string;
  storeName?: string;
  storeHandle?: string;
};

export type DmMessage = {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
  senderName: string;
  senderHandle: string;
};

function mapThread(row: Record<string, unknown>): DmThread {
  return {
    id: String(row.id),
    kind: row.kind === "store" ? "store" : "direct",
    userA: (row.user_a as string) ?? null,
    userB: (row.user_b as string) ?? null,
    storeId: (row.store_id as string) ?? null,
    memberUserId: (row.member_user_id as string) ?? null,
    createdBy: String(row.created_by ?? ""),
    lastMessageAt: (row.last_message_at as string) ?? null,
    lastMessagePreview: String(row.last_message_preview ?? ""),
    createdAt: String(row.created_at ?? ""),
    otherUserId: (row.other_user_id as string) ?? null,
    otherDisplayName: String(row.other_display_name ?? "Chat"),
    otherHandle: String(row.other_handle ?? ""),
    otherAvatarUrl: String(row.other_avatar_url ?? ""),
    storeName: String(row.store_name ?? ""),
    storeHandle: String(row.store_handle ?? ""),
  };
}

function mapMessage(row: Record<string, unknown>): DmMessage {
  return {
    id: String(row.id),
    threadId: String(row.thread_id),
    senderId: String(row.sender_id),
    body: String(row.body ?? ""),
    createdAt: String(row.created_at ?? ""),
    senderName: String(row.sender_name ?? "Stitcher"),
    senderHandle: String(row.sender_handle ?? ""),
  };
}

export async function listMyDmThreadsOnline(limit = 50): Promise<DmThread[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data, error } = await client.rpc("list_my_dm_threads", { p_limit: limit });
  if (error) throw new Error(error.message || "Could not load messages");
  return ((data as Record<string, unknown>[] | null) ?? []).map(mapThread);
}

export async function listDmMessagesOnline(threadId: string, limit = 100): Promise<DmMessage[]> {
  if (!isSupabaseConfigured || !threadId) return [];
  const client = requireSupabase();
  const { data, error } = await client.rpc("list_dm_messages", { p_thread_id: threadId, p_limit: limit });
  if (error) throw new Error(error.message || "Could not load conversation");
  return ((data as Record<string, unknown>[] | null) ?? []).map(mapMessage);
}

export async function openDmWithUserOnline(otherUserId: string): Promise<DmThread> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("open_dm_thread_with_user", { p_other_user_id: otherUserId });
  if (error) throw new Error(error.message || "Could not open conversation");
  const row = data as Record<string, unknown>;
  return mapThread({
    ...row,
    other_user_id: otherUserId,
    other_display_name: "Stitcher",
    other_handle: "",
    other_avatar_url: "",
  });
}

export async function openDmWithStoreOnline(storeId: string): Promise<DmThread> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("open_dm_thread_with_store", { p_store_id: storeId });
  if (error) throw new Error(error.message || "Could not message this shop");
  const row = data as Record<string, unknown>;
  return mapThread({
    ...row,
    other_display_name: "Shop",
    other_handle: "",
    other_avatar_url: "",
  });
}

export async function sendDmMessageOnline(threadId: string, body: string): Promise<DmMessage> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("send_dm_message", { p_thread_id: threadId, p_body: body });
  if (error) throw new Error(error.message || "Could not send message");
  const row = data as Record<string, unknown>;
  return mapMessage({
    ...row,
    sender_name: "You",
    sender_handle: "",
  });
}
