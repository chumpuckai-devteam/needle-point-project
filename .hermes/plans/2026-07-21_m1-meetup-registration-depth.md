# M1 · Meetup registration depth

**Board:** needlepoint  
**Workdir:** `/opt/data/workspace/needle-point-project`  
**Created:** 2026-07-21  
**Status:** Program seeded — **Epic M1.A (waitlist) first ship slice** after cleanup; remaining epics triage until M1.A done.

## Why this program

M0 (H/B/Q/L/P) closed. Free **Register** + capacity + cancel-policy copy shipped (`8bca977`).  
Natural next wedge from product direction: **capacity-aware registration depth** (PRD Phase B.1) — not commerce/X.

## Goals

1. **Waitlist when full** — guests can join waitlist; cancel frees seat and offers next waitlisted user.
2. **Registration confirmation** — clear “you’re registered” persistence + optional email later.
3. **Host roster (lite)** — host sees who’s registered / waitlisted; mark no-show optional.
4. **Mobile polish** only if dogfood finds P0s on meetup surfaces.

## Non-goals (this program)

- Stripe / paid tickets (park until explicit ask)
- Full QR check-in hardware flow
- Zoom hosting
- Epic X marketplace

## Epic order (priority)

| Epic | Priority | Roles | Notes |
|------|----------|-------|-------|
| **M1.A Waitlist + cancel-fill** | P0 | backend → security → frontend → qa → devops | First ship slice |
| **M1.B Confirm registration** | P1 | backend → frontend → qa | In-app confirmed state; email if cheap |
| **M1.C Host roster** | P1 | backend → frontend → qa | Host-only list |
| **M1.D Meetup mobile polish** | P2 | mobile → frontend → qa | Only residual dogfood |

## M1.A acceptance (first slice)

- Full meetup shows **Join waitlist** (not dead-end Full only).
- Waitlisted user sees position or “on waitlist”.
- When a registered user cancels, next waitlisted user is **promoted** (or notified to claim within a hold window — prefer auto-promote for v1 if simpler).
- Spots left / capacity remain accurate under race (RPC + row lock).
- Guests can browse; waitlist join requires auth (`requireAuth`).
- Smoke: full → waitlist → cancel → seat opens / promote.
- Auto-deploy after QA green.

## Open product defaults (no stall)

- **Auto-promote** waitlist on cancel (simpler than offer-hold).
- **No paid tickets** in M1.
- Email confirmation is M1.B nice-to-have; in-app banner is enough for A.

## Dispatch rule

- `kanban.auto_decompose` stays **false**.
- Tech Lead promotes **only M1.A** children when shipping; rest stay `--triage`.
- Do not parent-block implementation tasks under long-lived Program.

## Dogfood path

1. Host meetup capacity 1 (or use seed + force full).
2. User A registers → full.
3. User B joins waitlist.
4. A cancels → B becomes registered (or next in line).
5. Mobile: register/cancel CTAs readable.
