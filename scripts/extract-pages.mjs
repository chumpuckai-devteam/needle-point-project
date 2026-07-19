#!/usr/bin/env node
/**
 * One-shot extractor: split AppComponents.tsx + App.tsx route pages into src/pages + src/components.
 * Behavior-preserving mechanical move only.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const src = path.join(root, "src");
const componentsDir = path.join(src, "components");
const pagesDir = path.join(src, "pages");

fs.mkdirSync(componentsDir, { recursive: true });
fs.mkdirSync(pagesDir, { recursive: true });

const appCompPath = path.join(src, "AppComponents.tsx");
const appPath = path.join(src, "App.tsx");
const appComp = fs.readFileSync(appCompPath, "utf8");
const appSrc = fs.readFileSync(appPath, "utf8");
const appCompLines = appComp.split("\n");

/** Find 0-based start line of `export function Name` / `export type Name` */
function findExportStart(lines, name, kind = "function") {
  const re =
    kind === "type"
      ? new RegExp(`^export type ${name}\\b`)
      : new RegExp(`^export function ${name}\\b`);
  const idx = lines.findIndex((l) => re.test(l));
  if (idx < 0) throw new Error(`export ${kind} ${name} not found`);
  return idx;
}

/** Slice from startIdx inclusive to next top-level export or EOF (exclusive of trailing blank) */
function sliceUntilNextExport(lines, startIdx) {
  let end = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^export (function|type|const) /.test(lines[i])) {
      end = i;
      break;
    }
  }
  // drop trailing empty lines from slice
  while (end > startIdx && lines[end - 1].trim() === "") end--;
  return lines.slice(startIdx, end).join("\n");
}

function write(file, content) {
  fs.writeFileSync(file, content.endsWith("\n") ? content : content + "\n", "utf8");
  console.log("wrote", path.relative(root, file), `(${content.split("\n").length} lines)`);
}

// --- helpers shared at top of AppComponents ---
const helperStart = appCompLines.findIndex((l) => l.startsWith("const STATUS_LABELS"));
const sidebarStart = findExportStart(appCompLines, "Sidebar");
const helpersBlock = appCompLines.slice(helperStart, sidebarStart).join("\n").replace(/\n+$/, "");

// primitives
const selectBody = sliceUntilNextExport(appCompLines, findExportStart(appCompLines, "Select"));
const fieldBody = sliceUntilNextExport(appCompLines, findExportStart(appCompLines, "Field"));
const metaBody = sliceUntilNextExport(appCompLines, findExportStart(appCompLines, "Meta"));
const metricBody = sliceUntilNextExport(appCompLines, findExportStart(appCompLines, "Metric"));
const emptyBody = sliceUntilNextExport(appCompLines, findExportStart(appCompLines, "EmptyState"));
const sectionHeaderBody = sliceUntilNextExport(appCompLines, findExportStart(appCompLines, "SectionHeader"));
const sectionTitleBody = sliceUntilNextExport(appCompLines, findExportStart(appCompLines, "SectionTitle"));

write(
  path.join(componentsDir, "ui.tsx"),
  `import type { ReactNode } from "react";

${emptyBody}

${sectionHeaderBody}

${sectionTitleBody}

${selectBody}

${fieldBody}

${metaBody}

${metricBody}
`,
);

// Sidebar
const sidebarBody = sliceUntilNextExport(appCompLines, findExportStart(appCompLines, "Sidebar"));
write(
  path.join(componentsDir, "Sidebar.tsx"),
  `import { Bookmark, CalendarDays, Frame, Plus, Search, Sparkles, Store as StoreIcon, UserRound } from "lucide-react";
import type { View } from "../appModel";

${sidebarBody}
`,
);

// Feed helpers + FollowedStoresRail + FeedPost + tiles
const followedType = sliceUntilNextExport(appCompLines, findExportStart(appCompLines, "FollowedStoreRailItem", "type"));
const followedRail = sliceUntilNextExport(appCompLines, findExportStart(appCompLines, "FollowedStoresRail"));
const feedPost = sliceUntilNextExport(appCompLines, findExportStart(appCompLines, "FeedPost"));
const visualTile = sliceUntilNextExport(appCompLines, findExportStart(appCompLines, "VisualProjectTile"));
const projectCard = sliceUntilNextExport(appCompLines, findExportStart(appCompLines, "ProjectCard"));

