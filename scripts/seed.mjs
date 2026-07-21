import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

const envFiles = [".env", ".env.local"];
for (const file of envFiles) {
  if (!existsSync(file)) continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (process.env[key]) continue;
    process.env[key] = valueParts.join("=").replace(/^['"]|['"]$/g, "");
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const seedPassword = process.env.NEEDLEPOINT_SEED_PASSWORD || "NeedlepointSeed123!";
const reset = process.argv.includes("--reset");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Copy .env.example to .env.local and add the service role key for server-side seeding only.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const seedUsers = [
  {
    key: "mara",
    email: "seed.mara@example.test",
    name: "Mara Chen",
    handle: "mara_stitches",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=82",
    bio: "Modern florals, painted canvases, and calm Sunday stitching notes from a Brooklyn apartment.",
    skill_level: "advanced",
    is_creator: true,
    location: "Brooklyn, NY",
    interests: ["florals", "pillows", "canvases"],
    links: [
      ["Pattern shop", "https://example.com/mara-patterns"],
      ["Classes", "https://example.com/mara-classes"],
    ],
  },
  {
    key: "june",
    email: "seed.june@example.test",
    name: "June Mercer",
    handle: "threadandtonic",
    avatar_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=82",
    bio: "Beginner-friendly ornaments, finishing ideas, and honest notes about thread substitutions.",
    skill_level: "confident beginner",
    is_creator: false,
    location: "Austin, TX",
    interests: ["beginner projects", "ornaments", "holiday"],
    links: [["Project notebook", "https://example.com/june-notebook"]],
  },
  {
    key: "canopy",
    email: "seed.canopy@example.test",
    name: "Canopy Canvas Co.",
    handle: "canopycanvas",
    avatar_url: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=400&q=82",
    bio: "Small-batch canvases inspired by gardens, bookshops, heirloom linens, and weekend markets.",
    skill_level: "advanced",
    is_creator: true,
    location: "Portland, OR",
    interests: ["canvases", "modern patterns", "florals"],
    links: [
      ["Shop canvases", "https://example.com/canopy"],
      ["Newsletter", "https://example.com/canopy-news"],
    ],
  },
];

const projects = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    owner: "mara",
    title: "Persimmon Garden Pillow",
    description: "Testing raised stitches for the fruit and keeping the background matte so the silk can shine.",
    status: "in_progress",
    visibility: "public",
    difficulty: "advanced",
    category: "pillow",
    canvas_type: "18 mesh painted canvas",
    pattern_source_name: "Canopy Canvas Co.",
    pattern_source_url: "https://example.com/persimmon-garden",
    primary_image_url: "/assets/persimmon-garden-pillow.jpg",
    progress: 62,
    materials: [
      ["thread", "Planet Earth", "persimmon", "silk for raised fruit"],
      ["thread", "DMC", "cream", "matte background cotton"],
      ["thread", "Kreinik", "olive", "accent braid"],
    ],
    tags: [
      ["basketweave", "stitch"],
      ["french knots", "stitch"],
      ["persimmon", "color"],
      ["florals", "theme"],
    ],
    updates: [
      ["00000000-0000-4000-8000-000000000201", "Border mapped", "Swapped the border to a cashmere stitch so the corners feel softer.", "/assets/persimmon-garden-pillow.jpg"],
      ["00000000-0000-4000-8000-000000000202", "Fruit texture", "French knots in two oranges gave the persimmons a little dimension.", "/assets/persimmon-garden-pillow.jpg"],
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    owner: "june",
    title: "Tiny Ski Lodge Ornament",
    description: "A quick gift stitch with a metallic roof and simple finishing plan.",
    status: "finished",
    visibility: "public",
    difficulty: "beginner",
    category: "ornament",
    canvas_type: "13 mesh canvas",
    pattern_source_name: "Vintage chart adaptation",
    pattern_source_url: "https://example.com/ski-lodge",
    primary_image_url: "/assets/tiny-ski-lodge-ornament.jpg",
    progress: 100,
    materials: [["thread", "DMC", "evergreen", "wool"], ["thread", "Kreinik", "snow", "metallic roof"]],
    tags: [["continental", "stitch"], ["ornaments", "theme"], ["holiday", "theme"]],
    updates: [["00000000-0000-4000-8000-000000000203", "Finished", "Blocked and ready for cording. The roof sparkle was worth the extra thread management.", "/assets/tiny-ski-lodge-ornament.jpg"]],
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    owner: "canopy",
    title: "Bookshop Door Canvas",
    description: "Queued for the July stitch-along with velvet for the awning.",
    status: "planned",
    visibility: "public",
    difficulty: "intermediate",
    category: "framed piece",
    canvas_type: "18 mesh printed canvas",
    pattern_source_name: "Canopy Canvas Co.",
    pattern_source_url: "https://example.com/bookshop-door",
    primary_image_url: "/assets/bookshop-door-canvas.jpg",
    progress: 8,
    materials: [["thread", "Vineyard Silk", "teal", "awning"], ["thread", "Rainbow Gallery", "rose", "velvet accent"]],
    tags: [["tent stitch", "stitch"], ["brick stitch", "stitch"], ["modern patterns", "theme"]],
    updates: [["00000000-0000-4000-8000-000000000204", "Kitted", "Pulled thread options and chose a warmer brass for the doorknob.", "/assets/bookshop-door-canvas.jpg"]],
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    owner: "mara",
    title: "Blue Hydrangea Belt",
    description: "Paused until the background blue arrives. Testing whether mosaic reads too busy at belt scale.",
    status: "paused",
    visibility: "public",
    difficulty: "intermediate",
    category: "accessory",
    canvas_type: "18 mesh belt canvas",
    pattern_source_name: "Self-drafted from garden photos",
    pattern_source_url: "https://example.com/hydrangea-belt-notes",
    primary_image_url: "/assets/blue-hydrangea-belt.jpg",
    progress: 34,
    materials: [["thread", "Anchor", "cornflower", "floss"], ["thread", "Pepper Pot", "navy", "silk"]],
    tags: [["basketweave", "stitch"], ["mosaic stitch", "stitch"], ["florals", "theme"]],
    updates: [["00000000-0000-4000-8000-000000000205", "Color test", "The middle value needs to be cooler before committing to the full repeat.", "/assets/blue-hydrangea-belt.jpg"]],
  },
  {
    id: "00000000-0000-4000-8000-000000000105",
    owner: "june",
    title: "Midnight Sampler (private draft)",
    description: "Private journal draft — should never appear in Studio, Discover, or other profiles.",
    status: "in_progress",
    visibility: "private",
    difficulty: "confident_beginner",
    category: "sampler",
    canvas_type: "18 mesh mono canvas",
    pattern_source_name: "Personal stash",
    pattern_source_url: "https://example.com/private-draft",
    primary_image_url: "/assets/tiny-ski-lodge-ornament.jpg",
    progress: 18,
    materials: [["thread", "DMC", "indigo", "floss"], ["thread", "DMC", "silver", "floss"]],
    tags: [["continental", "stitch"], ["private", "other"]],
    updates: [["00000000-0000-4000-8000-000000000206", "Chart layout", "Sketching borders before committing thread. Keep this private until colors settle.", "/assets/tiny-ski-lodge-ornament.jpg"]],
  },
];

const stores = [
  ["Canopy Canvas", "canopycanvas", "both", "Local needlepoint shop with painted canvases, threads, and finishing.", "/assets/needlepoint-hero.png", "/assets/persimmon-garden-pillow.jpg", "https://example.com/canopy", "Portland, OR", "Portland", "OR", "97205", true, ["painted canvases", "finishing", "threads"], 45.5202471, -122.674194],
  ["Thread & Tonic", "threadandtonic", "online", "Online specialty threads and silk blends for advanced stitchers.", "/assets/needlepoint-hero.png", "/assets/blue-hydrangea-belt.jpg", "https://example.com/threadtonic", "Ships nationwide", "", "", "", true, ["silk", "metallic", "kits"], null, null],
  ["Bookshop Windows LNS", "bookshopwindows", "local", "Neighborhood LNS hosting stitch-alongs and custom finishing.", "/assets/needlepoint-hero.png", "/assets/bookshop-door-canvas.jpg", "https://example.com/bookshop", "Austin, TX", "Austin", "TX", "78701", false, ["local pickup", "classes", "finishing"], 30.2711286, -97.7436995],
  ["Needle Nest Studio", "needleneststudio", "local", "Small teaching studio with beginner canvases and monthly finish-it nights.", "/assets/needlepoint-hero.png", "/assets/tiny-ski-lodge-ornament.jpg", "https://example.com/needle-nest", "Brooklyn, NY", "Brooklyn", "NY", "11201", false, ["beginner classes", "ornaments", "open stitch"], 40.6943, -73.9866],
];

// Expanded national directory (2+/state, 5+/major metro) lives in scripts/data/us-store-catalog.json
// Run `npm run seed:stores` after generate to upsert the full catalog without touching products/auth.

const products = [
  ["canopycanvas", "Persimmon Garden pillow canvas", "18 mesh painted canvas for a lush fruit pillow.", "/assets/persimmon-garden-pillow.jpg", "from $86", "https://example.com/canopy/persimmon", "canvas", 1],
  ["canopycanvas", "Bookshop Door printed canvas", "18 mesh storefront scene for framed pieces.", "/assets/bookshop-door-canvas.jpg", "from $74", "https://example.com/canopy/bookshop-door", "canvas", 2],
  ["canopycanvas", "Blue Hydrangea belt canvas", "Narrow belt canvas with botanical repeat.", "/assets/blue-hydrangea-belt.jpg", "from $48", "https://example.com/canopy/hydrangea-belt", "canvas", 3],
  ["threadandtonic", "Silk blend starter pack", "Assorted silk blends for advanced stitchers.", "/assets/blue-hydrangea-belt.jpg", "$42", "https://example.com/threadtonic/silk-pack", "thread", 1],
  ["threadandtonic", "Metallic accent kit", "Kreinik-style accents for roofs and trims.", "/assets/tiny-ski-lodge-ornament.jpg", "$28", "https://example.com/threadtonic/metallic", "thread", 2],
  ["threadandtonic", "Holiday ornament finishing pack", "Cording and felt backs for small gifts.", "/assets/tiny-ski-lodge-ornament.jpg", "$19", "https://example.com/threadtonic/finishing", "finishing", 3],
  ["bookshopwindows", "Custom finishing — small pillow", "Local finishing for pillows under 16\".", "/assets/persimmon-garden-pillow.jpg", "from $65", "https://example.com/bookshop/finishing", "finishing", 1],
  ["bookshopwindows", "July stitch-along kit add-on", "Threads pulled for bookshop-themed SAL.", "/assets/bookshop-door-canvas.jpg", "$36", "https://example.com/bookshop/sal-kit", "kit", 2],
  ["needleneststudio", "Beginner ornament class seat", "In-person basketweave class with canvas and thread included.", "/assets/tiny-ski-lodge-ornament.jpg", "$55", "https://example.com/needle-nest/classes", "class", 1],
];

const stitchAlongs = [
  ["00000000-0000-4000-8000-000000000301", "canopy", "July Bookshop Windows Stitch-Along", "A six-week stitch-along for bookish canvases.", "Doors, windows, shelves, and tiny storefront details.", ["Submit one public project with a bookshop, library, door, or shelf theme.", "Add at least one progress update during the stitch-along window."], "2026-07-06", "2026-08-17", "/assets/bookshop-door-canvas.jpg", "active"],
  ["00000000-0000-4000-8000-000000000302", "june", "Holiday Ornament Sprint", "A short sprint for ornaments and small holiday canvases.", "Quick ornaments, metallics, and gift-ready finishing.", ["One public ornament or mini project per stitcher.", "Share at least one finishing tip in a progress update."], "2026-11-01", "2026-12-15", "/assets/tiny-ski-lodge-ornament.jpg", "active"],
  ["00000000-0000-4000-8000-000000000303", "mara", "Spring Florals Archive", "An ended spring series kept for browsing past participant galleries.", "Botanicals, garden pillows, and soft pastel palettes.", ["Public botanical projects only."], "2026-03-01", "2026-04-30", "/assets/persimmon-garden-pillow.jpg", "ended"],
];

async function failOn(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function tableColumns(table) {
  const { data, error } = await supabase.rpc("__missing_seed_helper__");
  if (!error || !String(error.message).includes("Could not find the function")) {
    throw new Error("Unexpected seed helper RPC result");
  }
  const probe = await supabase.from(table).select("*").limit(0);
  if (probe.error) throw new Error(`Cannot inspect ${table}: ${probe.error.message}`);
  // PostgREST does not return column metadata, so keep optional-column writes behind
  // targeted probes in insert/update helpers below.
  return new Set();
}

async function supportsColumn(table, column) {
  const { error } = await supabase.from(table).select(column).limit(0);
  return !error;
}

async function listAllUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    await failOn(error, "list auth users");
    users.push(...(data?.users ?? []));
    if (!data?.users?.length || data.users.length < 1000) break;
  }
  return users;
}

async function ensureAuthUsers() {
  if (reset) {
    const existing = await listAllUsers();
    for (const user of seedUsers) {
      const found = existing.find((candidate) => candidate.email?.toLowerCase() === user.email);
      if (found) await failOn((await supabase.auth.admin.deleteUser(found.id)).error, `delete ${user.email}`);
    }
  }

  const ids = new Map();
  let existing = await listAllUsers();
  for (const user of seedUsers) {
    let found = existing.find((candidate) => candidate.email?.toLowerCase() === user.email);
    if (!found) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: seedPassword,
        email_confirm: true,
        user_metadata: { name: user.name, handle: user.handle },
      });
      await failOn(error, `create ${user.email}`);
      found = data.user;
      existing = await listAllUsers();
    }
    ids.set(user.key, found.id);
  }
  return ids;
}

