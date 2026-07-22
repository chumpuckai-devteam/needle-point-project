import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { NotificationsPanel } from "../components/NotificationsPanel";
import { HelpCoach } from "../components/HelpCoach";
import type { AppNotification } from "../api/notifications";
import type { View } from "../appModel";
import { viewNameForPath } from "./navigation";

type AppLayoutProps = {
  savedCount: number;
  messagesUnread?: number;
  setView: (view: View) => void;
  /** When false, hide New post from primary nav (signed-out guests). */
  canPost?: boolean;
  /** Global status / error banner text (empty = hidden). */
  banner?: string;
  /** Info-styled banner (share notices) vs error. */
  bannerInfo?: boolean;
  notifications?: AppNotification[];
  onOpenNotification?: (item: AppNotification) => void;
  onDismissAllNotifications?: () => void;
  children: ReactNode;
};

/**
 * Chrome shell: primary nav + main content column.
 * Route bodies render as children; no product logic here.
 * HelpTipsProvider lives in app/providers (single instance for Account + coach).
 */
export function AppLayout({
  savedCount,
  messagesUnread = 0,
  setView,
  canPost = true,
  banner = "",
  bannerInfo = false,
  notifications = [],
  onOpenNotification,
  onDismissAllNotifications,
  children,
}: AppLayoutProps) {
  const location = useLocation();
  const unread = notifications.filter((n) => !n.readAt);

  return (
    <div className="app-shell">
      <Sidebar
        view={viewNameForPath(location.pathname)}
        setView={setView}
        savedCount={savedCount}
        messagesUnread={messagesUnread}
        canPost={canPost}
      />
      <main>
        {banner ? (
          <div className="page" style={{ paddingBottom: 0 }}>
            <p className={`app-banner ${bannerInfo ? "app-banner-info" : "app-banner-error"}`} role="status">
              {banner}
            </p>
          </div>
        ) : null}
        {unread.length > 0 && onOpenNotification ? (
          <div className="page" style={{ paddingBottom: 0 }} data-testid="notifications-rail">
            <NotificationsPanel
              items={notifications}
              onOpen={onOpenNotification}
              onDismissAll={onDismissAllNotifications}
            />
          </div>
        ) : null}
        {children}
      </main>
      <HelpCoach />
    </div>
  );
}
