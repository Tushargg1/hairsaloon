# Groomit

Groomit is a multi-tenant salon booking SaaS platform (groomit.in). Each salon gets its own subdomain: `https://salonname.groomit.in`. The platform site lives at `https://groomit.in`.

## Architecture

A React 18/Vite SPA serves both the platform host and tenant subdomains. Spring Boot 3.3/Java 17 exposes `/api/platform/**` and host-resolved `/api/salon/**` APIs. PostgreSQL is authoritative for tenants, bookings, reviews, and the notification outbox; Redis caches tenant resolution; Flyway owns schema changes. Authentication is a JWT in an HttpOnly cookie shared across the configured base domain.

Production configuration in `deploy/aws` uses one CloudFront distribution for the apex and `*.domain`: private S3 handles SPA requests and `/api/*` goes to an ALB/ECS service. A separate private, encrypted, versioned S3 bucket stores salon-prefixed media and is served by its own OAC-protected CloudFront distribution; ECS receives only prefix-scoped object access. API caching is disabled and viewer Host, cookies, credential headers, Origin, and query strings are forwarded. This is essential because the backend resolves salons from `Host`. RDS PostgreSQL and encrypted ElastiCache Redis remain private.

## Prerequisites

- Windows 10/11 with PowerShell, Git, Docker Desktop/Compose, and at least 4 GB free memory.
- JDK 17 (`java -version`). Maven installation is not needed; use `backend\mvnw.cmd`.
- Node.js 20.18.x and npm (`node --version`, `npm --version`). `frontend\.nvmrc` records the reviewed version.
- Ports 5432, 6379, 8080, and 5173 available.
- Optional: Terraform matching `deploy/aws/versions.tf` for offline review. AWS credentials/domain are not needed for local development.

## Local setup on Windows

From the repository root:

```powershell
Copy-Item .env.example .env
Copy-Item frontend\.env.example frontend\.env.local
# Edit .env and replace POSTGRES_PASSWORD and JWT_SECRET with local-only values.
docker compose --env-file .env up -d postgres redis
docker compose ps
```

Load `.env` into the current PowerShell process before starting the backend:

```powershell
Get-Content .env | Where-Object { $_ -and -not $_.StartsWith('#') } | ForEach-Object {
  $name, $value = $_.Split('=', 2)
  [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}
Set-Location backend
.\mvnw.cmd spring-boot:run
```
That backend command is intentionally documented, not run by this Phase 10 work because it is long-running. On startup Flyway automatically validates and applies `backend\src\main\resources\db\migration`; `ddl-auto=validate` prevents Hibernate from silently changing production schema. To inspect migration state, check startup logs or connect with `docker compose exec postgres psql -U groomit -d groomit -c "select version,description,success from flyway_schema_history order by installed_rank;"`.

In a second PowerShell terminal:

```powershell
Set-Location frontend
npm ci
npm run dev -- --host 0.0.0.0
```

This frontend command is also long-running and was not executed during validation. Open `http://lvh.me:5173`; after a tenant exists, open `http://<subdomain>.lvh.me:5173`. The frontend derives `http://<current-host>:8080` when `VITE_API_BASE_URL` is blank, preserving the tenant hostname at the backend.

Stop local dependencies with `docker compose down`. Add `-v` only when intentionally deleting all local PostgreSQL/Redis data.

## Local subdomain routing

`lvh.me` and `localtest.me` resolve their apex and subdomains to loopback without hosts-file edits. The examples default to `lvh.me`. To use `localtest.me`, change both env files consistently: `BASE_DOMAIN=localtest.me`, `PLATFORM_HOSTS=localtest.me,www.localtest.me`, `AUTH_COOKIE_DOMAIN=.localtest.me`, matching CORS origins/pattern, and `VITE_BASE_DOMAIN=localtest.me`.

For an offline Windows hosts-file setup, run Notepad as Administrator, edit `C:\Windows\System32\drivers\etc\hosts`, and add every hostname explicitly (hosts files do not support wildcards):

```text
127.0.0.1 groomit.test
127.0.0.1 www.groomit.test
127.0.0.1 glamour.groomit.test
```