async function upsertProfiles(userIds) {
  await failOn((await supabase.from("profiles").upsert(seedUsers.map((user) => ({
    id: userIds.get(user.key),
    name: user.name,
    handle: user.handle,
    email: user.email,
    avatar_url: user.avatar_url,
    bio: user.bio,
    skill_level: user.skill_level,
    is_creator: user.is_creator,
    location: user.location,
    onboarding_complete: true,
  })))).error, "upsert profiles");

  const profileIds = seedUsers.map((user) => userIds.get(user.key));
  await failOn((await supabase.from("profile_links").delete().in("profile_id", profileIds)).error, "clear profile links");
  await failOn((await supabase.from("profile_interests").delete().in("profile_id", profileIds)).error, "clear profile interests");

  const linkRows = [];
  const interestRows = [];
  for (const user of seedUsers) {
    user.links.forEach(([label, url], index) => linkRows.push({ profile_id: userIds.get(user.key), label, url, sort_order: index + 1 }));
    user.interests.forEach((interest) => interestRows.push({ profile_id: userIds.get(user.key), interest }));
  }
  await failOn((await supabase.from("profile_links").insert(linkRows)).error, "insert profile links");
  await failOn((await supabase.from("profile_interests").insert(interestRows)).error, "insert profile interests");
}