write(
  path.join(componentsDir, "feed.tsx"),
  `import { useMemo } from "react";
import { Bookmark, ExternalLink, Heart, MapPin, MessageCircle, Share2, Store as StoreIcon } from "lucide-react";
import type { Creator, Project, Store } from "../types";
import type { View } from "../appModel";
import { projectCommentCount, resolveMediaKind } from "../appModel";
import { EmptyState } from "./ui";

${helpersBlock}

${followedType}

${followedRail}

${feedPost}

${visualTile}

${projectCard}
`,
);

// Pages from AppComponents
const pageDefs = [
  {
    name: "HomePage",
    exportName: "HomeView",
    file: "HomePage.tsx",
    imports: `import type { Creator, Project, StitchAlong, Store } from "../types";
import type { View } from "../appModel";
import { FeedPost, FollowedStoresRail, type FollowedStoreRailItem } from "../components/feed";
import { EmptyState, SectionHeader } from "../components/ui";
`,
  },
  {
    name: "DiscoverPage",
    exportName: "DiscoverView",
    file: "DiscoverPage.tsx",
    imports: `import type { Creator, Difficulty, Project, Status } from "../types";
import type { View } from "../appModel";
import { VisualProjectTile } from "../components/feed";
import { EmptyState, SectionHeader, Select } from "../components/ui";
import { Filter } from "lucide-react";
`,
  },
  {
    name: "ProjectDetailPage",
    exportName: "ProjectDetail",
    file: "ProjectDetailPage.tsx",
    imports: `import { FormEvent, useEffect, useId, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { Creator, Project, Store } from "../types";
import type { DraftProject, View } from "../appModel";
import { difficultyOptions, statusOptions, visibilityHelp, visibilityLabel } from "../appModel";
import { ImageFilePicker } from "../components/ImageFilePicker";
import { EmptyState, Field, Meta, SectionHeader, Select } from "../components/ui";
`,
  },
  {
    name: "JournalPage",
    exportName: "JournalView",
    file: "JournalPage.tsx",
    imports: `import type { FormEvent } from "react";
import type { Project, Store } from "../types";
import type { DraftProject, View } from "../appModel";
import { difficultyOptions, statusOptions, visibilityHelp } from "../appModel";
import { ImageFilePicker } from "../components/ImageFilePicker";
import { EmptyState, Field, SectionHeader, Select } from "../components/ui";
`,
  },
  {
    name: "CollectionsPage",
    exportName: "CollectionsView",
    file: "CollectionsPage.tsx",
    imports: `import type { Collection, Creator, Project } from "../types";
import type { View } from "../appModel";
import { ProjectCard } from "../components/feed";
import { EmptyState, SectionHeader } from "../components/ui";
`,
  },
  {
    name: "ProfilePage",
    exportName: "ProfileView",
    file: "ProfilePage.tsx",
    imports: `import { ExternalLink } from "lucide-react";
import type { Creator, Project } from "../types";
import type { View } from "../appModel";
import { EmptyState, Meta, SectionHeader } from "../components/ui";
`,
  },
  {
    name: "StoresPage",
    exportName: "StoresView",
    file: "StoresPage.tsx",
    imports: `import { useEffect, useMemo, useState } from "react";
import { MapPin, Store as StoreIcon } from "lucide-react";
import type { Store } from "../types";
import type { View } from "../appModel";
import {
  formatDistanceMiles,
  LOCAL_DRIVING_RADIUS_MILES,
  rankStoresForUser,
  requestBrowserLocation,
  type GeoPoint,
  type RankedStore,
} from "../lib/geo";
import { EmptyState, SectionHeader } from "../components/ui";
`,
  },
  {
    name: "StoreDetailPage",
    exportName: "StoreDetailView",
    file: "StoreDetailPage.tsx",
    imports: `import { FormEvent, useEffect, useId, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { Project, Store, StoreProduct } from "../types";
import type { StoreProductInput, StoreProfileInput } from "../api/stores";
import type { View } from "../appModel";
import { ImageFilePicker } from "../components/ImageFilePicker";
import { EmptyState, Field, Meta, SectionHeader } from "../components/ui";
`,
  },
  {
    name: "StitchAlongPage",
    exportName: "StitchAlongView",
    file: "StitchAlongPage.tsx",
    imports: `import type { Creator, Project, StitchAlong } from "../types";
import type { View } from "../appModel";
import { ProjectCard } from "../components/feed";
import { EmptyState, Meta, SectionHeader } from "../components/ui";
`,
  },
];

