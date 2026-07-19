import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import type { View } from "../appModel";
import { viewNameForPath } from "./navigation";

type AppLayoutProps = {
  savedCount: number;
  setView: (view: View) => void;
  /** Global status / error banner text (empty = hidden). */
  banner?: string;
  /** Info-styled banner (share notices) vs error. */
  bannerInfo?: boolean;
  children: ReactNode;
};

/**
 * Chrome shell: primary nav + main content column.
 * Route bodies render as children; no product logic here.
 */
export function AppLayout({ savedCount, setView, banner = "", bannerInfo = false, children }: AppLayoutProps) {
  const location = useLocation();

  return (
    <div className="app-shell">
      <Sidebar view={viewNameForPath(location.pathname)} setView={setView} savedCount={savedCount} />
      <main>
        {banner ? (
          <div className="page" style={{ paddingBottom: 0 }}>
            <p className={`app-banner ${bannerInfo ? "app-banner-info" : "app-banner-error"}`} role="status">
              {banner}
            </p>
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
