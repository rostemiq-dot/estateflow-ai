# EstateFlow production gate

Do not start new CRM modules until this checklist passes.

## 1. Vercel production environment

For the canonical `estateflow-ai` project, confirm Production contains:

- `NODE_ENV=production`
- `CLIENT_URL=https://estateflow-ai-self.vercel.app`
- `SUPABASE_URL=https://mlxiuxxkfxpbgwyubzfd.supabase.co`
- `SUPABASE_ANON_KEY=<Supabase publishable/anon key>`
- `DATABASE_URL=postgresql://postgres.mlxiuxxkfxpbgwyubzfd:<PASSWORD>@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true`
- `DIRECT_URL=postgresql://postgres.mlxiuxxkfxpbgwyubzfd:<PASSWORD>@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`

Never put the database password in GitHub, browser code, or chat.

## 2. Deploy once after the Vercel free deployment limit resets

Verify:

- `/api/health` → healthy
- `/api/health/database` → healthy
- `/api/auth/register` → 404
- `/api/auth/login` → 404

## 3. Authentication/persistence loop

1. Create a new account through the real UI with CAPTCHA.
2. Confirm email if Supabase requires confirmation.
3. Log in.
4. Create a property.
5. Refresh the page.
6. Confirm the property is still present.
7. Log out.
8. Log back in.
9. Confirm the property is still present.
10. Repeat from a second/incognito browser session.

## 4. Multi-tenant isolation

Create Agency A and Agency B.

Agency A:
- create one property
- create one client

Agency B:
- property/client lists must not contain Agency A records
- direct `GET` by Agency A property ID must return 403/404
- update/delete by Agency A property ID must fail

Repeat the same check for clients.

## 5. Property photos

For an existing property:

1. Open the property card action menu.
2. Choose `Manage photos`.
3. Upload JPG/PNG/WebP/GIF files under 15 MB each.
4. Confirm the image appears.
5. Refresh the page and open `Manage photos` again.
6. Confirm the image still appears.
7. Set a cover photo.
8. Delete a photo and confirm it disappears.

Storage bucket: `property-media`, private, image-only, 15 MB limit.

## 6. Security checks

- CORS must equal the production `CLIENT_URL`.
- No `DATABASE_URL`, `DIRECT_URL`, service-role/secret key, or database password may appear in frontend source/build output.
- Supabase publishable/anon key may appear in frontend code; service/secret keys may not.
- Unknown backend errors must return a generic production message rather than Prisma/Postgres internals.

## Current known blocker

Vercel currently reports the free deployment quota (`api-deployments-free-per-day`). Do not repeatedly redeploy. Wait for the limit to reset, then perform one clean production deployment and run this checklist.
