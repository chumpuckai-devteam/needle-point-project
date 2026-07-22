import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { MessageCircle, X } from "lucide-react";
import type { Creator, Project } from "../types";
import { projectCommentCount } from "../appModel";

/**
 * X-style text comment sheet opened from the feed comment bubble.
 * Text only — no media attachments.
 */
export function CommentComposerDialog({
  open,
  project,
  creator,
  canComment,
  busy = false,
  error = "",
  onClose,
  onSubmit,
  onSignIn,
  onViewPost,
}: {
  open: boolean;
  project: Project;
  creator: Creator;
  canComment: boolean;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (body: string) => void | Promise<void>;
  onSignIn: () => void;
  onViewPost: () => void;
}) {
  const titleId = useId();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [body, setBody] = useState("");
  const [localError, setLocalError] = useState("");

  const latestUpdate = project.updates[0];
  const comments = latestUpdate?.comments ?? [];
  const commentsOpen = Boolean(latestUpdate);
  const total = projectCommentCount(project);

  useEffect(() => {
    if (!open) return;
    setBody("");
    setLocalError("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, project.id, onClose]);

  if (!open) return null;

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    const text = body.trim();
    if (!text) {
      setLocalError("Write a short comment first.");
      return;
    }
    if (!canComment) {
      onSignIn();
      return;
    }
    if (!commentsOpen) {
      setLocalError("Comments open after the first progress update on this project.");
      return;
    }
    setLocalError("");
    try {
      await onSubmit(text);
      setBody("");
      onClose();
    } catch {
      // Parent surfaces friendly error via `error` prop if needed
    }
  }

  return (
    <div className="comment-composer-root" data-testid="comment-composer" role="presentation">
      <div className="comment-composer-backdrop" aria-hidden onClick={onClose} />
      <div
        className="comment-composer-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="comment-composer-head">
          <p className="comment-composer-kicker">
            <MessageCircle size={15} aria-hidden /> Reply
          </p>
          <button type="button" className="comment-composer-close" onClick={onClose} aria-label="Close comment">
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="comment-composer-context">
          <img src={creator.avatar || "/assets/needlepoint-hero.png"} alt="" className="comment-composer-avatar" />
          <div>
            <strong id={titleId}>
              {creator.name} <span className="comment-composer-handle">@{creator.handle}</span>
            </strong>
            <p className="comment-composer-excerpt">{project.title || project.notes || "Project"}</p>
          </div>
        </div>

        {comments.length > 0 ? (
          <ul className="comment-composer-thread" aria-label="Recent comments">
            {comments.slice(-5).map((comment) => (
              <li key={comment.id}>
                <b>{comment.author}</b> {comment.body}
              </li>
            ))}
          </ul>
        ) : (
          <p className="field-help comment-composer-empty">
            {total === 0 ? "No comments yet — be the first." : `${total} comment${total === 1 ? "" : "s"} on this project.`}
          </p>
        )}

        {!canComment ? (
          <div className="comment-composer-guest">
            <p className="field-help">Sign in to leave a text comment.</p>
            <button type="button" className="primary" onClick={onSignIn}>
              Sign in to comment
            </button>
          </div>
        ) : !commentsOpen ? (
          <p className="field-help" role="status">
            Comments open after the first progress update on this project.
          </p>
        ) : (
          <form className="comment-composer-form" onSubmit={(e) => void handleSubmit(e)}>
            <label className="sr-only" htmlFor={`${titleId}-input`}>
              Your comment
            </label>
            <textarea
              id={`${titleId}-input`}
              ref={inputRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Post your reply"
              data-testid="comment-composer-input"
            />
            <div className="comment-composer-actions">
              <button type="button" className="text-button" onClick={onViewPost}>
                View full post
              </button>
              <button type="submit" className="primary" disabled={busy || !body.trim()} data-testid="comment-composer-post">
                {busy ? "Posting…" : "Reply"}
              </button>
            </div>
          </form>
        )}

        {localError || error ? (
          <p className="field-help error-text" role="alert">
            {localError || error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