async function upsertProjects(userIds) {
  await failOn((await supabase.from("projects").upsert(projects.map((project) => ({
    id: project.id,
    user_id: userIds.get(project.owner),
    title: project.title,
    description: project.description,
    status: project.status,
    visibility: project.visibility,
    difficulty: project.difficulty,
    category: project.category,
    canvas_type: project.canvas_type,
    pattern_source_name: project.pattern_source_name,
    pattern_source_url: project.pattern_source_url,
    primary_image_url: project.primary_image_url,
    progress: project.progress,
  })))).error, "upsert projects");

  const projectIds = projects.map((project) => project.id);
  await failOn((await supabase.from("materials").delete().in("project_id", projectIds)).error, "clear materials");
  await failOn((await supabase.from("project_updates").delete().in("project_id", projectIds)).error, "clear updates");
  await failOn((await supabase.from("project_tags").delete().in("project_id", projectIds)).error, "clear project tags");

  const materialRows = projects.flatMap((project) => project.materials.map(([type, brand, color_name, notes]) => ({ project_id: project.id, type, brand, color_name, notes })));
  await failOn((await supabase.from("materials").insert(materialRows)).error, "insert materials");

  const updateRows = projects.flatMap((project) => project.updates.map(([id, milestone, body, image_url]) => ({ id, project_id: project.id, user_id: userIds.get(project.owner), milestone, body, image_url })));
  await failOn((await supabase.from("project_updates").upsert(updateRows)).error, "upsert project updates");

  const tags = [...new Map(projects.flatMap((project) => project.tags).map(([name, category]) => [`${category}:${name}`, { name, category }])).values()];
  await failOn((await supabase.from("tags").upsert(tags, { onConflict: "name,category" })).error, "upsert tags");
  const { data: tagRows, error: tagError } = await supabase.from("tags").select("id,name,category").in("name", tags.map((tag) => tag.name));
  await failOn(tagError, "select tags");
  const tagByKey = new Map(tagRows.map((tag) => [`${tag.category}:${tag.name}`, tag.id]));
  const projectTagRows = projects.flatMap((project) => project.tags.map(([name, category]) => ({ project_id: project.id, tag_id: tagByKey.get(`${category}:${name}`) })).filter((row) => row.tag_id));
  await failOn((await supabase.from("project_tags").insert(projectTagRows)).error, "insert project tags");
}

