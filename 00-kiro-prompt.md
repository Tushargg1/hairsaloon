You are building a full-stack multi-tenant salon booking SaaS platform. Read all four spec files below fully before writing any code. Build in the exact phase order given in the task list — do not skip ahead to features in later phases.

Attached spec files (read all before starting):
1. `01-requirements.md` — what the product does and its scope boundaries
2. `02-architecture.md` — tech stack, multi-tenancy design, DB schema, booking concurrency solution
3. `03-api-reference.md` — every endpoint, request/response shapes, authorization rules
4. `04-tasks.md` — the exact build order

## Non-negotiable technical constraints
- Tech stack: Java 17 + Spring Boot 3.x backend, React (Vite) frontend, PostgreSQL, Redis, JWT httpOnly cookies.
- Multi-tenancy is subdomain-based, resolved per-request from the `Host` header. Every tenant-scoped DB table has a `salon_id` column and every query must be scoped to it.
- Booking double-booking prevention MUST use a Postgres `EXCLUDE` constraint with `btree_gist` on `(staff_id, tsrange(start_datetime, end_datetime))` — not just an application-level check-then-insert. This is described in `02-architecture.md` section 3.
- Auth cookie must be set with `Domain=.yoursite.com` (leading dot) so it works across the main site and every salon subdomain. Do not use localStorage for the auth token — it breaks cross-subdomain login.
- CORS must allow credentials with exact origin regex matching `*.yoursite.com` — wildcard `*` origin does not work when credentials are enabled.
- Every dashboard endpoint must explicitly verify the logged-in owner owns the salon being modified, not just rely on subdomain resolution.

## What to deliver
- Full Spring Boot backend project with all endpoints from `03-api-reference.md`, Flyway migrations for the schema in `02-architecture.md`, and a concurrency test proving the booking system rejects double-bookings under simultaneous requests (task 20 in `04-tasks.md`).
- Full React frontend covering both platform pages (homepage, salon directory, salon signup) and tenant pages (public salon page, booking flow, customer bookings, owner dashboard) as structured in `02-architecture.md` section 5.
- README with local dev setup instructions, including how to test subdomain routing locally (e.g. using `/etc/hosts` entries like `glamour.localhost`).

## Explicitly out of scope — do not build these even if they seem easy to add
- Online payments
- Custom domains per salon
- SMS/WhatsApp notifications
- Multi-branch salons

Work through the task list phase by phase. After each phase, stop and summarize what was built before moving to the next phase.
