# Build Task List (execute in this order)

## Phase 1 — Foundation
1. Set up Spring Boot project (Java 17, Spring Web, Spring Data JPA, Spring Security, PostgreSQL driver, Validation).
2. Set up React project with Vite, React Router, Axios/TanStack Query.
3. Define Postgres schema per `02-architecture.md` section 3. Use Flyway or Liquibase for migrations — do not hand-edit the DB.
4. Enable `btree_gist` extension and add the `EXCLUDE` constraint on `bookings` table (this is not optional — it's the core correctness guarantee for the whole booking system).

## Phase 2 — Multi-Tenancy Core
5. Build `TenantResolutionFilter` (servlet filter) that extracts subdomain from `Host` header and resolves salon ID.
6. Build `TenantContext` (ThreadLocal holder) with a `finally`-block clear in the filter.
7. Write a repository-layer convention (base repository or Hibernate filter) so every tenant-scoped query is automatically salon-scoped. Write a test that proves salon A's data is never returned when salon B's tenant context is active.
8. Configure CORS: allow credentials, allow origin regex matching `https://*.yoursite.com` (exact origin matching required for cookies — no wildcard `*`).

## Phase 3 — Auth
9. Implement signup/login/logout, JWT generation, httpOnly cookie set with `Domain=.yoursite.com`.
10. Implement `/auth/me` and role-based route guards on both frontend and backend.
11. Test cross-subdomain SSO manually: log in on `yoursite.com`, navigate to a salon subdomain, confirm still logged in.

## Phase 4 — Platform Site
12. Salon directory search/list endpoint + frontend page.
13. Salon signup flow: subdomain availability check → create salon (PENDING) → admin approval → ACTIVE.
14. Platform admin approval screen.

## Phase 5 — Salon Public Page + Services/Staff Management
15. Salon profile public endpoint + page.
16. Owner dashboard: services CRUD.
17. Owner dashboard: staff CRUD + working hours + time-off.

## Phase 6 — Booking Engine (the critical path)
18. Availability calculation endpoint: given staff + service + date, compute open slots = working hours − existing bookings − time off, accounting for service duration.
19. Booking creation endpoint with the EXCLUDE constraint as the safety net; handle the 409 conflict response cleanly.
20. Write a concurrency test: fire 20 simultaneous requests for the same slot, assert exactly 1 succeeds and 19 get 409. Do this before considering the booking system done — this is the one part of the whole system that must be proven under load, not just "looks right in manual testing."
21. Booking list (customer view), cancel (customer + owner), status transitions (COMPLETED/NO_SHOW).

## Phase 7 — Notifications
22. Email on booking confirmation, cancellation (AWS SES or Resend).
23. Scheduled job (Spring `@Scheduled`) for 24hr/1hr reminder emails.

## Phase 8 — Dashboard Calendar + Analytics
24. Owner bookings calendar view (day/week), filterable by staff.
25. Basic analytics endpoint + dashboard widgets.

## Phase 9 — Reviews
26. Review submission (only after COMPLETED booking), public review display.

## Phase 10 — Deployment
27. Wildcard SSL + Route 53 wildcard DNS.
28. Deploy backend (ECS/EC2 + RDS), frontend (S3 + CloudFront).
29. Environment config for dev/staging/prod (don't hardcode `yoursite.com` — use env var for base domain so local dev works on `localhost`).

## Explicitly deferred (do not build until MVP above is validated)
- Online payments / deposits
- Custom domains per salon
- SMS/WhatsApp notifications
- Multi-branch salons
