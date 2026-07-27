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

## Quality checks

```bash
npm run test
npm run lint
npm run build
```

## Project direction

See [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the authoritative build
status, product rules, and next milestone.
