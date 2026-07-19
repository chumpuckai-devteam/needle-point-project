# Interest-ranked Discover + Studio recommendations

## Goal
Use onboarding preferences to make the first post-onboarding feeds feel intentionally needlepoint-specific without turning interests into hard filters. Discover and Studio should still be browseable, skip/dismiss should keep working, and users with no interests should get the same stable default feed they get today.

## Interest inputs
Use only explicit profile preference fields already captured by onboarding:

- `profile_interests.interest`: multi-select chips from `/onboarding`.
  Current chip values: `beginner projects`, `ornaments`, `canvases`, `pillows`, `holiday`, `florals`, `animals`, `modern patterns`.
- `profiles.skill_level`: selected skill level (`beginner`, `confident beginner`, `intermediate`, `advanced`).

Do not use free-text bio, location, email, search terms, or PII for this slice. If interests are later editable from account settings, keep the same storage contract: one row per interest in `profile_interests`, normalized to the same lower-case chip value strings.

## Surfaces in scope

1. Discover feed (`/discover`): ranked list of public projects after explicit search/filter constraints are applied.
2. Studio recommendations (`/`): ranked recommendation pool for the home Studio feed when the user does not have enough followed-creator content. Followed creator posts may remain first, but recommended fill should use the same interest scoring.

Out of scope: shop marketplace/checkout, direct messages, ads, notifications, native mobile, and store proximity ranking. Store rails can continue to use their current local/top-online logic.

## Matching rules
Rank by additive boosts. Interests bias ordering; they must not remove non-matching public projects unless the user explicitly applies Discover filters.

### Interest-to-project signals

| Interest | Project fields that count as a match |
| --- | --- |
| `beginner projects` | `difficulty = beginner` or `difficulty = confident beginner`; also match notes/title containing starter/beginner/new stitcher if a text index is available. |
| `ornaments` | `category = ornament`, `canvas_type` or title/notes containing ornament. |
| `canvases` | `category = canvas`, `canvas_type` containing canvas, or title/notes containing canvas. |
| `pillows` | `category = pillow`, title/notes/canvas type containing pillow. |
| `holiday` | tag/category/title/notes containing holiday, christmas, hanukkah, halloween, easter, valentine, or seasonal. |
| `florals` | tag/category/title/notes containing floral, flower, garden, rose, hydrangea, botanical. |
| `animals` | tag/category/title/notes containing animal, dog, cat, bird, horse, bunny, fox, pet, wildlife. |
| `modern patterns` | tag/category/title/notes/pattern source containing modern, geometric, abstract, contemporary, colorblock, minimalist. |

Use structured fields first (`category`, `difficulty`, `stitchTypes`/`project_tags`, `colors`, `canvas_type`), then optional case-insensitive text matching against title/description/notes/pattern source. Text matches are supporting signals, not the only source of truth.

### Score sketch
Start with a stable base ranking, then add boosts:

- Base score: recency + social quality.
  - `+0.35` for recent updates/created date decay.
  - `+0.20` for engagement quality such as likes/comments/saves, capped so old popular posts do not dominate.
  - `+0.10` for media completeness (`primary_image_url` or video present) to keep the feed visual.
- Interest match boosts:
  - `+1.00` for each selected interest with a strong structured match.
  - `+0.50` for each selected interest with only a text/tag synonym match.
  - Cap total interest boost at `+2.50` per project so users with many interests still see variety.
- Skill fit boost:
  - `+0.60` when project difficulty equals the user skill level.
  - `+0.35` when project difficulty is one level easier/harder.
  - For `beginner` users, do not boost `advanced` projects unless they also match an explicit non-skill interest.
- Creator/follow boost for Studio only:
  - Followed creator posts can remain pinned ahead of recommendations or receive a large `+3.00` boost.
  - Recommended fill should still apply interest scoring below followed content.
- Diversity penalty:
  - Apply a small `-0.25` penalty after two consecutive projects from the same creator or same top interest bucket, or interleave during client/server post-processing.

Tie-breaker: `score desc`, then `updated_at desc`, then `id asc` for deterministic pagination.