async function upsertCollections(userIds) {
  const hasIsDefault = await supportsColumn("collections", "is_default");
  const collections = [
    ["00000000-0000-4000-8000-000000000401", "june", "Saved", "Projects you saved from discovery.", true, [projects[0].id, projects[2].id]],
    ["00000000-0000-4000-8000-000000000402", "june", "Holiday finishing ideas", "Ornaments, metallic thread notes, and quick gifts.", false, [projects[1].id]],
    ["00000000-0000-4000-8000-000000000403", "mara", "Next on the stretcher bars", "Saved projects with stitch ideas for the next month.", true, [projects[2].id, projects[3].id]],
  ];

  const rows = collections.map(([id, owner, name, description, isDefault]) => {
    const row = { id, user_id: userIds.get(owner), name, description, visibility: "private" };
    if (hasIsDefault) row.is_default = isDefault;
    return row;
  });
  await failOn((await supabase.from("collections").upsert(rows)).error, "upsert collections");
  await failOn((await supabase.from("collection_items").delete().in("collection_id", collections.map(([id]) => id))).error, "clear collection items");
  const itemRows = collections.flatMap(([collection_id, , , , , projectIds]) => projectIds.map((project_id) => ({ collection_id, project_id })));
  await failOn((await supabase.from("collection_items").insert(itemRows)).error, "insert collection items");
}