Then set `BASE_DOMAIN=groomit.test`, platform hosts, cookie domain `.groomit.test`, CORS values, and frontend base domain to match; run `ipconfig /flushdns`. Add another line for each salon subdomain.

### Cookies, CORS, and TLS

Local cookies are HttpOnly, `SameSite=Lax`, `Secure=false`, path `/`, domain `.lvh.me`. Production must use `AUTH_COOKIE_SECURE=true` and `AUTH_COOKIE_DOMAIN=.<actual-apex>`, with HTTPS on every host. Credentialed requests cannot use CORS origin `*`: configure the exact apex in `CORS_ALLOWED_ORIGINS` and the HTTPS tenant pattern in `CORS_ALLOWED_ORIGIN_PATTERNS`. The browser client always uses `withCredentials: true`.

The current API uses stateless cookie JWTs and intentionally disables CSRF protection. `SameSite=Lax`, strict CORS, TLS, and no cross-site embedding reduce risk, but a production security review should decide whether state-changing requests also require an explicit CSRF token before launch.

## Platform administrator bootstrap

Bootstrap is off by default. For first local setup only, set `PLATFORM_ADMIN_BOOTSTRAP_ENABLED=true`, a valid unused email, and a password of 8–72 characters; start the backend once. Existing platform-admin accounts are left unchanged, and startup fails if the email belongs to another role. Immediately set bootstrap to false, remove the password from the process/file, restart, and sign in at `/manage/login`. In staging/production supply any temporary bootstrap password only as an ECS task secret and remove/disable it after use; the provided Terraform keeps bootstrap disabled.

## Authentication model

Public signup and login (`/signup`, `/login`) are customer-only. Phone is required, email is optional, and a password (8–72 characters) is mandatory. Signup requires a phone-verified OTP proof before the account is created. A forgot-password flow uses the same OTP mechanism to allow customers to reset their password.

Salon owners and platform administrators sign in at `/manage/login` using an email/password privileged-login endpoint. Owners cannot self-register—they are provisioned by a platform admin from `/admin/approvals` using a dedicated owner-creation form. After provisioning, the owner signs in via the management login and proceeds to register their salon.

### OTP and SMS

Phone verification uses a pluggable `SmsGateway` abstraction. In development (`OTP_ALLOW_CODE_LOGGING=true`), codes are logged to stdout at DEBUG level for testing. No external SMS provider is wired yet; a production implementation (Twilio, AWS SNS, etc.) must implement `SmsGateway` and be activated by configuration.

### Rate limiting

Authentication rate limiting uses Redis atomic counters (keyed by HMAC-hashed IP and principal) with an in-memory fallback when Redis is unavailable. Configurable via `AUTH_RATE_LIMIT_*` environment variables.
## Sample onboarding flow

1. Bootstrap and sign in as platform admin at `/manage/login`.
2. From `/admin/approvals`, use the "Create salon owner" form to provision an owner account with name, phone, email, and a temporary password.
3. In a separate browser/session, sign in as the new owner at `/manage/login` using their email and temporary password.
4. The owner submits the salon registration form with an available subdomain such as `glamour`.
5. Approve the pending salon from `/admin/approvals` as the platform admin.
6. Visit `http://glamour.localhost:5173` (or use `lvh.me` if configured), sign in as the owner via `/manage/login`, and configure salon profile, services, staff, working hours, and time off.
7. Sign up as a customer on the tenant host (requires phone OTP verification), select service/staff/date, create a booking, and view/cancel it in customer bookings.
8. As owner, use the calendar to progress the appointment to completed; then as that customer submit one review. Public reviews appear on the salon page.

Keep apex and tenant browser sessions on the same base-domain family. A `localhost` cookie is not interchangeable with `.lvh.me`.

## Email delivery

`EMAIL_PROVIDER=logging` is safe for local development: the outbox processor logs the delivery instead of contacting a provider. Do not use logs containing real customer data as a production delivery mechanism. `EMAIL_PROVIDER=resend` requires `EMAIL_FROM` to be a verified sender and `RESEND_API_KEY` from a secret store. The outbox retry/batch/claim settings in `.env.example` are tunable. Production Terraform passes the optional Resend key through ECS task secrets; no plaintext secret belongs in Vite variables, tfvars, task environment values, logs, or source control.

