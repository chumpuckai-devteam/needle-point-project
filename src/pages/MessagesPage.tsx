import { FormEvent, useEffect, useMemo, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import type { DmMessage, DmThread } from "../api/dms";
import { EmptyState, SectionHeader } from "../components/ui";
import type { View } from "../appModel";

function formatWhen(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function MessagesInboxView({
  threads,
  loading,
  error,
  canUse,
  setView,
  onOpenThread,
}: {
  threads: DmThread[];
  loading?: boolean;
  error?: string;
  canUse: boolean;
  setView: (view: View) => void;
  onOpenThread: (threadId: string) => void;
}) {
  if (!canUse) {
    return (
      <section className="page">
        <SectionHeader eyebrow="Community" title="Messages" />
        <EmptyState
          variant="panel"
          minHeight={240}
          title="Sign in to message"
          body="Private chats with stitchers and shops live here."
          action="Account / sign in"
          onAction={() => setView({ name: "auth" })}
        />
      </section>
    );
  }

  return (
    <section className="page">
      <SectionHeader eyebrow="Community" title="Messages" />
      <p className="feed-rank-note">Private 1:1 chats with people and shops. No group blasts.</p>
      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="field-help">Loading conversations…</p> : null}
      {!loading && !threads.length ? (
        <EmptyState
          variant="panel"
          minHeight={220}
          title="No conversations yet"
          body="Open a profile or shop and tap Message to start."
          action="Browse shops"
          onAction={() => setView({ name: "stores" })}
        />
      ) : (
        <ul className="dm-thread-list" data-testid="dm-thread-list">
          {threads.map((thread) => {
            const unread = thread.unreadCount ?? 0;
            return (
              <li key={thread.id}>
                <button
                  type="button"
                  className={`panel dm-thread-row${unread > 0 ? " dm-thread-unread" : ""}`}
                  onClick={() => onOpenThread(thread.id)}
                >
                  <span className="dm-thread-avatar" aria-hidden>
                    {thread.otherAvatarUrl ? <img src={thread.otherAvatarUrl} alt="" /> : <MessageCircle size={18} />}
                  </span>
                  <span className="dm-thread-main">
                    <strong>
                      {thread.otherDisplayName || "Chat"}
                      {unread > 0 ? (
                        <span className="dm-unread-pill" aria-label={`${unread} unread`}>
                          {unread > 99 ? "99+" : unread}
                        </span>
                      ) : null}
                    </strong>
                    <small>
                      {thread.kind === "store" ? "Shop chat" : "Direct"}
                      {thread.otherHandle ? ` · @${thread.otherHandle}` : ""}
                    </small>
                    <span className="dm-thread-preview">{thread.lastMessagePreview || "No messages yet"}</span>
                  </span>
                  <span className="dm-thread-when">{formatWhen(thread.lastMessageAt || thread.createdAt)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function MessagesThreadView({
  thread,
  messages,
  viewerId,
  loading,
  error,
  sendBusy,
  sendError,
  onSend,
  onBack,
}: {
  thread: DmThread | null;
  messages: DmMessage[];
  viewerId: string | null;
  loading?: boolean;
  error?: string;
  sendBusy?: boolean;
  sendError?: string;
  onSend: (body: string) => void | Promise<void>;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState("");
  const title = thread?.otherDisplayName || "Conversation";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    await onSend(body);
    setDraft("");
  }

  return (
    <section className="page dm-thread-page">
      <button className="text-button" type="button" onClick={onBack}>
        ← All messages
      </button>
      <div className="panel dm-thread-panel">
        <header className="dm-thread-header">
          <h1>{title}</h1>
          <p className="field-help">
            {thread?.kind === "store" ? "Shop conversation" : "Direct message"}
            {thread?.otherHandle ? ` · @${thread.otherHandle}` : ""}
          </p>
        </header>
        {error ? <p className="form-error">{error}</p> : null}
        {loading ? <p className="field-help">Loading…</p> : null}
        <div className="dm-message-list" data-testid="dm-message-list">
          {messages.map((message) => {
            const mine = Boolean(viewerId && message.senderId === viewerId);
            return (
              <div key={message.id} className={mine ? "dm-bubble mine" : "dm-bubble theirs"}>
                <p>{message.body}</p>
                <small>
                  {mine ? "You" : message.senderName} · {formatWhen(message.createdAt)}
                </small>
              </div>
            );
          })}
          {!loading && !messages.length ? <p className="field-help">Say hello — keep it kind and on-topic.</p> : null}
        </div>
        <form className="dm-compose" onSubmit={(e) => void handleSubmit(e)}>
          {sendError ? <p className="form-error">{sendError}</p> : null}
          <label className="field dm-compose-field">
            <span className="sr-only">Message</span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              maxLength={4000}
              placeholder="Write a private message…"
              required
            />
          </label>
          <button className="primary" type="submit" disabled={sendBusy || !draft.trim()}>
            <Send size={16} /> {sendBusy ? "Sending…" : "Send"}
          </button>
        </form>
      </div>
    </section>
  );
}

export function MessagesRoute({
  threads,
  messagesByThread,
  viewerId,
  canUse,
  loading,
  error,
  sendBusy,
  sendError,
  setView,
  onRefreshThread,
  onSend,
}: {
  threads: DmThread[];
  messagesByThread: Record<string, DmMessage[]>;
  viewerId: string | null;
  canUse: boolean;
  loading?: boolean;
  error?: string;
  sendBusy?: boolean;
  sendError?: string;
  setView: (view: View) => void;
  onRefreshThread: (threadId: string) => void;
  onSend: (threadId: string, body: string) => void | Promise<void>;
}) {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const thread = useMemo(() => threads.find((t) => t.id === threadId) ?? null, [threads, threadId]);

  useEffect(() => {
    if (threadId) onRefreshThread(threadId);
  }, [threadId, onRefreshThread]);

  if (!threadId) {
    return (
      <MessagesInboxView
        threads={threads}
        loading={loading}
        error={error}
        canUse={canUse}
        setView={setView}
        onOpenThread={(id) => navigate(`/messages/${id}`)}
      />
    );
  }

  if (!canUse) {
    return (
      <MessagesInboxView
        threads={[]}
        canUse={false}
        setView={setView}
        onOpenThread={() => undefined}
      />
    );
  }

  return (
    <MessagesThreadView
      thread={thread}
      messages={messagesByThread[threadId] ?? []}
      viewerId={viewerId}
      loading={loading}
      error={error}
      sendBusy={sendBusy}
      sendError={sendError}
      onSend={(body) => onSend(threadId, body)}
      onBack={() => navigate("/messages")}
    />
  );
}