## Default and edge behavior

- No interests selected: return the stable default ranking (recency/engagement/media; followed creators first on Studio). No empty state solely because interests are empty.
- Onboarding skipped: same as no interests. Skipping onboarding must not set fake interests.
- Many interests: use all selected interests, cap boost as above, and preserve diversity so one broad profile does not monopolize the feed.
- Cold start with few projects: show all eligible public projects in default order; if fewer than 3 projects match interests, fill the rest with default-ranked public projects.
- New user/no follows: Studio should use the recommendation pool directly.
- Existing explicit Discover filters/search: filters are hard constraints first; interest ranking only orders the resulting set.

## Skip / dismiss contract

Skip means a user dismisses a recommended project from a recommendation surface. It must remove that item from future recommendation results for that user on that surface while keeping the feed populated from the remaining ranked pool.

Recommended contract:

- Persist dismissals by `(user_id, project_id, surface)` with `dismissed_at`.
- Surface values: `discover`, `studio`.
- Recommendation query accepts/excludes a caller-specific dismissed project set before ordering/pagination.
- If the user skips the top-ranked item, the next response returns the next eligible ranked item(s); it must not reinsert the skipped item or return an empty page while other eligible projects remain.
- Dismissals are not likes/saves, do not affect global ranking, and should not delete or hide the project from direct links, creator profiles, or explicit search if product later decides search should override dismissals. For this slice, dismissed items stay out of Discover/Studio recommendation feeds.

## API / backend notes

Preferred shape: add a small recommendation data path rather than embedding ranking rules in multiple components.

- `get_recommended_projects(surface text, limit int, cursor text default null)` RPC or equivalent API helper.
- Reads authenticated user id when present; guests/demo use no-interests default ranking.
- Joins/loads:
  - `profiles.skill_level`
  - `profile_interests.interest`
  - public projects + project tags/materials/update metadata needed for scoring
  - user-specific dismissed projects for the requested surface
- Returns existing project fields consumed by the frontend plus optional debug/dev fields behind a non-production flag: `recommendation_score`, `matched_interests`.
- Keep RLS intact: public projects remain publicly readable; user interests and dismissals should be own-user readable/writable, not public graph data.
- Pagination/cursor must be deterministic from score/tie-breakers so skip + paging cannot loop.

Frontend should consume the ranked order as authoritative. It may show lightweight copy such as "Because you picked florals" only if `matched_interests` is available; this copy is optional for the first slice.

## Acceptance criteria / testable checks

1. Given a user with `profile_interests = ['florals']` and a mixed project pool, `/discover` ranks floral/botanical projects above otherwise similar non-floral projects after filters are applied.
2. Given a user with `profile_interests = ['ornaments', 'holiday']`, the first visible Discover page contains a clearly biased mix: at least half of the first 6 available projects should match one selected interest when enough matching inventory exists.
3. Given the same user lands on Studio after onboarding, recommendations/fill show selected-interest matches near the top; if followed creators exist, their posts can lead but recommended items below them are still interest-biased.
4. Given no interests or skipped onboarding, Discover and Studio still return non-empty default feeds when public projects exist.
5. Given many selected interests, ranking remains deterministic and varied; no more than two consecutive recommended projects should come from the same creator when alternatives exist.
6. Given a user skips/dismisses a project on Discover, subsequent Discover recommendation responses exclude that project and return the next eligible project while other projects exist.
7. Given a user skips/dismisses a project on Studio, subsequent Studio recommendation responses exclude that project from Studio recommendations; Discover behavior follows the surface-specific dismissal rule.
8. Explicit Discover search/filter constraints still win: filtering to `difficulty = advanced` does not show beginner projects solely because `beginner projects` is selected.
9. RLS/auth checks: a signed-in user can read/write only their own interests and dismissals; guests can read public default recommendations but cannot create persistent dismissals unless an approved anonymous-session design is added later.
10. Verification notes for implementation include at least one ranking fixture/test and one skip/dismiss fixture/test covering "feed bias visible" and "skip still works".
