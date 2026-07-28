# EstateFlow AI — Build Context

Last updated: 28 July 2026

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

### Backend foundation (Phase 1A)

- Express and TypeScript API kept separate from the Vite application
- Zod-validated environment configuration
- Helmet, configurable CORS, JSON parsing, and Pino HTTP logging
- Health endpoint, JSON 404 responses, and global JSON error handling
- Graceful process shutdown and fatal process error logging
- Supertest coverage for health and unknown API routes
- Existing localStorage and IndexedDB persistence remains unchanged

### PostgreSQL and Prisma foundation (Phase 1B)

- PostgreSQL Prisma schema for agencies, users, and properties
- UUID primary keys, monetary decimal storage, enums, relations, and lookup
  indexes
- Development-safe shared Prisma Client
- Sanitized database readiness endpoint at `GET /api/health/database`
- Database health tests use an injected Prisma mock; no live database or
  migration is required
- Frontend localStorage and IndexedDB persistence remains unchanged

### Production authentication and authorization (Phase 2)

- Transactional agency and owner registration
- bcrypt password hashing with 12 work-factor rounds
- 15-minute JWT access tokens with issuer, audience, and algorithm checks
- Seven-day rotating refresh tokens stored as SHA-256 hashes
- Refresh-token family replay detection and revocation
- HttpOnly, SameSite refresh-token cookies with production HTTPS enforcement
- Bearer authentication that reloads the current user from PostgreSQL
- OWNER, ADMIN, and AGENT role authorization middleware
- Strict Zod validation and consistent credential errors
- Unit and HTTP tests use dependency injection and do not require Neon

### Production property management API (Phase 3A)

- Authenticated create, list, detail, update, and soft-delete endpoints
- Strict repository-level agency isolation for every property operation
- OWNER and ADMIN full property management permissions
- AGENT create access and creator/assignment-scoped update permissions
- Same-agency active-user assignment validation
- Agency-scoped reference-code uniqueness
- Search, filters, pagination, range validation, and deterministic sorting
- Decimal-backed prices, areas, and geographic coordinates
- Soft-deleted properties consistently excluded from reads and mutations
- Migration `20260728040000_property_management_api` generated but not applied
  to Neon
- Existing frontend localStorage and IndexedDB behavior remains unchanged

### Property media, amenities, and tags (Phase 3B)

- Storage-provider-neutral property media metadata; no upload or storage
  integration
- Image, video, PDF, floor-plan, and future 360-tour media enum
- MIME/media-type validation, ordered display, cover selection, dimensions,
  duration, file metadata, and JSON provider metadata
- Agency-isolated repositories and soft deletion for media and catalogs
- Agency-owned amenity and property-tag catalogs with slug uniqueness
- Composite-key property/amenity and property/tag join tables
- Authenticated media reads and role-authorized mutations
- OWNER/ADMIN catalog mutations with authenticated catalog reads
- Repository, service, route, and validation coverage
- Transactional migration
  `20260728150000_property_media_amenities_tags`, generated but not applied to
  Neon
- Frontend behavior remains unchanged

### Deals pipeline (Phase 5)

- Agency-isolated deal CRUD, assignment, search, filtering, sorting, and
  pagination
- Agent access restricted to assigned deals; owner/admin agency-wide access
- Same-agency active client, property, and assigned-agent validation
- Transactional initial history and optimistic-concurrency stage changes
- Append-only stage history and soft-deleted, parent-scoped notes
- WON/LOST state consistency and closing-field enforcement
- Fixed and percentage commission validation with non-negative financial data
- Backend REST API only; no Kanban frontend, viewing, task, notification,
  document, contract, or external-service integration
- Transactional migration `20260728210000_deals_pipeline`, generated but not
  applied to Neon

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

### Contracts + Documents + Tasks + Notifications

- Sale and rental contracts created only from accepted offers and linked to
  existing deals, clients, properties, and offers
- Editable professional clauses, version history, review/sign/cancel workflow,
  locked signed snapshots, legal-review disclaimer, and print/PDF view
