# Architecture & Design

## 1. Tech Stack
- **Backend**: Java 17, Spring Boot 3.x, Spring Security, Spring Data JPA
- **Database**: PostgreSQL (shared tables, `salon_id` on every tenant-scoped table)
- **Cache/Locking**: Redis — used for slot-locking during booking creation to prevent race conditions
- **Frontend**: React (Vite), React Router, TanStack Query for API calls
- **Auth**: JWT in httpOnly cookie, domain scoped to `.yoursite.com`
- **Email**: AWS SES or Resend for transactional email
- **Hosting**: AWS — EC2/ECS for backend, RDS for Postgres, ElastiCache for Redis, S3 + CloudFront for frontend static assets and salon images
- **DNS/SSL**: Route 53 wildcard record `*.yoursite.com`, ACM wildcard cert

## 2. Multi-Tenancy: Subdomain Resolution

Flow for every incoming request:

1. Request hits `glamour.yoursite.com/api/services`
2. A servlet filter (`TenantResolutionFilter`) extracts subdomain from the `Host` header
3. Filter looks up `Salon` by subdomain (cached in Redis, TTL 5 min, to avoid a DB hit per request)
4. If not found → 404 "salon not found" page
5. If found → salon ID is stored in a `ThreadLocal` (`TenantContext`) for the duration of the request
6. Every repository query that touches tenant data filters by this salon ID — either manually in each query, or via Hibernate's `@Filter` / multi-tenancy support enabled at the session level

**Critical rule**: `TenantContext` must be cleared at the end of every request (in a `finally` block) — thread pools reuse threads, so a leaked tenant ID from a previous request will leak data into the next one on that thread.

For `yoursite.com` (no subdomain, or `www`), no tenant is set — these requests hit platform-level endpoints (salon directory, salon signup, admin).

## 3. Database Schema (core tables)

```
salons
  id (PK)
  subdomain (unique, indexed)
  name
  description
  address, city, phone, email
  logo_url
  status (PENDING, ACTIVE, SUSPENDED)
  cancellation_window_minutes
  created_at

users
  id (PK)
  email (unique)
  password_hash
  role (CUSTOMER, SALON_OWNER, PLATFORM_ADMIN)
  phone
  created_at

salon_staff
  id (PK)
  salon_id (FK -> salons)
  name
  photo_url
  is_active

staff_working_hours
  id (PK)
  staff_id (FK -> salon_staff)
  day_of_week (0-6)
  start_time
  end_time

staff_time_off
  id (PK)
  staff_id (FK -> salon_staff)
  start_datetime
  end_datetime
  reason

services
  id (PK)
  salon_id (FK -> salons)
  name
  duration_minutes
  price
  category
  is_active

staff_services  (many-to-many: which staff can perform which service)
  staff_id (FK)
  service_id (FK)

bookings
  id (PK)
  salon_id (FK -> salons)          -- always store this even though staff/service imply it, for fast tenant-scoped queries
  customer_id (FK -> users)
  staff_id (FK -> salon_staff)
  service_id (FK -> services)
  start_datetime
  end_datetime
  status (CONFIRMED, CANCELLED, COMPLETED, NO_SHOW)
  created_at
  cancelled_at

  -- CRITICAL: unique constraint to prevent double booking
  UNIQUE (staff_id, start_datetime)
```

Note on double-booking prevention: the `UNIQUE (staff_id, start_datetime)` constraint alone isn't fully sufficient because bookings have *duration* — two bookings could have different start times but overlap (e.g. 10:00–10:45 and 10:30–11:00). Two ways to handle this correctly:

- **Option A (simpler, use this for MVP)**: Only allow bookings to start on fixed slot boundaries (e.g. every 15 min), and when creating a booking, lock the staff's calendar row (`SELECT ... FOR UPDATE`) and check for any overlapping row in the same transaction before inserting. Wrap in a DB transaction with `SERIALIZABLE` or use a Postgres exclusion constraint (see below).
- **Option B (correct, Postgres-native)**: Use a Postgres `EXCLUDE` constraint with the `btree_gist` extension, which enforces no time-range overlap per staff at the database level regardless of application logic:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
EXCLUDE USING gist (
  staff_id WITH =,
  tsrange(start_datetime, end_datetime) WITH &&
) WHERE (status = 'CONFIRMED');
```

This is the actual fix — do this instead of relying only on application-level checks. It guarantees no overlap even under concurrent requests, without needing Redis locks. Use Redis locking only as an optimization to fail fast with a friendly "slot just got taken" message before hitting the DB — the DB constraint is the real safety net.

## 4. API Layer Structure

Two separate API surfaces sharing the same Spring Boot app:

- `/api/platform/*` — no tenant context required (salon directory, salon signup, platform admin)
- `/api/salon/*` — requires tenant context (resolved from subdomain), used by both the public salon page and the owner dashboard depending on the caller's role

## 5. Frontend Structure

Single React app, deployed once, but behaves differently based on the hostname it's loaded from:

```
src/
  App.jsx                 -- reads window.location.hostname, decides routing mode
  platform/                -- rendered when on yoursite.com
    HomePage.jsx
    SalonDirectory.jsx
    SalonSignup.jsx
  tenant/                  -- rendered when on {subdomain}.yoursite.com
    SalonPublicPage.jsx
    BookingFlow.jsx
    CustomerBookings.jsx
    dashboard/
      OwnerDashboard.jsx
      ServicesManager.jsx
      StaffManager.jsx
      BookingsCalendar.jsx
  shared/
    api/client.js          -- axios instance, withCredentials: true (needed for cross-subdomain cookie)
    auth/AuthContext.jsx
    components/
```

Key frontend detail: `axios` (or fetch) calls must set `withCredentials: true` so the shared auth cookie is sent on cross-subdomain requests, and the backend CORS config must explicitly allow credentials + list allowed origins (wildcard `*` does NOT work with credentials — must be exact origin matching, e.g. regex match `*.yoursite.com`).

## 6. Deployment Notes
- Wildcard SSL cert covers `*.yoursite.com` — one cert, not one per salon.
- CloudFront/S3 for the React build; API on ECS/EC2 behind an ALB.
- Route 53: `A` record wildcard `*.yoursite.com` → ALB/CloudFront, plus root `yoursite.com`.
