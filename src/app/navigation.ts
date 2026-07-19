import type { View } from "../appModel";

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
    case "stores":
      return "/stores";
    case "store":
      return `/stores/${view.handle}`;
    case "auth":
      return "/auth";
    case "onboarding":
      return "/onboarding";
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
  if (pathname.startsWith("/stores/")) return "store";
  if (pathname.startsWith("/stores")) return "stores";
  if (pathname.startsWith("/projects")) return "project";
  if (pathname.startsWith("/u/")) return "profile";
  if (pathname.startsWith("/auth")) return "auth";
  if (pathname.startsWith("/onboarding")) return "onboarding";
  return "home";
}