- Shared Document Center with typed metadata and IndexedDB file storage
- PDF, JPG, PNG, WEBP, DOCX, and XLSX validation, upload, rename, replace,
  download, entity/category filtering, and protected deletion
- List and board task workspace with priorities, due-date filters, linked
  records, activity history, completion, rescheduling, duplication, archiving,
  and protected deletion
- Deterministic local task automations for viewings, offers, accepted offers,
  payments, and contracts ready to sign, with duplicate prevention
- In-app notification bell with unread count, direct navigation, mark-read,
  mark-all-read, dismissal, and event-signature-aware recurrence
- Dashboard operational metrics for contracts, tasks, offers, viewings,
  payments, and recent document activity

### Workflow reliability fixes

- Create Task dialog constrained to the viewport with an internal scroll
  region, persistent header and action footer, backdrop/X/Cancel/Escape closing,
  dirty-form protection, page scroll locking, keyboard focus trapping, and
  focus restoration
- Always-visible Create Contract action with a detailed eligible accepted-offer
  selector showing the linked deal, client, property, amount, and deal type
- Draft contract creation routes directly into the full editor and remains
  persisted after refresh
- Accepted offers expose a Create Contract action from their deal profile
- Duplicate contracts are prevented by accepted-offer ID
- Contract empty states explain the accepted-offer prerequisite and link back
  to Deals

### Team + Reports + Administration

- Local Team workspace with owner seed, safe migration, CRUD, archive/reactivate,
  duplicate-email protection, roles/statuses, agent-name assignment suggestions,
  workload, and currency-separated performance
- Professional live Reports workspace with calendar presets, custom ranges,
  business/deal/property/client/viewing/task/contract/document metrics,
  separated USD/IQD totals, CSV export, and print layout
- Automation Center for enabling, disabling, timing, evaluating, and auditing
  the existing deterministic viewing, offer, payment, contract, task, and
  follow-up rules
- Complete Settings workspace for agency profile, localization, business
  defaults, custom-list migration and protected replacement, appearance,
  persisted sidebar preference, and validated Merge/Replace JSON backups
- Backups include EstateFlow localStorage and readable IndexedDB document files
- In-app Help Center with full workflow, module guides, FAQ, local-data
  limitations, troubleshooting, shortcuts, version, and schema information
- Collapsible desktop sidebar, stable header/footer, smooth short-viewport
  navigation, hidden native scrollbar arrows, focus states, and Escape/scroll
  locking for the mobile drawer
- Focused dashboard panels for team workload, sales versus rentals, and
  automation alerts

## Storage at this stage

- Properties: `estateflow-properties` in browser localStorage
- Clients: `estateflow-clients` in browser localStorage
- Viewings: `estateflow-viewings` in browser localStorage
- Shared activity: `estateflow-activities` in browser localStorage
- Deals, offers, commissions, and payments: `estateflow-deals` in browser
  localStorage
- Contracts: `estateflow-contracts` in browser localStorage
- Tasks: `estateflow-tasks` in browser localStorage
- Document metadata: `estateflow-documents` in browser localStorage
- Document binary data: `estateflow-document-files` in browser IndexedDB
- Notification state: `estateflow-notification-state` in browser localStorage
- Team: `estateflow-team` in browser localStorage
- Settings: `estateflow-settings` in browser localStorage
- Automation configuration/history: `estateflow-automations` in browser
  localStorage
- Property images are compressed data URLs for this local prototype

Browser storage is intentionally temporary architecture. Before real agency
deployment, move authentication, shared records, audit history, and images to
Supabase/PostgreSQL and private object storage.

## Next recommended milestone

Connect the frontend to the authenticated API, add invitation and account
recovery workflows, migrate shared records from browser storage, add private
object storage, and introduce audit-safe synchronization before real multi-user
agency operations.

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

Current automated baseline includes property utilities, client migration, smart
matching, viewing utilities, deal calculations and persistence, contracts and
signed snapshots, IndexedDB documents, task automation and timing,
notification dismissal, and integrated screen interactions.
