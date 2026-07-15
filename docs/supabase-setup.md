# Needlepoint Project — Supabase setup (greenfield)

There is **no existing Supabase project**. Create one, apply the migration, then wire Vite env vars.

## 1. Create project

1. Go to https://supabase.com/dashboard and create a free project (region of your choice).
2. Wait until the database is ready.
3. Open **Project Settings → API**:
   - Copy **Project URL** → `VITE_SUPABASE_URL`
   - Copy **anon public** key → `VITE_SUPABASE_ANON_KEY`
4. (Optional, local scripts only) Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`  
   **Never** put the service role key in the Vite client or commit it.

## 2. Auth settings (password)

1. **Authentication → Providers → Email**: enable Email.
2. Disable “Confirm email” for early private beta if you want frictionless testing  
   (or leave it on and use the confirmation link).
3. Set Site URL to your Vite origin, e.g. `http://127.0.0.1:5173` and production Vercel URL.
4. Add redirect URLs for local + production.

## 3. Apply schema

### Option A — SQL editor (fastest for first setup)

1. Open **SQL → New query**.
2. Paste the full contents of  
   `supabase/migrations/20260715120000_init.sql`
3. Run. If `storage.buckets` insert fails because storage schema differs, create a public bucket named `project-images` in **Storage** UI and re-run only the storage policies section if needed.

### Option B — Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

## 4. Local env

```bash
cp .env.example .env.local
# edit values
npm run dev
```

Without env vars, the app runs in **demo mode** (localStorage + seed data, no real multi-user auth).

## 5. Seed content (optional)

After at least one real user exists (or using service role), load demo creators/projects with:

```bash
# requires SUPABASE_SERVICE_ROLE_KEY + VITE_SUPABASE_URL in env
npm run seed
```

(Implement/adjust `scripts/seed.mjs` as needed.)

## 6. Verify

- Sign up with email + password
- Profile row appears in `profiles`
- Create a project; row appears with RLS (only owner edits)
- Upload image under Storage `project-images/<user-id>/...`