## Salon media uploads

Media is managed at `/dashboard/media`. The upload flow uses presigned S3 PUT requests:
1. Owner selects an image type (Gallery/Logo/Staff photo) and file.
2. Frontend requests a presigned URL from `POST /api/salon/dashboard/media/uploads`.
3. Frontend uploads directly to S3 using the presigned URL.
4. Frontend confirms the upload via `POST /api/salon/dashboard/media/uploads/{type}/{uploadId}/confirm`.

Locally, `MEDIA_STORAGE_PROVIDER=disabled` means upload initiation returns an error explaining media is not configured. In production, the ECS task receives the S3 bucket, CDN base URL, region, and object prefix. The configurable `MEDIA_OBJECT_PREFIX` (default `salons`) scopes all keys and IAM policies.

## Web Push notifications

Push is provider-neutral and disabled by default (`PUSH_ENABLED=false`, `PUSH_PROVIDER=disabled`). The backend stores subscriptions and maintains a durable outbox with retry logic, but the actual `PushGateway` interface has only a disabled adapter wired. A production implementation must supply a VAPID-based Web Push delivery provider.

Customers and owners can opt in from `PushOptIn` components. The service worker handles `push` events and `notificationclick` navigation.

## Walk-in appointments

Salon owners can create walk-in bookings from the calendar view at `/dashboard/bookings`. Walk-ins accept a guest name and phone (no customer account required), staff member, service, and start time. They appear in the calendar alongside online bookings with a `WALK_IN` source badge.

## Promotions

Owners manage promotional codes at `/dashboard/promotions`. Promotions support percentage or fixed discounts, date ranges, total and per-customer redemption limits, minimum spend thresholds, and service eligibility filtering. Customers validate a promo code during the booking confirmation step; the price snapshot is immutable and cancellation releases the redemption count.

## Analytics

The analytics dashboard at `/dashboard` provides date-range-bounded daily series charts, key metrics (bookings, revenue, no-show rate), and breakdowns by status, service, and staff member. The backend enforces a maximum 366-day range and zero-fills missing dates.

## Tests and builds

Run finite validation commands from separate PowerShell terminals:

```powershell
Set-Location backend
.\mvnw.cmd verify

Set-Location ..\frontend
npm ci
npm run lint
npm run build
npm run e2e          # runs Playwright Chromium tests (mocked API, no backend needed)

Set-Location ..
docker compose config
# Optional, if Docker is available:
docker build -f backend\Dockerfile backend
```

`mvnw.cmd verify` runs 80 unit/integration tests and the PostgreSQL Testcontainers concurrency tests when Docker is available. `BookingConcurrencyIT` fires 20 simultaneous requests for one slot and requires exactly one success plus 19 conflicts; `ReviewConcurrencyIT` similarly proves one review; `PostgreSqlMigrationSmokeIT` validates all 12 Flyway migrations (V1–V12) in an isolated schema. They are conditionally skipped when neither Docker nor `TEST_POSTGRES_URL` is available. For an external disposable PostgreSQL set `TEST_POSTGRES_URL`, `TEST_POSTGRES_USERNAME`, and `TEST_POSTGRES_PASSWORD`—never point concurrency tests at shared/production data.

The Playwright E2E suite contains 7 tests covering customer OTP signup flow, public phone login form, PWA manifest/icons/service-worker, and favicon. Tests mock API responses and require only the Vite dev server.

## Production build and deployment preparation

`backend/Dockerfile` is a multi-stage, pinned Java 17 build with a non-root runtime. The image exposes 8080 and relies on the ALB readiness endpoint `/actuator/health/readiness`. Build artifacts and secrets are excluded by `backend/.dockerignore`. The service supports graceful shutdown and trusted framework forwarding headers.

For the SPA, copy `frontend/.env.production.example` to an untracked production-mode env file and replace only the public apex; keep `VITE_API_BASE_URL=/`. Run `npm ci` and `npm run build`; upload `dist/assets/*` with one-year immutable cache metadata and `index.html` with no-cache metadata. See `deploy/aws/README.md` for exact cache, invalidation, migration, rollout, rollback, backup, monitoring, TLS, and cost guidance.

