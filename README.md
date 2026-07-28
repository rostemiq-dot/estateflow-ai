# EstateFlow AI

EstateFlow AI is a smart real-estate operating system for agencies in
Kurdistan and Iraq. It brings property listings, clients, viewings, matching,
and deal work into one fast, professional workspace.

## Current product

- Responsive dashboard with live property portfolio totals
- Persistent property listings saved in the browser
- Complete create and edit forms
- Direct property photo upload, compression, previews, cover selection, and
  removal
- Search by listing, district, location, owner, phone, type, or ID
- Purpose, status, type, and district filters
- Recent, newest, highest-price, and lowest-price sorting
- Property duplication and protected deletion
- Property gallery, status management, owner actions, and shareable listing
  details
- Persistent client CRM with create, edit, protected delete, exact
  requirements, follow-up dates, calls, and WhatsApp actions
- One shared smart-matching engine for client and property profiles
- Explainable scores for purpose, budget, area, property type, and bedrooms
- Smart Matches workspace with search, filters, property sharing, and viewing
  actions
- Shared viewing calendar with confirmation, cancellation, reminders, and
  outcomes
- Client and property activity timelines connected to the same saved records
- Live dashboard viewing schedule, match totals, and recent activity
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
- jsdom
- Node.js and Express
- PostgreSQL and Prisma
- Pino
- Supertest

The frontend continues to use browser storage. Phase 1A adds an Express API
foundation without moving existing data or changing frontend behavior.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite.

`npm run dev` starts both the Vite client and the API. The API defaults to
`http://localhost:3000`, with health information at `/api/health`. Copy
`.env.example` to `.env` to override the validated server configuration.

## Database foundation

Phase 1B defines the initial PostgreSQL models for agencies, users, and
properties. Set `DATABASE_URL` in `.env`, then validate and generate the Prisma
Client:

```bash
npm run prisma:validate
npm run prisma:generate
```

Create a migration only after connecting an intended PostgreSQL database with
valid credentials. Database readiness is available at
`GET /api/health/database`; existing frontend data remains in browser storage.

## Authentication API

The API supports transactional agency-owner registration, bcrypt password
hashing, short-lived JWT access tokens, rotating refresh tokens, and role-based
authorization. Refresh tokens are stored as SHA-256 hashes and sent only in an
HttpOnly cookie.

Configure separate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values of at
least 32 random characters. Production cookies require HTTPS.

| Method | Endpoint             | Purpose                              |
| ------ | -------------------- | ------------------------------------ |
| POST   | `/api/auth/register` | Create an agency and its owner       |
| POST   | `/api/auth/login`    | Authenticate with email and password |
| POST   | `/api/auth/refresh`  | Rotate the refresh token             |
| POST   | `/api/auth/logout`   | Revoke the current refresh token     |
| GET    | `/api/auth/me`       | Return the authenticated user        |

Send access tokens as `Authorization: Bearer <token>`. Access tokens expire
after 15 minutes; refresh sessions expire after seven days.

## Property API

All property endpoints require a Bearer access token. Every database operation
is scoped to the authenticated user's agency, and deleted properties are
excluded through `deletedAt: null`.

| Method | Endpoint                      | Roles               |
| ------ | ----------------------------- | ------------------- |
| POST   | `/api/properties`             | OWNER, ADMIN, AGENT |
| GET    | `/api/properties`             | Authenticated users |
| GET    | `/api/properties/:propertyId` | Authenticated users |
| PATCH  | `/api/properties/:propertyId` | OWNER, ADMIN, AGENT |
| DELETE | `/api/properties/:propertyId` | OWNER, ADMIN        |

Agents can update only properties they created or are assigned to, and they can
assign properties only to themselves. Owners and admins can assign any active
user in their agency. Deletes are soft deletes.

The listing endpoint supports `page`, `pageSize`, `search`, `status`,
`propertyType`, `purpose`, `currency`, `city`, `district`, `assignedAgentId`,
price/bedroom/area ranges, `sortBy`, and `sortOrder`. The default page size is
20 and the maximum is 100:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Migration `20260728040000_property_management_api` is generated but must be
reviewed before it is applied to Neon. The existing frontend continues to use
browser storage during Phase 3A.

## Quality checks

```bash
npm run test
npm run lint
npm run build
```

## Project direction

See [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the authoritative build
status, product rules, and next milestone.