async function upsertStores(userIds) {
  const hasPostalCode = await supportsColumn("stores", "postal_code");
  for (const [name, handle, store_type, description, avatar_url, cover_image_url, website_url, location, city, region, postal_code, ships_nationwide, specialties, latitude, longitude] of stores) {
    const base = { name, handle, store_type, description, avatar_url, cover_image_url, website_url, location, city, region, country: "US", ships_nationwide, specialties, latitude, longitude };
    if (hasPostalCode) base.postal_code = postal_code;
    const { data: existing, error: selectError } = await supabase.from("stores").select("id,owner_user_id").eq("handle", handle).maybeSingle();
    await failOn(selectError, `select store ${handle}`);
    if (existing) {
      const update = { ...base, updated_at: new Date().toISOString() };
      if (handle === "canopycanvas" && !existing.owner_user_id) update.owner_user_id = userIds.get("canopy");
      await failOn((await supabase.from("stores").update(update).eq("id", existing.id)).error, `update store ${handle}`);
    } else {
      const insert = { ...base };
      if (handle === "canopycanvas") insert.owner_user_id = userIds.get("canopy");
      await failOn((await supabase.from("stores").insert(insert)).error, `insert store ${handle}`);
    }
  }

  const { data: storeRows, error: storeError } = await supabase.from("stores").select("id,handle").in("handle", stores.map((store) => store[1]));
  await failOn(storeError, "select stores");
  const storeByHandle = new Map(storeRows.map((store) => [store.handle, store.id]));

  for (const [handle, name, description, image_url, price_label, external_url, category, sort_order] of products) {
    const store_id = storeByHandle.get(handle);
    const { data: existing, error: selectError } = await supabase.from("store_products").select("id").eq("store_id", store_id).eq("name", name).maybeSingle();
    await failOn(selectError, `select product ${name}`);
    const payload = { store_id, name, description, image_url, price_label, external_url, category, sort_order };
    if (existing) await failOn((await supabase.from("store_products").update(payload).eq("id", existing.id)).error, `update product ${name}`);
    else await failOn((await supabase.from("store_products").insert(payload)).error, `insert product ${name}`);
  }

  await failOn((await supabase.from("project_stores").delete().in("project_id", projects.map((project) => project.id))).error, "clear project-store links");
  const links = [
    [projects[0].id, "canopycanvas", "available_at"],
    [projects[0].id, "threadandtonic", "threads_from"],
    [projects[1].id, "threadandtonic", "available_at"],
    [projects[2].id, "canopycanvas", "pattern_from"],
    [projects[2].id, "bookshopwindows", "available_at"],
    [projects[3].id, "canopycanvas", "available_at"],
    [projects[3].id, "threadandtonic", "threads_from"],
  ].map(([project_id, handle, role]) => ({ project_id, store_id: storeByHandle.get(handle), role }));
  await failOn((await supabase.from("project_stores").insert(links)).error, "insert project-store links");

  await failOn((await supabase.from("store_follows").upsert([
    { follower_id: userIds.get("mara"), store_id: storeByHandle.get("canopycanvas") },
    { follower_id: userIds.get("june"), store_id: storeByHandle.get("canopycanvas") },
    { follower_id: userIds.get("canopy"), store_id: storeByHandle.get("threadandtonic") },
  ])).error, "upsert store follows");
}

