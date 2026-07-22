import type { RealtimeChannel } from "@supabase/supabase-js";
import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";

const DM_ATTACHMENT_BUCKET = "dm-attachments";
const MAX_DM_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export type DmAttachment = {
  id?: string;
  messageId?: string;
  storagePath: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt?: string;
};

export type DmAttachmentInput = Omit<DmAttachment, "id" | "messageId" | "createdAt">;

export type DmThread = {
  id: string;
  kind: "direct" | "store" | "group";
  title?: string;
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
  unreadCount?: number;
  memberCount?: number;
};

export type DmMessage = {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
  senderName: string;
  senderHandle: string;
  attachments: DmAttachment[];
};

export type DmRealtimeEvent = {
  type: "message" | "read";
  threadId?: string;
};

/** Map PostgREST/Postgres internals to guest-safe copy (never show SQL column errors). */
export function friendlyDmError(error: unknown, fallback: string): string {
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
  if (/ambiguous|column reference|relation |syntax error|permission denied|PGRST|JWT|function .* does not exist/i.test(msg)) {
    return fallback;
  }
  // Keep short product-facing RPC exceptions (e.g. "Message cannot be empty")
  if (msg.length <= 120 && !/["'].*_id|SELECT |INSERT /i.test(msg)) return msg;
  return fallback;
}

function mapAttachment(row: Record<string, unknown>): DmAttachment {
  return {
    id: row.id ? String(row.id) : undefined,
    messageId: row.message_id ? String(row.message_id) : undefined,
    storagePath: String(row.storage_path ?? ""),
    url: String(row.url ?? row.signed_url ?? ""),
    fileName: String(row.file_name ?? "Attachment"),
    mimeType: String(row.mime_type ?? "application/octet-stream"),
    sizeBytes: Number(row.size_bytes ?? 0) || 0,
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

function parseAttachments(value: unknown): DmAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")).map(mapAttachment);
}

function mapThread(row: Record<string, unknown>): DmThread {
  const kind = row.kind === "store" ? "store" : row.kind === "group" ? "group" : "direct";
  return {
    id: String(row.id),
    kind,
    title: String(row.title ?? ""),
    userA: (row.user_a as string) ?? null,
    userB: (row.user_b as string) ?? null,
    storeId: (row.store_id as string) ?? null,
    memberUserId: (row.member_user_id as string) ?? null,
    createdBy: String(row.created_by ?? ""),
    lastMessageAt: (row.last_message_at as string) ?? null,
    lastMessagePreview: String(row.last_message_preview ?? ""),
    createdAt: String(row.created_at ?? ""),
    otherUserId: (row.other_user_id as string) ?? null,
    otherDisplayName: String(row.other_display_name ?? (kind === "group" ? "Group thread" : "Chat")),
    otherHandle: String(row.other_handle ?? ""),
    otherAvatarUrl: String(row.other_avatar_url ?? ""),
    storeName: String(row.store_name ?? ""),
    storeHandle: String(row.store_handle ?? ""),
    unreadCount: Number(row.unread_count ?? 0) || 0,
    memberCount: Number(row.member_count ?? 0) || 0,
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
    attachments: parseAttachments(row.attachments),
  };
}

async function signAttachmentUrls(messages: DmMessage[]): Promise<DmMessage[]> {
  if (!isSupabaseConfigured) return messages;
  const client = requireSupabase();
  return Promise.all(
    messages.map(async (message) => {
      if (!message.attachments.length) return message;
      const attachments = await Promise.all(
        message.attachments.map(async (attachment) => {
          if (!attachment.storagePath || attachment.url) return attachment;
          const { data } = await client.storage.from(DM_ATTACHMENT_BUCKET).createSignedUrl(attachment.storagePath, 60 * 60);
          return { ...attachment, url: data?.signedUrl ?? "" };
        }),
      );
      return { ...message, attachments };
    }),
  );
}

export async function listMyDmThreadsOnline(limit = 50): Promise<DmThread[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data, error } = await client.rpc("list_my_dm_threads", { p_limit: limit });
  if (error) throw new Error(friendlyDmError(error, "Could not load messages"));
  return ((data as Record<string, unknown>[] | null) ?? []).map(mapThread);
}

export async function listDmMessagesOnline(threadId: string, limit = 100): Promise<DmMessage[]> {
  if (!isSupabaseConfigured || !threadId) return [];
  const client = requireSupabase();
  const { data, error } = await client.rpc("list_dm_messages", { p_thread_id: threadId, p_limit: limit });
  if (error) throw new Error(friendlyDmError(error, "Could not load conversation"));
  return signAttachmentUrls(((data as Record<string, unknown>[] | null) ?? []).map(mapMessage));
}

export async function markDmThreadReadOnline(threadId: string): Promise<void> {
  if (!isSupabaseConfigured || !threadId) return;
  const client = requireSupabase();
  const { error } = await client.rpc("mark_dm_thread_read", { p_thread_id: threadId });
  if (error) throw new Error(friendlyDmError(error, "Could not update read status"));
}

export async function openDmWithUserOnline(otherUserId: string): Promise<DmThread> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("open_dm_thread_with_user", { p_other_user_id: otherUserId });
  if (error) throw new Error(friendlyDmError(error, "Could not open conversation"));
  const row = data as Record<string, unknown>;
  // Prefer full list row for names; fallback until list refresh
  return mapThread({
    ...row,
    other_user_id: otherUserId,
    other_display_name: "Stitcher",
    other_handle: "",
    other_avatar_url: "",
    unread_count: 0,
  });
}

export async function openDmWithStoreOnline(storeId: string): Promise<DmThread> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("open_dm_thread_with_store", { p_store_id: storeId });
  if (error) throw new Error(friendlyDmError(error, "Could not message this shop"));
  const row = data as Record<string, unknown>;
  return mapThread({
    ...row,
    other_display_name: "Shop",
    other_handle: "",
    other_avatar_url: "",
    unread_count: 0,
  });
}

