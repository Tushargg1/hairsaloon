# Multi-Tenant Salon Booking Platform — Requirements

## 1. Product Summary
A SaaS platform where salon owners sign up, get a subdomain (`salonname.yoursite.com`), and manage bookings. Customers discover salons on the main site or go directly to a salon's subdomain to book a slot with a specific staff member for a specific service.

## 2. User Roles
- **Platform Admin** — you. Approves salons, views platform-wide data, handles disputes.
- **Salon Owner** — signs up, configures salon profile, staff, services, working hours.
- **Staff Member** — has their own calendar/availability within a salon (optional login, can be owner-managed instead).
- **Customer** — browses salons, books/cancels/reschedules appointments.

## 3. Functional Requirements

### 3.1 Platform / Main Site (yoursite.com)
- Homepage listing/searching salons by city/area, service type, rating.
- Salon signup flow (business name → subdomain availability check → basic details → live).
- Subdomain name validation: lowercase, alphanumeric + hyphen only, 3–30 chars, reserved words blocked (`www`, `api`, `admin`, `app`, `mail`).
- Each salon card links to `https://{subdomain}.yoursite.com`.

### 3.2 Salon Subdomain Site
- Public salon page: name, logo, address, photos, services list with price/duration, staff list, reviews.
- Booking flow: select service → select staff (or "any available") → select date → see available time slots → confirm → (optional) pay deposit → confirmation.
- Customer account: view upcoming/past bookings, cancel/reschedule (within policy window), leave review after completed appointment.

### 3.3 Salon Owner Dashboard (also on subdomain, e.g. `{subdomain}.yoursite.com/dashboard`)
- Manage services (name, duration, price, category).
- Manage staff (add/remove, assign services they can perform, set working hours per staff).
- View bookings calendar (day/week view), filter by staff.
- Manually block time (staff on leave, lunch break).
- Cancel a booking (triggers customer notification).
- Basic analytics: bookings this week, revenue, no-show rate.

### 3.4 Booking Engine (the core hard problem)
- Slot availability = staff working hours − existing bookings − blocked time − service duration buffer.
- No double-booking under concurrent requests (DB-level constraint, not just app-level check).
- Support variable service durations (15 min to 3 hours).
- Cancellation policy: configurable per salon (e.g. free cancel up to 2 hrs before).
- No-show tracking (owner marks manually for MVP).

### 3.5 Notifications
- Booking confirmation (email minimum; SMS/WhatsApp is v2).
- Reminder 24hr / 1hr before appointment.
- Cancellation/reschedule notice to both parties.

### 3.6 Auth
- Single sign-on across main site + all subdomains (shared cookie domain `.yoursite.com`).
- Separate roles: customer, salon owner. JWT-based, stored in httpOnly cookie (not localStorage — required for cross-subdomain SSO).

## 4. Non-Functional Requirements
- Tenant data isolation: a query bug must never leak salon A's bookings to salon B. Every query scoped by `salon_id`.
- Booking creation must be idempotent / race-safe.
- Page load on salon subdomain < 2s (this is customer-facing, first impression matters).

## 5. Explicit Out-of-Scope for MVP (decide later, don't build now)
- Custom domains per salon (`salonname.com` instead of subdomain).
- In-app payments beyond a simple deposit link (start with "pay at salon").
- Multi-location salons (one salon, multiple branches).
- Staff mobile app.
- WhatsApp/SMS notifications (email only for MVP).

## 6. Open Business Decisions (answer before building, not after)
- Is this a real paid SaaS or a portfolio/MVP project? Changes how much polish vs. speed matters.
- Who onboards salons — self-serve signup or you manually add them first?
- Do customers pay online or at the salon? Affects whether Razorpay/Stripe integration is in MVP scope.
