# Reports queue backend

`supabase/migrations/20260719211000_reports_queue.sql` hardens the user report data path.

## Submit path

Clients call `public.submit_report(p_target_type, p_target_id, p_reason, p_notes, p_target_label)` through `src/api/reports.ts` (`submitReportOnline`). The RPC derives the submitting user from `auth.uid()`; clients never provide the actor id. A `reports_enforce_insert_rules` trigger also rewrites the actor from `auth.uid()` and reapplies validation/rate limits for any direct table insert path.

Accepted targets are `project`, `profile`, and `store`. Accepted reasons are `spam`, `harassment`, `hate`, `scam`, `nudity`, `self_harm`, `illegal`, and `other`. Notes are trimmed and capped at 1000 characters; denormalized target labels are capped at 160 characters.

## Spam resistance

The database rejects:

- unauthenticated submissions,
- duplicate open reports from the same user for the same target,
- more than one report within 30 seconds from the same user,
- more than five reports within 10 minutes from the same user.

## RLS/admin review

RLS is enabled on `public.reports`. Normal authenticated users can insert their own report rows through the RPC and can select only their own submissions. Admin/moderator users are detected from JWT `app_metadata.role` or `app_metadata.roles` (`admin`/`moderator`) and can select/update the queue for review. Normal users have no delete path.

The admin table MVP can read via `fetchReportQueueOnline()`, with RLS returning queue rows only to admin/moderator accounts; service-role tooling can also read/update the queue.
