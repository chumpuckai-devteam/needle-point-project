import { Bell } from "lucide-react";
import type { AppNotification } from "../api/notifications";

export function NotificationsPanel({
  items,
  onOpen,
  onDismissAll,
}: {
  items: AppNotification[];
  onOpen: (item: AppNotification) => void;
  onDismissAll?: () => void;
}) {
  if (!items.length) return null;
  const unread = items.filter((n) => !n.readAt);

  return (
    <section className="notifications-panel panel" aria-label="Notifications" data-testid="notifications-panel">
      <div className="notifications-panel-head">
        <strong>
          <Bell size={16} aria-hidden /> Notifications
          {unread.length ? ` · ${unread.length} new` : ""}
        </strong>
        {unread.length && onDismissAll ? (
          <button type="button" className="secondary notifications-mark-all" onClick={onDismissAll}>
            Mark all read
          </button>
        ) : null}
      </div>
      <ul className="notifications-list">
        {items.slice(0, 8).map((item) => {
          const isUnread = !item.readAt;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`notifications-item${isUnread ? " is-unread" : ""}`}
                onClick={() => onOpen(item)}
              >
                <span className="notifications-item-title">{item.title}</span>
                {item.body ? <span className="notifications-item-body">{item.body}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
