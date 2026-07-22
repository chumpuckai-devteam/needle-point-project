import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { MessageCircle, Paperclip, Send, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import type { DmMessage, DmThread } from "../api/dms";
import { EmptyState, SectionHeader } from "../components/ui";
import type { View } from "../appModel";
import type { Creator } from "../types";

function formatWhen(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function threadKindLabel(thread: DmThread) {
  if (thread.kind === "store") return "Shop chat";
  if (thread.kind === "group") return `${thread.memberCount || 0} members`;
  return "Direct";
}

function isImageAttachment(attachment: { mimeType: string }) {
  return attachment.mimeType.startsWith("image/");
}

export function MessagesInboxView({
  threads,
  loading,
  error,
  canUse,
  setView,
  onOpenThread,
  creators,
  viewerId,
  onCreateGroup,
}: {
  threads: DmThread[];
  loading?: boolean;
  error?: string;
  canUse: boolean;
  setView: (view: View) => void;
  onOpenThread: (threadId: string) => void;
  creators: Creator[];
  viewerId: string | null;
  onCreateGroup: (memberUserIds: string[], title: string) => void | Promise<void>;
}) {
  const [showGroup, setShowGroup] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const groupCandidates = creators.filter((creator) => creator.id !== viewerId).slice(0, 12);

  async function handleCreateGroup(event: FormEvent) {
    event.preventDefault();
    if (!selectedMemberIds.length) return;
    await onCreateGroup(selectedMemberIds, groupTitle.trim());
    setGroupTitle("");
    setSelectedMemberIds([]);
    setShowGroup(false);
  }

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
      <p className="feed-rank-note">Private chats with people, shops, and small groups — updates arrive live.</p>
      <div className="panel dm-group-composer">
        <button className="secondary" type="button" onClick={() => setShowGroup((current) => !current)}>
          <Users size={16} /> New group
        </button>
        {showGroup ? (
          <form onSubmit={(event) => void handleCreateGroup(event)}>
            <label className="field">
              <span>Group name</span>
              <input value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} maxLength={80} placeholder="Stitch night planning" />
            </label>
            <fieldset className="store-picker group-member-picker">
              <legend>Members</legend>
              {groupCandidates.map((creator) => (
                <label className="checkbox-field" key={creator.id}>
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(creator.id)}
                    onChange={(event) => {
                      setSelectedMemberIds((current) =>
                        event.target.checked ? [...current, creator.id] : current.filter((id) => id !== creator.id),
                      );
                    }}
                  />
                  <span>
                    {creator.name} <small>@{creator.handle}</small>
                  </span>
                </label>
              ))}
              {!groupCandidates.length ? <p className="field-help">No stitchers loaded yet.</p> : null}
            </fieldset>
            <button className="primary" type="submit" disabled={!selectedMemberIds.length}>
              Create group
            </button>
          </form>
        ) : null}
      </div>
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
                    {thread.otherAvatarUrl ? <img src={thread.otherAvatarUrl} alt="" /> : thread.kind === "group" ? <Users size={18} /> : <MessageCircle size={18} />}
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
                      {threadKindLabel(thread)}
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
  onSend: (body: string, files: File[]) => void | Promise<void>;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const title = thread?.otherDisplayName || "Conversation";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body && !files.length) return;
    await onSend(body, files);
    setDraft("");
    setFiles([]);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []).slice(0, 6));
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
            {thread ? threadKindLabel(thread) : "Direct message"}
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
                {message.body ? <p>{message.body}</p> : null}
                {message.attachments.length ? (
                  <ul className="dm-attachment-list">
                    {message.attachments.map((attachment) => (
                      <li key={attachment.id || attachment.storagePath}>
                        {isImageAttachment(attachment) && attachment.url ? <img src={attachment.url} alt={attachment.fileName} /> : null}
                        <a href={attachment.url || undefined} target="_blank" rel="noreferrer">
                          <Paperclip size={14} /> {attachment.fileName}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <small>
                  {mine ? "You" : message.senderName} · {formatWhen(message.createdAt)}
                </small>
              </div>
            );
          })}
          {!loading && !messages.length ? <p className="field-help">Say hello — keep it kind and on-topic.</p> : null}
        </div>
        <form className="dm-compose" onSubmit={(event) => void handleSubmit(event)}>
          {sendError ? <p className="form-error">{sendError}</p> : null}
          <label className="field dm-compose-field">
            <span className="sr-only">Message</span>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              maxLength={4000}
              placeholder="Write a private message…"
            />
          </label>
          <label className="secondary dm-attach-button">
            <Paperclip size={16} /> Attach file
            <input className="sr-only" type="file" multiple onChange={handleFileChange} />
          </label>
          {files.length ? <p className="field-help">{files.map((file) => file.name).join(", ")}</p> : null}
          <button className="primary" type="submit" disabled={sendBusy || (!draft.trim() && !files.length)}>
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
  creators,
  onCreateGroup,
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
  onSend: (threadId: string, body: string, files: File[]) => void | Promise<void>;
  creators: Creator[];
  onCreateGroup: (memberUserIds: string[], title: string) => void | Promise<void>;
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
        creators={creators}
        viewerId={viewerId}
        onCreateGroup={onCreateGroup}
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
        creators={[]}
        viewerId={viewerId}
        onCreateGroup={() => undefined}
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
      onSend={(body, files) => onSend(threadId, body, files)}
      onBack={() => navigate("/messages")}
    />
  );
}
