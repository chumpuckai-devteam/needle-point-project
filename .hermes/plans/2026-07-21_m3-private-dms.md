# M3 · Private DMs (user↔user, user↔store)

**Board:** needlepoint  
**Created:** 2026-07-21  
**Status:** Shipping first slice now.

## Why

Meetups M0–M2 + on-site registration closed. PRD Phase C calls for **private DMs** so stitchers can coordinate (carpools, class questions) and message **shops** without leaving Needlepoint.

## First slice (M3.A)

1. Schema: `dm_threads`, `dm_messages` + RLS  
2. RPCs: open/get thread (user or store), list threads, list messages, send  
3. UI: `/messages`, `/messages/:id` inbox + thread  
4. Entry: **Message** on profile + store (auth-gated)  
5. Sidebar **Messages** (not bottom-tab #6)  
6. Demo mode local threads  

## Non-goals (this slice)

- Realtime/websockets (poll/refresh is fine)  
- Group chats / broadcast  
- Attachments / images  
- Push/email notifications  
- Read receipts beyond basic last_message_at  

## Later

- Unread badges, typing, media, moderation report on message  
