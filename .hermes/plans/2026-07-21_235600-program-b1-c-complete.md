# Program B.1 + C — Implementation Plan

> **For Hermes:** Tech Lead orchestrates; role assignees on board. Auto-decompose off. Ship vertical slices.

**Goal:** Close remaining Phase B.1 meetup ops and Phase C creator value surfaces without commerce (D parked).

**Architecture:** Supabase SECURITY DEFINER RPCs + React UI. In-app tickets first (email later). Analytics uses existing outbound_click / creator_link_click tables.

**Tech Stack:** Vite/React, Supabase, Playwright smoke.

**Models:** backend/security → gpt-5.5 primary; frontend/QA → grok-4.5; both via fallback.

---

## Scope

### Program B.1 — Meetup tickets & ops (remainder)
| Story | Deliverable | Assignee bias |
|-------|-------------|----------------|
| B1.T Ticket card | Polished in-app ticket + confirmation ref + QR image | frontend-dev |
| B1.Q Check-in code | Server `check_in_code`; host check-in by code | backend-dev + frontend |
| B1.H Waitlist hold | 24h hold after promote; guest Confirm seat; expire frees seat | backend-dev + frontend |
| B1.E Email | **Deferred** — no Edge Functions / Resend yet | blocked |

### Program C — Community depth (first ship)
| Story | Deliverable | Assignee bias |
|-------|-------------|----------------|
| C.A Store analytics | Owner panel: 7/30d outbound click totals | frontend + backend (RPC exists) |
| C.B Creator link stats | Profile owner: link click totals (if links exist) | frontend |
| C.S SAL / guilds / DM groups | **Later sprint** — not this ship | parked this sprint |

### Explicit non-goals
- Stripe / paid tickets / Epic X
- Websockets DM realtime
- Guilds MVP this sprint

---

## Acceptance
1. Registered guest sees ticket card with ref + QR + code.
2. Host can check in by code or name-list toggle.
3. Waitlist promote sets 24h hold; Confirm seat clears it; expire demotes and promotes next (lazy on register/cancel/list).
4. Store owner sees click analytics strip on own shop.
5. Smoke green; push main; board archive.

## Workdir
`/opt/data/workspace/needle-point-project`
