# EstateFlow AI

EstateFlow AI is a smart real-estate operating system for agencies in Kurdistan and Iraq. It brings property listings, clients, viewings, matching, and deal work into one professional workspace.

## Current product

- Responsive dashboard with live CRM totals and activity
- Property management with create, edit, search, filters, sorting, assignment, status, and soft deletion
- Client CRM with requirements, follow-ups, activities, roles, preferences, and tags
- Shared smart-matching engine for client and property profiles
- Viewing calendar with lifecycle rules and conflict detection
- Deals pipeline with stages, assignment, notes, and stage history
- Property media metadata, amenities, and tags APIs
- Desktop and mobile navigation

## Technology

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- React Hook Form
- Zod
- Lucide React
- Vitest
- React Testing Library
- Node.js and Express
- PostgreSQL and Prisma
- Supabase Auth
- Pino
- Supertest
- Vercel deployment

## Architecture

```text
React frontend
    ↓
Supabase Auth session
    ↓
Authenticated Bearer token
    ↓
Express /api
    ↓
Supabase Auth token validation
    ↓
Agency/User authorization
    ↓
Service layer
    ↓
Prisma repository layer
    ↓
Supabase PostgreSQL
```

The frontend must never receive `DATABASE_URL`, `DIRECT_URL`, database passwords, or any privileged Supabase key. Important production CRM data is persisted through the backend into PostgreSQL rather than relying on browser storage as the source of truth.

## Run locally

```bash
npm install
npm run dev
```

`npm run dev` starts both the Vite client and the API. The API defaults to `http://localhost:3000`, with health information at `/api/health`. Copy `.env.example` to `.env` and provide the required local Supabase/PostgreSQL configuration.

## Database

Supabase hosts the PostgreSQL database and Prisma is the ORM.

Configure:

- `DATABASE_URL` — transaction-mode Supabase pooler for application/serverless queries, normally port `6543` with `pgbouncer=true`.
- `DIRECT_URL` — session/direct Supabase connection for Prisma migration/direct operations, normally port `5432`.
- `SUPABASE_URL` — Supabase project URL used by the server-side auth client.
- `SUPABASE_ANON_KEY` — publishable/anon key used by the server-side auth client to validate user access tokens.

Database readiness is available at `GET /api/health/database`.

## Authentication

EstateFlow uses **Supabase Auth as the only authentication system**.

The old custom bcrypt/JWT/refresh-token authentication API has been removed. There are no supported `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, or `/api/auth/logout` endpoints anymore.

The frontend uses Supabase Auth for:

- Account creation
- Email/password login
- Session restoration
- Logout
- Auth state changes

Protected API requests send the Supabase access token as:

```text
Authorization: Bearer <supabase-access-token>
```

The Express authentication middleware validates that token with Supabase Auth, resolves the application User by email, and provisions an Agency + OWNER User record when the authenticated Supabase user does not yet have an application record.

Production must have `SUPABASE_URL` and `SUPABASE_ANON_KEY` configured. The backend no longer falls back to custom JWT secrets.

## Authorization and agency isolation

Every protected CRM request is associated with the authenticated application User and their Agency.

```text
Agency
 ├── Users
 ├── Properties
 ├── Clients
 ├── Viewings
 ├── Deals
 └── Agency-owned metadata
```

All database operations must remain agency-scoped. Users from one agency must never be able to read or modify another agency's records.

Roles currently include `OWNER`, `ADMIN`, and `AGENT`, with route-level authorization applied where appropriate.

## Property API

All property endpoints require a valid Supabase access token. Every database operation is scoped to the authenticated user's agency, and deleted properties are excluded through `deletedAt: null`.

| Method | Endpoint | Roles |
| ------ | -------- | ----- |
| POST | `/api/properties` | OWNER, ADMIN, AGENT |
| GET | `/api/properties` | Authenticated users |
| GET | `/api/properties/:propertyId` | Authenticated users |
| PATCH | `/api/properties/:propertyId` | Authenticated users, subject to ownership/assignment rules |
| DELETE | `/api/properties/:propertyId` | OWNER, ADMIN |

The listing endpoint supports pagination, search, status, property type, purpose, currency, city, district, assigned agent, price/bedroom/area ranges, and sorting.

## Clients API

Client endpoints are authenticated with the same Supabase Auth middleware and are agency-isolated. Client data includes requirements, preferences, activities, roles, assignments, and tags.

## Deals API

Deals connect same-agency clients, properties, and agents. Agents see only records allowed by the current authorization rules; owners/admins have broader agency access.

## Viewings calendar API

Viewings connect same-agency clients, properties, optional deals, and agents. Scheduling includes conflict detection, lifecycle rules, soft deletion, and activity logging.

## Property media, amenities, and tags API

The backend currently stores media metadata rather than acting as the binary object-storage provider. Object/file storage should be added separately through a secure storage layer rather than sending base64 media through the JSON API.

## Quality checks

```bash
npm run prisma:format
npm run prisma:validate
npm run prisma:generate
npm run test
npm run lint
npm run build
```

## Deployment

The production deployment target is Vercel. Supabase is the authentication and PostgreSQL provider.

Do not repeatedly redeploy when Vercel's deployment quota is exhausted. The current handoff should wait for the Vercel free deployment limit to reset, then deploy the latest `main` branch once and run the production verification flow.

## Production verification flow

Before building additional CRM modules, verify this exact loop:

```text
Create account
    ↓
Login
    ↓
Authenticated Supabase session
    ↓
Authenticated API request
    ↓
Application User + Agency
    ↓
Create property
    ↓
Property saved in PostgreSQL
    ↓
Refresh page
    ↓
Property still exists
    ↓
Logout
    ↓
Login again
    ↓
Property still exists
```

If this loop fails, do not continue into additional back-office modules. Fix authentication, persistence, authorization, or deployment first.

## Project direction

The next priority is making Properties + Clients reliable as a daily-driver CRM, followed by real media storage, agency-isolation verification, Smart Matches, and the Viewings/Deals workflows. Features such as commissions, payments, contracts/documents, billing, and subscriptions should remain secondary until the core authenticated persistence loop is proven in production.

See [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the broader product and engineering context.