for (const def of pageDefs) {
  const body = sliceUntilNextExport(appCompLines, findExportStart(appCompLines, def.exportName));
  // Keep original export name so App.tsx props/usage stay identical; also alias Page name.
  const aliased = body + `\n\nexport { ${def.exportName} as ${def.name} };`;
  write(path.join(pagesDir, def.file), `${def.imports}\n${aliased}\n`);
}

// --- Extract Auth/Onboarding/Account + route wrappers from App.tsx ---
const appLines = appSrc.split("\n");

function findFn(lines, name) {
  const idx = lines.findIndex((l) => l.startsWith(`function ${name}(`) || l.startsWith(`function ${name} (`));
  if (idx < 0) throw new Error(`function ${name} not found in App.tsx`);
  return idx;
}

/** Extract a top-level function by brace matching from its start line */
function extractFunction(lines, startIdx) {
  let i = startIdx;
  // find opening brace
  let text = "";
  while (i < lines.length) {
    text += (text ? "\n" : "") + lines[i];
    if (lines[i].includes("{")) break;
    i++;
  }
  let depth = 0;
  for (; i < lines.length; i++) {
    const line = i === startIdx ? lines[i] : lines[i];
    if (i > startIdx) text += "\n" + line;
    for (const ch of line) {
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
    if (depth === 0 && i > startIdx) {
      return { text, endIdx: i };
    }
  }
  throw new Error("unbalanced braces");
}

// For start line, re-scan properly
function extractFunctionFrom(lines, startIdx) {
  let depth = 0;
  let started = false;
  const out = [];
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    out.push(line);
    for (const ch of line) {
      if (ch === "{") {
        depth++;
        started = true;
      } else if (ch === "}") depth--;
    }
    if (started && depth === 0) {
      return { text: out.join("\n"), endIdx: i };
    }
  }
  throw new Error("unbalanced at " + startIdx);
}

const projectRoute = extractFunctionFrom(appLines, findFn(appLines, "ProjectRoute"));
const storeRoute = extractFunctionFrom(appLines, findFn(appLines, "StoreRoute"));
const profileRoute = extractFunctionFrom(appLines, findFn(appLines, "ProfileRoute"));
const authPage = extractFunctionFrom(appLines, findFn(appLines, "AuthPage"));
const accountSettings = extractFunctionFrom(appLines, findFn(appLines, "AccountSettings"));
const onboardingPage = extractFunctionFrom(appLines, findFn(appLines, "OnboardingPage"));

write(
  path.join(pagesDir, "ProjectRoute.tsx"),
  `import { useParams } from "react-router-dom";
import type { Creator, Project, Store } from "../types";
import type { DraftProject, View } from "../appModel";
import { EmptyState } from "../components/ui";
import { ProjectDetail } from "./ProjectDetailPage";

export ${projectRoute.text.replace(/^function /, "function ")}
`,
);
// fix export
{
  const p = path.join(pagesDir, "ProjectRoute.tsx");
  let t = fs.readFileSync(p, "utf8");
  t = t.replace("\nfunction ProjectRoute", "\nexport function ProjectRoute");
  fs.writeFileSync(p, t);
}

write(
  path.join(pagesDir, "StoreRoute.tsx"),
  `import { useParams } from "react-router-dom";
import type { Project, Store } from "../types";
import type { StoreProductInput, StoreProfileInput } from "../api/stores";
import type { View } from "../appModel";
import { EmptyState } from "../components/ui";
import { StoreDetailView } from "./StoreDetailPage";

export function ${storeRoute.text.slice("function ".length)}
`,
);

write(
  path.join(pagesDir, "ProfileRoute.tsx"),
  `import { useParams } from "react-router-dom";
import type { Creator, Project } from "../types";
import type { View } from "../appModel";
import { EmptyState } from "../components/ui";
import { ProfileView } from "./ProfilePage";

export function ${profileRoute.text.slice("function ".length)}
`,
);