export async function createGroupDmThreadOnline(memberUserIds: string[], title = ""): Promise<DmThread> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("create_group_dm_thread", {
    p_member_user_ids: memberUserIds,
    p_title: title,
  });
  if (error) throw new Error(friendlyDmError(error, "Could not create group"));
  return mapThread({ ...(data as Record<string, unknown>), kind: "group", other_display_name: title || "Group thread" });
}

export function validateDmAttachmentFile(file: File): string | null {
  if (!file) return "Choose a file to attach.";
  if (file.size <= 0) return "That file is empty.";
  if (file.size > MAX_DM_ATTACHMENT_BYTES) return "Attachment must be 10MB or smaller.";
  return null;
}

export async function uploadDmAttachmentOnline(userId: string, threadId: string, file: File): Promise<DmAttachmentInput> {
  const invalid = validateDmAttachmentFile(file);
  if (invalid) throw new Error(invalid);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "attachment";

  if (!isSupabaseConfigured) {
    return {
      storagePath: `${userId}/${threadId}/${crypto.randomUUID()}-${safeName}`,
      url: URL.createObjectURL(file),
      fileName: file.name || safeName,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    };
  }

  const client = requireSupabase();
  const path = `${userId}/${threadId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await client.storage.from(DM_ATTACHMENT_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  const { data } = await client.storage.from(DM_ATTACHMENT_BUCKET).createSignedUrl(path, 60 * 60);
  return {
    storagePath: path,
    url: data?.signedUrl ?? "",
    fileName: file.name || safeName,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}

export async function sendDmMessageOnline(
  threadId: string,
  body: string,
  attachments: DmAttachmentInput[] = [],
): Promise<DmMessage> {
  const client = requireSupabase();
  // Live beta is M3.B (body-only). Attachment payload is optional until DM-depth migration is applied.
  const payload: Record<string, unknown> = {
    p_thread_id: threadId,
    p_body: body,
  };
  if (attachments.length) {
    payload.p_attachments = attachments.map((attachment) => ({
      storage_path: attachment.storagePath,
      file_name: attachment.fileName,
      mime_type: attachment.mimeType,
      size_bytes: attachment.sizeBytes,
    }));
  }
  let { data, error } = await client.rpc("send_dm_message", payload);
  if (error && attachments.length) {
    // Schema without p_attachments: retry text-only so chat still works
    const retry = await client.rpc("send_dm_message", { p_thread_id: threadId, p_body: body });
    data = retry.data;
    error = retry.error;
    if (!error) {
      return {
        ...mapMessage({
          ...(data as Record<string, unknown>),
          sender_name: "You",
          sender_handle: "",
        }),
        attachments: [],
      };
    }
  }
  if (error) throw new Error(friendlyDmError(error, "Could not send message"));
  const row = data as Record<string, unknown>;
  return {
    ...mapMessage({
      ...row,
      sender_name: "You",
      sender_handle: "",
    }),
    attachments,
  };
}

export function subscribeToDmEventsOnline(onEvent: (event: DmRealtimeEvent) => void): RealtimeChannel | null {
  if (!isSupabaseConfigured) return null;
  const client = requireSupabase();
  return client
    .channel("needlepoint-dm-events")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "dm_messages" },
      (payload) => onEvent({ type: "message", threadId: String((payload.new as { thread_id?: string }).thread_id ?? "") }),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "dm_thread_reads" },
      (payload) => onEvent({ type: "read", threadId: String((payload.new as { thread_id?: string }).thread_id ?? "") }),
    )
    .subscribe();
}

export function totalDmUnread(threads: DmThread[]): number {
  return threads.reduce((sum, t) => sum + (t.unreadCount ?? 0), 0);
}