Environment profiles are `dev`, `staging`, and `prod`. Common values stay in `application.yml`; staging/prod tune connection pools and hide error details. Runtime secrets and actual domains must be injected by the environment. Never bake them into the image or frontend bundle.
## Operations

Flyway migrations are part of backend startup. For production, take/verify a restorable RDS snapshot and run risky/non-backward-compatible migrations as a one-off task before raising service desired count. Prefer expand/migrate/contract changes compatible with the old and new application during rolling deployment. Flyway locking prevents duplicate concurrent migration execution, but a dedicated migration task gives clearer failure control.

ECS uses immutable image tags, 100% minimum healthy capacity, 200% maximum, ALB readiness checks, and deployment-circuit-breaker rollback. Watch target health, deployment events, logs, latency, and 5xx before completing a rollout. Roll application code forward to a new task revision or back to the previous immutable image; prefer corrective migrations over down migrations. Restoring a DB snapshot is disaster recovery and changes the endpoint.

RDS has encryption, retained automated backups, a final snapshot, deletion protection, and Terraform destroy prevention. Redis has encryption/auth and snapshots. Before launch, test restores and alarm on ALB health/5xx/latency, ECS task count/CPU/memory, RDS storage/connections/CPU/backups, Redis memory/evictions/replication, CloudFront errors, and spend. Keep logs structured and redact credentials, tokens, cookies, email bodies, and unnecessary personal data.

The templates deliberately accept an existing VPC/subnets and do not create NAT/network foundations. Review CloudFront-origin restrictions, media CORS and retention, WAF/rate limiting, IAM, secret rotation, KMS, access logs, budgets, RDS Multi-AZ, Redis failover, backup geography, and data retention with the production threat model. ALB, NAT, CloudFront transfer, logs, S3 media versions, RDS, Multi-AZ, snapshots, and Redis are continuing costs. Do not apply the templates until the domain, credentials, ownership, saved plan, and rollback window are approved.

## Troubleshooting

- **Salon not found:** verify the request URL contains `<active-subdomain>.<BASE_DOMAIN>`, backend `PLATFORM_HOSTS` contains only apex/platform names, salon approval is active, and CloudFront/ALB preserves viewer Host.
- **Login works but session disappears:** all hosts must share one base domain; verify cookie domain, HTTPS/Secure agreement, browser cookie rejection details, `withCredentials`, and credentialed CORS values.
- **CORS error:** never use `*` with credentials. Include scheme and port locally; configure apex exact origin and tenant origin pattern separately.
- **Frontend deep link returns XML/404:** S3 must remain private behind CloudFront OAC and the default behavior’s SPA rewrite function must map extensionless routes to `/index.html` without rewriting API responses; invalidate `index.html` after release.
- **API response looks like SPA HTML:** `/api/*` behavior is missing/misordered or points to S3. It must target ALB with caching disabled.
- **Database startup fails:** inspect `docker compose ps`, credentials/port, `DATABASE_URL`, and Flyway logs; do not use `ddl-auto=create` to bypass migration errors.
- **Redis fails only in AWS:** production ElastiCache requires `REDIS_SSL_ENABLED=true` and the matching auth-token task secret; check security groups and private-subnet egress/endpoints.
- **Health check fails:** use `/actuator/health/readiness` on port 8080; verify security-group path ALB→ECS and DB/Redis readiness.
- **Emails stay pending:** inspect outbox retry fields and redacted logs, scheduler flags, verified Resend sender, secret injection, and NAT/egress.
- **Concurrency tests skipped:** start Docker Desktop or provide a disposable `TEST_POSTGRES_*` target, then rerun `mvnw.cmd verify` and look for `BOOKING_CONCURRENCY_POSTGRES_RAN=true`.

## Scope

This remains the five-spec MVP. Payments, custom domains, and multi-branch support are intentionally not included. The governing spec files were not modified.

### Production transport gaps

- **SMS:** `SmsGateway` has a development logging implementation but no external SMS provider. A production deployment must implement the interface (e.g., Twilio, AWS SNS) and activate it by configuration.
- **Web Push:** `PushGateway` has durable storage/outbox infrastructure but only a disabled adapter. Real VAPID delivery requires a vetted push provider implementation.