write(
  path.join(pagesDir, "AuthPage.tsx"),
  `import { FormEvent, useEffect, useState } from "react";
import { ExternalLink, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchProfileById, updateProfile } from "../api/profiles";
import { fetchPublicProjects } from "../api/projects";
import { AuthForm, useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../lib/supabase";
import type { Project } from "../types";
import { EmptyState, SectionHeader } from "../components/ui";

export function ${authPage.text.slice("function ".length)}

function ${accountSettings.text.slice("function ".length)}
`,
);

write(
  path.join(pagesDir, "OnboardingPage.tsx"),
  `import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeOnboarding } from "../api/profiles";
import { useAuth } from "../context/AuthContext";
import { loadFromStorage, saveToStorage } from "../lib/storage";
import { SectionHeader } from "../components/ui";

export function ${onboardingPage.text.slice("function ".length)}
`,
);

// pages barrel
write(
  path.join(pagesDir, "index.ts"),
  `export { HomeView, HomePage } from "./HomePage";
export { DiscoverView, DiscoverPage } from "./DiscoverPage";
export { JournalView, JournalPage } from "./JournalPage";
export { CollectionsView, CollectionsPage } from "./CollectionsPage";
export { ProfileView, ProfilePage } from "./ProfilePage";
export { StoresView, StoresPage } from "./StoresPage";
export { StoreDetailView, StoreDetailPage } from "./StoreDetailPage";
export { ProjectDetail, ProjectDetailPage } from "./ProjectDetailPage";
export { StitchAlongView, StitchAlongPage } from "./StitchAlongPage";
export { AuthPage } from "./AuthPage";
export { OnboardingPage } from "./OnboardingPage";
export { ProjectRoute } from "./ProjectRoute";
export { StoreRoute } from "./StoreRoute";
export { ProfileRoute } from "./ProfileRoute";
`,
);

// AppComponents becomes thin re-export barrel for any residual imports
write(
  path.join(src, "AppComponents.tsx"),
  `/** @deprecated Import from ../pages or ../components directly. Barrel kept for compatibility. */
export { Sidebar } from "./components/Sidebar";
export {
  FeedPost,
  FollowedStoresRail,
  ProjectCard,
  VisualProjectTile,
  type FollowedStoreRailItem,
} from "./components/feed";
export {
  EmptyState,
  Field,
  Meta,
  Metric,
  SectionHeader,
  SectionTitle,
  Select,
} from "./components/ui";
export {
  CollectionsView,
  DiscoverView,
  HomeView,
  JournalView,
  ProfileView,
  ProjectDetail,
  StitchAlongView,
  StoreDetailView,
  StoresView,
} from "./pages";
`,
);

// Patch App.tsx: replace imports and remove extracted functions
let newApp = appSrc;

// Replace AppComponents import block
newApp = newApp.replace(
  /import \{\n  CollectionsView,\n  DiscoverView,\n  EmptyState,\n  HomeView,\n  JournalView,\n  ProjectDetail,\n  ProfileView,\n  SectionHeader,\n  Sidebar,\n  StitchAlongView,\n  StoreDetailView,\n  StoresView,\n\} from "\.\/AppComponents";/,
  `import { Sidebar } from "./components/Sidebar";
import {
  AuthPage,
  CollectionsView,
  DiscoverView,
  HomeView,
  JournalView,
  OnboardingPage,
  ProfileRoute,
  ProjectRoute,
  StitchAlongView,
  StoreRoute,
  StoresView,
} from "./pages";`,
);

// Remove unused imports that Auth/Account pulled (ExternalLink, Plus if only used there)
// Keep Plus/ExternalLink check later via build.

// Remove function bodies from ProjectRoute through OnboardingPage (keep pathForView)
const prStart = findFn(appLines, "ProjectRoute");
const pathStart = appLines.findIndex((l) => l.startsWith("function pathForView"));
if (pathStart < 0) throw new Error("pathForView not found");
const before = appLines.slice(0, prStart).join("\n");
const after = appLines.slice(pathStart).join("\n");
// Rebuild from patched imports version carefully:

