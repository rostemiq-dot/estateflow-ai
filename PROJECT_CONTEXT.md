# EstateFlow AI — Build Context

Last updated: 23 July 2026

## Product purpose

EstateFlow AI is a smart, friendly real-estate management system for agencies
in Kurdistan and Iraq. It should reduce repeated manual work, make daily agency
operations smoother, and feel professional without becoming difficult to use.

## Product and design rules

- Keep the existing premium white, slate, and amber-gold visual language.
- Make the most important action obvious and hide unnecessary complexity.
- Use reusable shared components and one icon system: Lucide React.
- Maintain strong mobile behavior, 44-pixel minimum touch targets, visible
  focus states, useful empty states, and clear validation/error messages.
- Keep the interface ready for Kurdish, Arabic, English, and future RTL work.
- Use free, professional technology. Do not add paid services, microservices,
  Docker, or infrastructure that the current stage does not need.
- Prefer complete, tested feature batches over many tiny manual copy-and-paste
  changes.

## Approved technical direction

React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook
Form, Zod, Lucide React, Recharts, date-fns, Vitest, React Testing Library,
Playwright, ESLint, Prettier, Git, GitHub, and Supabase when cloud persistence
is introduced.

## Completed foundations

### Application shell

- Responsive dashboard shell, sidebar, mobile navigation, and top bar
- Dashboard and route structure
- Properties and Clients workspaces

### Properties Foundation

- Typed property model with migration support for older saved data
- Browser persistence with safe fallback demo data
- Unique property IDs
- Complete create and edit workflow
- Direct JPG, PNG, and WebP upload
- Client-side image compression
- Up to six photos per property
- Photo previews, removal, and cover-photo selection
- Search across title, district, location, owner, phone, type, and ID
- Purpose, status, property-type, and district filters
- Active-filter count and clear-all action
- Recently updated, newest, highest-price, and lowest-price sorting
- Responsive property cards with cover images
- Three-dot View, Edit, Duplicate, and Delete menu
- Protected delete confirmation
- Full property profile with gallery arrows and thumbnails
- Persistent status changes
- Copy-listing, map, and owner-call actions
- Live property dashboard totals
- Automated unit tests and browser smoke coverage

### Clients + Smart Matching + Viewings

- Typed client profiles with safe migration from older saved data
- Persistent create, edit, and protected delete
- Purpose, currency, budget range, preferred areas, property types, minimum
  bedrooms, pipeline stage, and follow-up scheduling
- Client search and purpose/stage filters
- Direct call and WhatsApp follow-up actions
- Shared explainable matching engine
- Purpose, budget, area, property type, and bedroom score breakdown
- Real matching properties inside every client profile
- Real matching clients inside every property profile
- Dedicated Smart Matches workspace with filters and match actions
- WhatsApp-ready property sharing
- Multiple viewings per client and property
- Shared viewing calendar
- Scheduled, confirmed, completed, and cancelled viewing states
- Interested, considering, not interested, and offer-made outcomes
- WhatsApp viewing reminders
- Notes and outcomes connected to both client and property timelines
- Live dashboard viewings, strong-match totals, and recent activity
- Client/property/viewing integration tests using a browser-like DOM

### Deals + Offers + Commissions + Payments

- Persistent deal pipeline linked to existing client and property IDs
- Lead, Viewing, Negotiation, Offer Made, Contract, Closed Won, and Closed Lost
  stages with per-stage counts and direct stage movement
- Sale and rental deals with create, profile, edit, duplicate, archive, restore,
  and protected permanent deletion
- Search across deals, clients, properties, and agents with stage/type filters
  and value, action, and recent-update sorting
- Full deal profiles with assigned agent, expected value, probability, next
  action, close date, notes, linked viewings, shared client/property activity,
  call actions, and WhatsApp follow-up
- Multiple offers with status tracking, expiration, terms, notes, accepted-offer
  automation, and linked counteroffer history
- Integer minor-unit money storage to avoid floating-point calculation errors
- Percentage or fixed agency commission with configurable agent share and
  explicit expected/confirmed state
- Payment schedules and records with due/paid dates, method, reference, notes,
  automatic paid/remaining totals, overdue detection, cancellation, and
  overpayment/negative-value protection
- Confirmation-based closing, required Closed Lost reasons, preserved reopening
  history, and automatic Sold/Rented property status updates for won deals
- Live dashboard totals for active deals, pipeline value, won deals, expected
  commission, collected payments, outstanding balances, overdue schedules, and
  upcoming actions
- Responsive desktop and mobile deal workspace following the existing
  white/slate/amber EstateFlow design

## Storage at this stage

- Properties: `estateflow-properties` in browser localStorage
- Clients: `estateflow-clients` in browser localStorage
- Viewings: `estateflow-viewings` in browser localStorage
- Shared activity: `estateflow-activities` in browser localStorage
- Deals, offers, commissions, and payments: `estateflow-deals` in browser
  localStorage
- Property images are compressed data URLs for this local prototype

Browser storage is intentionally temporary architecture. Before real agency
deployment, move authentication, shared records, audit history, and images to
Supabase/PostgreSQL and private object storage.

## Next recommended milestone

Add authentication, agency/team roles, shared cloud persistence, private image
storage, and audit-safe synchronization with Supabase/PostgreSQL before using
EstateFlow for real multi-user agency operations.

## Validation baseline

Before publishing a milestone, run:

```bash
npm run test
npm run lint
npm run build
```

Also smoke-test create, edit, refresh persistence, photo persistence, search,
filters, sorting, duplicate, safe delete, status changes, dashboard totals,
client matching, viewing status/outcomes, shared activity, and a 390-pixel
mobile viewport.

Current automated baseline: 31 tests across property utilities, client
migration, smart matching, viewing utilities, deal calculations, offers,
closing rules, payment validation, deal persistence, and integrated screen
interactions.
