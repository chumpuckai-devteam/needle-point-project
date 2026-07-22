import { useEffect, useId, useState } from "react";
import {
  Bookmark,
  CalendarDays,
  CircleHelp,
  Home,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  Store as StoreIcon,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import type { View } from "../appModel";
import { useHelpTipsOptional } from "../context/HelpTipsContext";
import { HOME_BRAND, HOME_TAB } from "../lib/brand";

type NavItem = {
  id: string;
  label: string;
  icon: typeof Home;
  action: () => void;
  badge?: number;
};

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
  const [moreOpen, setMoreOpen] = useState(false);
  const titleId = useId();
  const help = useHelpTipsOptional();
  const forceMoreOpen = Boolean(help?.forceMoreOpen);

  useEffect(() => {
    // Don't collapse More while a coach mark needs items inside the sheet.
    if (forceMoreOpen) return;
    setMoreOpen(false);
  }, [view, forceMoreOpen]);

  useEffect(() => {
    if (forceMoreOpen) setMoreOpen(true);
  }, [forceMoreOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => {
      // Help coach owns Escape while active.
      if (help?.active) return;
      if (event.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen, help?.active]);

  const go = (next: View) => {
    if (!forceMoreOpen) setMoreOpen(false);
    setView(next);
  };

  const messagesLabel =
    messagesUnread > 0 ? `Messages (${messagesUnread > 99 ? "99+" : messagesUnread})` : "Messages";

  /** Mobile bottom bar: exactly 4 slots — Palace, Discover, Shops, More. */
  const primary: NavItem[] = [
    { id: "home", label: HOME_TAB, icon: Home, action: () => go({ name: "home" }) },
    { id: "discover", label: "Discover", icon: Search, action: () => go({ name: "discover" }) },
    { id: "stores", label: "Shops", icon: StoreIcon, action: () => go({ name: "stores" }) },
  ];

  const more: NavItem[] = [
    ...(canPost
      ? [
          {
            id: "journal",
            label: "New post",
            icon: Plus,
            action: () => go({ name: "journal" }),
          } satisfies NavItem,
        ]
      : []),
    {
      id: "collections",
      label: `Saved boards (${savedCount})`,
      icon: Bookmark,
      action: () => go({ name: "collections" }),
    },
    {
      id: "messages",
      label: messagesLabel,
      icon: MessageCircle,
      action: () => go({ name: "messages" }),
      badge: messagesUnread,
    },
    { id: "meetups", label: "Meetups", icon: UsersRound, action: () => go({ name: "meetups" }) },
    {
      id: "stitchAlong",
      label: "Stitch-along",
      icon: CalendarDays,
      action: () => go({ name: "stitchAlong" }),
    },
    { id: "auth", label: "Account", icon: UserRound, action: () => go({ name: "auth" }) },
    {
      id: "helpTips",
      label: "Help tips",
      icon: CircleHelp,
      action: () => {
        setMoreOpen(false);
        help?.startTour();
      },
    },
    ...(canPost
      ? [
          {
            id: "onboarding",
            label: "Onboarding",
            icon: Sparkles,
            action: () => go({ name: "onboarding" }),
          } satisfies NavItem,
        ]
      : []),
  ];

  /** Desktop sidebar: full list without a sheet. */
  const desktopItems = [...primary, ...more];

  const isActive = (item: NavItem) =>
    view === item.id ||
    (item.id === "meetups" && (view === "meetup" || view === "meetups")) ||
    (item.id === "messages" && view === "messages") ||
    (item.id === "collections" && view === "collections") ||
    (item.id === "auth" && view === "auth") ||
    (item.id === "journal" && view === "journal");

  const moreSectionActive = more.some(isActive);

  const anchorFor = (id: string): string | undefined => {
    if (id === "home") return "nav-studio";
    if (id === "discover") return "nav-discover";
    if (id === "stores") return "nav-shops";
    if (id === "collections") return "nav-saved";
    if (id === "meetups") return "nav-meetups";
    if (id === "messages") return "nav-messages";
    if (id === "helpTips") return "nav-help";
    return undefined;
  };

  function renderButton(item: NavItem, opts?: { showLabel?: boolean }) {
    const Icon = item.icon;
    const active = isActive(item);
    const badge = Number(item.badge || 0);
    const anchor = anchorFor(item.id);
    return (
      <button
        key={item.id}
        type="button"
        className={active ? "active" : ""}
        onClick={item.action}
        data-help-anchor={anchor}
      >
        <Icon size={18} />
        <span className="nav-label">
          {item.id === "messages" && !opts?.showLabel ? "Messages" : item.label}
          {item.id === "messages" && badge > 0 ? (
            <span className="nav-unread-badge" data-testid="messages-unread-badge" aria-label={`${badge} unread`}>
              {badge > 99 ? "99+" : badge}
            </span>
          ) : null}
        </span>
      </button>
    );
  }

  return (
    <aside className={`sidebar${moreOpen ? " more-open" : ""}`}>
      <button className="brand" type="button" onClick={() => go({ name: "home" })} aria-label={`Go to ${HOME_BRAND}`}>
        <span className="brand-mark">NP</span>
        <span>
          <strong>Needlepoint</strong>
          <small>Palace</small>
        </span>
      </button>

      <nav className="sidebar-nav-desktop" aria-label="Primary navigation">
        {desktopItems.map((item) => renderButton(item, { showLabel: true }))}
      </nav>

      <nav className="sidebar-nav-mobile" aria-label="Mobile navigation">
        {primary.map((item) => renderButton(item))}
        <button
          type="button"
          className={moreOpen || moreSectionActive ? "active more-toggle" : "more-toggle"}
          aria-expanded={moreOpen}
          aria-controls="mobile-more-sheet"
          data-testid="mobile-more-nav"
          data-help-anchor="nav-more"
          onClick={() => setMoreOpen((open) => !open)}
        >
          {moreOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          <span className="nav-label">More</span>
          {!moreOpen && messagesUnread > 0 ? (
            <span className="nav-unread-badge more-toggle-badge" aria-label={`${messagesUnread} unread`}>
              {messagesUnread > 99 ? "99+" : messagesUnread}
            </span>
          ) : null}
        </button>
      </nav>

      {moreOpen ? (
        <div
          className="mobile-more-backdrop"
          role="presentation"
          onClick={() => {
            if (!forceMoreOpen) setMoreOpen(false);
          }}
        />
      ) : null}

      <div
        id="mobile-more-sheet"
        className="mobile-more-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        hidden={!moreOpen}
      >
        <div className="mobile-more-sheet-head">
          <h2 id={titleId}>More</h2>
          <button
            type="button"
            className="mobile-more-close"
            onClick={() => {
              if (!forceMoreOpen) setMoreOpen(false);
            }}
          >
            Close
          </button>
        </div>
        <p className="mobile-more-help">Saved boards, messages, meetups, and account.</p>
        <div className="mobile-more-grid">
          {more.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            const badge = Number(item.badge || 0);
            const anchor = anchorFor(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={active ? "mobile-more-item active" : "mobile-more-item"}
                onClick={item.action}
                data-help-anchor={anchor}
              >
                <Icon size={20} aria-hidden />
                <span className="mobile-more-item-label">
                  {item.label}
                  {item.id === "messages" && badge > 0 ? (
                    <span className="nav-unread-badge" aria-label={`${badge} unread`}>
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