async function upsertSocialAndStitchAlongs(userIds) {
  await failOn((await supabase.from("follows").upsert([
    { follower_id: userIds.get("june"), following_id: userIds.get("mara") },
    { follower_id: userIds.get("mara"), following_id: userIds.get("canopy") },
    { follower_id: userIds.get("canopy"), following_id: userIds.get("mara") },
  ])).error, "upsert follows");

  await failOn((await supabase.from("reactions").delete().in("target_id", projects.map((project) => project.id))).error, "clear reactions");
  await failOn((await supabase.from("reactions").insert([
    { user_id: userIds.get("june"), target_type: "project", target_id: projects[0].id },
    { user_id: userIds.get("canopy"), target_type: "project", target_id: projects[0].id },
    { user_id: userIds.get("mara"), target_type: "project", target_id: projects[1].id },
    { user_id: userIds.get("june"), target_type: "project", target_id: projects[2].id },
    { user_id: userIds.get("canopy"), target_type: "project", target_id: projects[3].id },
  ])).error, "insert reactions");

  await failOn((await supabase.from("stitch_alongs").upsert(stitchAlongs.map(([id, owner, title, description, theme, rules, start_date, end_date, cover_image_url, status]) => ({
    id,
    host_user_id: userIds.get(owner),
    title,
    description,
    theme,
    rules,
    start_date,
    end_date,
    cover_image_url,
    status,
  })))).error, "upsert stitch alongs");
  await failOn((await supabase.from("stitch_along_joins").delete().in("stitch_along_id", stitchAlongs.map(([id]) => id))).error, "clear stitch-along joins");
  await failOn((await supabase.from("stitch_along_submissions").delete().in("stitch_along_id", stitchAlongs.map(([id]) => id))).error, "clear stitch-along submissions");
  await failOn((await supabase.from("stitch_along_joins").insert([
    { stitch_along_id: stitchAlongs[0][0], user_id: userIds.get("mara") },
    { stitch_along_id: stitchAlongs[0][0], user_id: userIds.get("june") },
    { stitch_along_id: stitchAlongs[1][0], user_id: userIds.get("june") },
    { stitch_along_id: stitchAlongs[2][0], user_id: userIds.get("mara") },
  ])).error, "insert stitch-along joins");
  await failOn((await supabase.from("stitch_along_submissions").insert([
    { stitch_along_id: stitchAlongs[0][0], project_id: projects[2].id, user_id: userIds.get("canopy") },
    { stitch_along_id: stitchAlongs[0][0], project_id: projects[0].id, user_id: userIds.get("mara") },
    { stitch_along_id: stitchAlongs[1][0], project_id: projects[1].id, user_id: userIds.get("june") },
    { stitch_along_id: stitchAlongs[2][0], project_id: projects[0].id, user_id: userIds.get("mara") },
  ])).error, "insert stitch-along submissions");
}

const userIds = await ensureAuthUsers();
await upsertProfiles(userIds);
await upsertProjects(userIds);
await upsertCollections(userIds);
await upsertStores(userIds);
await upsertSocialAndStitchAlongs(userIds);

console.log(`Seeded ${seedUsers.length} users, ${projects.length} projects, ${stores.length} stores, ${products.length} products, and ${stitchAlongs.length} stitch-alongs.`);
console.log(`Seed users use password: ${seedPassword}`);
if (reset) console.log("Reset mode deleted and recreated seed auth users before seeding.");
