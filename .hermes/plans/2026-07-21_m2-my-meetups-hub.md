# M2 · My Meetups hub + calendar

**Board:** needlepoint  
**Workdir:** `/opt/data/workspace/needle-point-project`  
**Created:** 2026-07-21  
**Status:** Seeding + shipping M2.A first.

## Why

M1 closed (register, waitlist, confirm, host roster). Guests still have no home for **what I’m attending / hosting**. Highest product value next: personal meetup hub + add-to-calendar — still no Stripe/X.

## Goals

1. **My Meetups** — signed-in list of registered, waitlisted, and hosting events.
2. **Add to calendar** — download `.ics` for a meetup (registered or hosting).
3. **Entry points** — Meetups page tabs Browse | Mine; deep link `/meetups/mine`.
4. Light mobile polish on the hub.

## Non-goals

- Email digests / push (later)
- Paid tickets / Stripe
- QR check-in
- Epic X

## Epic order

| Epic | Priority | Roles |
|------|----------|-------|
| **M2.A My Meetups hub** | P0 | frontend + backend hydrate + qa |
| **M2.B Add to calendar (ICS)** | P0 | frontend (+qa) — can ship with A |
| **M2.C Hub mobile polish** | P2 | mobile |

## M2.A acceptance

- Auth required for Mine (guest → sign-in CTA).
- Sections: Registered, Waitlisted, Hosting (empty states with CTA to browse).
- Card opens meetup detail; capacity/status chips correct.
- Demo mode uses local meetup myRsvp + hostId.

## M2.B acceptance

- Registered or host can **Add to calendar** → `.ics` download with title, time, place, description, URL.
