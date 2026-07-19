import { Bookmark, CalendarDays, Home, Plus, Search, Sparkles, Store as StoreIcon, UserRound } from "lucide-react";
import type { View } from "../appModel";

export function Sidebar({
  view,
  setView,
  savedCount,
  canPost = true,
}: {
  view: string;
  setView: (view: View) => void;
  savedCount: number;
  /** When false (signed-out online guest), hide New post + Onboarding from nav. */
  canPost?: boolean;
}) {
  // Order matters on mobile: only the first 5 items appear in the bottom bar
  // (see styles.css `.sidebar nav button:nth-child(n + 6)`).
  // Guests: Studio · Discover · Shops · Saved · Account (no create / onboarding).
  // Signed-in: Studio · Discover · Shops · New post · Account.
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
          return (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={item.action}>
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
