import { Bookmark, CalendarDays, Home, MessageCircle, Plus, Search, Sparkles, Store as StoreIcon, UsersRound, UserRound } from "lucide-react";
import type { View } from "../appModel";

export function Sidebar({
  view,
  setView,
  savedCount,
  messagesUnread = 0,
  canPost = true,
}: {
  view: string;
  setView: (view: View) => void;
  savedCount: number;
  messagesUnread?: number;
  /** When false (signed-out online guest), hide New post + Onboarding from nav. */
  canPost?: boolean;
}) {
  // Order matters on mobile: only the first 5 items appear in the bottom bar.
  const messagesLabel =
    messagesUnread > 0
      ? `Messages (${messagesUnread > 99 ? "99+" : messagesUnread})`
      : "Messages";

  const items = [
    { id: "home", label: "Studio", icon: Home, action: () => setView({ name: "home" }) },
    { id: "discover", label: "Discover", icon: Search, action: () => setView({ name: "discover" }) },
    { id: "stores", label: "Shops", icon: StoreIcon, action: () => setView({ name: "stores" }) },
    ...(canPost
      ? [{ id: "journal", label: "New post", icon: Plus, action: () => setView({ name: "journal" }) }]
      : [{ id: "collections", label: `Saved (${savedCount})`, icon: Bookmark, action: () => setView({ name: "collections" }) }]),
    { id: "auth", label: "Account", icon: UserRound, action: () => setView({ name: "auth" }) },
    ...(canPost
      ? [{ id: "collections", label: `Saved (${savedCount})`, icon: Bookmark, action: () => setView({ name: "collections" }) }]
      : []),
    { id: "stitchAlong", label: "Stitch-along", icon: CalendarDays, action: () => setView({ name: "stitchAlong" }) },
    { id: "meetups", label: "Meetups", icon: UsersRound, action: () => setView({ name: "meetups" }) },
    { id: "messages", label: messagesLabel, icon: MessageCircle, action: () => setView({ name: "messages" }), badge: messagesUnread },
    ...(canPost
      ? [{ id: "onboarding", label: "Onboarding", icon: Sparkles, action: () => setView({ name: "onboarding" }) }]
      : []),
  ];

  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => setView({ name: "home" })} aria-label="Go to studio">
        <span className="brand-mark">NP</span>
        <span>
          <strong>Needlepoint</strong>
          <small>visual studio</small>
        </span>
      </button>
      <nav aria-label="Primary navigation">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            view === item.id ||
            (item.id === "meetups" && (view === "meetup" || view === "meetups")) ||
            (item.id === "messages" && view === "messages");
          const badge = "badge" in item ? Number(item.badge || 0) : 0;
          return (
            <button key={item.id} className={active ? "active" : ""} onClick={item.action}>
              <Icon size={18} />
              <span className="nav-label">
                {item.id === "messages" ? "Messages" : item.label}
                {item.id === "messages" && badge > 0 ? (
                  <span className="nav-unread-badge" data-testid="messages-unread-badge" aria-label={`${badge} unread`}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