// Use the import-patched content, then strip functions by markers
const markerStart = "\nfunction ProjectRoute(";
const markerEnd = "\nfunction pathForView(";
const i0 = newApp.indexOf(markerStart);
const i1 = newApp.indexOf(markerEnd);
if (i0 < 0 || i1 < 0) throw new Error(`markers not found i0=${i0} i1=${i1}`);
newApp = newApp.slice(0, i0) + "\n\n" + newApp.slice(i1 + 1); // keep "function pathForView"

// Clean unused imports from App.tsx after move
// completeOnboarding, fetchProfileById, updateProfile may only be used by Account/Onboarding
// AuthForm may only be AuthPage
// ExternalLink, Plus may only be Account

function stripImportName(srcText, fromModule, name) {
  // named import removal - simple cases
  const re = new RegExp(`import \\{([^}]+)\\} from "${fromModule.replace(".", "\\.")}";`);
  const m = srcText.match(re);
  if (!m) return srcText;
  const names = m[1].split(",").map((s) => s.trim()).filter(Boolean);
  const next = names.filter((n) => n !== name && !n.endsWith(" as " + name) && n.split(/\s+as\s+/)[0] !== name);
  if (next.length === names.length) return srcText;
  if (next.length === 0) return srcText.replace(re, "");
  return srcText.replace(re, `import { ${next.join(", ")} } from "${fromModule}";`);
}

// Heuristic unused cleanup after verifying symbols remain in App shell
const shellOnly = newApp;
const unusedCandidates = [
  ["../api/profiles", "completeOnboarding"],
  ["./api/profiles", "completeOnboarding"],
  ["./api/profiles", "fetchProfileById"],
  ["./api/profiles", "updateProfile"],
  ["./api/projects", "fetchPublicProjects"],
];

// Only strip if symbol not referenced as word in remaining app
for (const [mod, name] of unusedCandidates) {
  const bodyWithoutImport = shellOnly.replace(new RegExp(`import[^;]*${name}[^;]*;`), "");
  const used = new RegExp(`\\b${name}\\b`).test(bodyWithoutImport);
  if (!used) {
    newApp = stripImportName(newApp, mod, name);
  }
}

// AuthForm
{
  const without = newApp.replace(/import \{ AuthForm, AuthProvider, useAuth \}/, "import { AuthProvider, useAuth }");
  const bodyCheck = without.replace(/import \{ AuthProvider, useAuth \} from "\.\/context\/AuthContext";/, "");
  if (!/\bAuthForm\b/.test(bodyCheck)) {
    newApp = without;
  }
}

// ExternalLink, Plus from lucide
{
  if (!/\bExternalLink\b/.test(newApp.replace(/import \{ ExternalLink, Plus \} from "lucide-react";/, ""))) {
    newApp = newApp.replace(/import \{ ExternalLink, Plus \} from "lucide-react";\n/, "");
  } else if (!/\bPlus\b/.test(newApp.replace(/import \{ ExternalLink, Plus \} from "lucide-react";/, "")) && /\bExternalLink\b/.test(newApp)) {
    newApp = newApp.replace(`import { ExternalLink, Plus } from "lucide-react";`, `import { ExternalLink } from "lucide-react";`);
  } else if (!/\bExternalLink\b/.test(newApp.replace(/import \{ ExternalLink, Plus \} from "lucide-react";/, "")) && /\bPlus\b/.test(newApp)) {
    newApp = newApp.replace(`import { ExternalLink, Plus } from "lucide-react";`, `import { Plus } from "lucide-react";`);
  }
}

// loadFromStorage/saveToStorage may only be onboarding
{
  const stripped = newApp.replace(/import \{ loadFromStorage, saveToStorage \} from "\.\/lib\/storage";\n/, "");
  if (!/\bloadFromStorage\b/.test(stripped) && !/\bsaveToStorage\b/.test(stripped)) {
    newApp = stripped;
  }
}

// FormEvent may still be used
// useLocation in App shell? setView uses navigate; viewNameForPath uses location - yes useLocation stays

write(appPath, newApp);
console.log("patched App.tsx");

// Sanity: list pages
console.log("pages:", fs.readdirSync(pagesDir).join(", "));
console.log("components:", fs.readdirSync(componentsDir).join(", "));
