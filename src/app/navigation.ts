import type { View } from "../appModel";
import { storeDetailPath } from "../lib/storeLinks";

export function pathForView(view: View) {
  switch (view.name) {
    case "home":
      return "/";
    case "discover":
      return "/discover";
    case "journal":
      return "/journal";
    case "collections":
      return "/collections";
    case "stitchAlong":
      return view.id ? `/stitch-along/${view.id}` : "/stitch-along";
    case "meetups":
      return view.tab === "mine" ? "/meetups/mine" : "/meetups";
    case "meetup":
      return `/meetups/${view.id}`;
    case "messages":
      return view.threadId ? `/messages/${view.threadId}` : "/messages";
    case "stores":
      return "/stores";
    case "store":
      return storeDetailPath(view.handle);
    case "auth":
      return "/auth";
    case "onboarding":
      return "/onboarding";
    case "moderation":
      return "/moderation";
    case "project":
      return `/projects/${view.id}`;
    case "profile":
      return `/u/${view.id}`;
    default:
      return "/";
  }
}

export function viewNameForPath(pathname: string) {
  if (pathname.startsWith("/discover")) return "discover";
  if (pathname.startsWith("/journal")) return "journal";
  if (pathname.startsWith("/collections")) return "collections";
  if (pathname.startsWith("/stitch-along")) return "stitchAlong";
  if (pathname === "/meetups/mine" || pathname.startsWith("/meetups/mine/")) return "meetups";
  if (pathname.startsWith("/meetups/")) return "meetup";
  if (pathname.startsWith("/meetups")) return "meetups";
  if (pathname.startsWith("/messages")) return "messages";
  if (pathname.startsWith("/stores/")) return "store";
  if (pathname.startsWith("/stores")) return "stores";
  if (pathname.startsWith("/projects")) return "project";
  if (pathname.startsWith("/u/")) return "profile";
  if (pathname.startsWith("/auth")) return "auth";
  if (pathname.startsWith("/onboarding")) return "onboarding";
  if (pathname.startsWith("/moderation")) return "moderation";
  return "home";
}
