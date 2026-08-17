# API Reference

Base URL pattern:
- Platform endpoints: `https://yoursite.com/api/platform/...`
- Tenant endpoints: `https://{subdomain}.yoursite.com/api/salon/...`

All authenticated endpoints expect the JWT in an httpOnly cookie (`auth_token`), sent automatically by the browser — no `Authorization` header needed if using cookies.

## Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/platform/auth/signup` | none | Register as customer or salon owner |
| POST | `/api/platform/auth/login` | none | Login, sets httpOnly cookie scoped to `.yoursite.com` |
| POST | `/api/platform/auth/logout` | any | Clears cookie |
| GET | `/api/platform/auth/me` | any | Returns current user + role |

## Platform (no tenant context)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/platform/salons?city=&service=&page=` | none | Search/list salons for directory |
| GET | `/api/platform/salons/check-subdomain?name=glamour` | owner | Check subdomain availability |
| POST | `/api/platform/salons` | owner | Create salon (subdomain, name, address) → status PENDING |
| GET | `/api/platform/admin/salons/pending` | admin | List salons awaiting approval |
| POST | `/api/platform/admin/salons/{id}/approve` | admin | Activate a salon |

## Tenant — Public (subdomain, no auth needed)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/salon/profile` | none | Salon details, resolved from subdomain automatically |
| GET | `/api/salon/services` | none | List active services |
| GET | `/api/salon/staff` | none | List active staff, with photos + which services they perform |
| GET | `/api/salon/availability?staffId=&serviceId=&date=YYYY-MM-DD` | none | Returns list of available time slots for that staff+service+date |
| GET | `/api/salon/reviews` | none | Public reviews |

## Tenant — Booking (customer auth required)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/salon/bookings` | customer | Body: `{staffId, serviceId, startDatetime}`. Returns 409 if slot taken (race lost) |
| GET | `/api/salon/bookings/me` | customer | Customer's own bookings (upcoming + past) |
| PATCH | `/api/salon/bookings/{id}/cancel` | customer | Cancel, only if within cancellation window |
| POST | `/api/salon/reviews` | customer | Only allowed if booking status = COMPLETED |

### POST /api/salon/bookings — request/response detail

Request:
```json
{
  "staffId": 12,
  "serviceId": 4,
  "startDatetime": "2026-08-20T14:30:00"
}
```

Success response (201):
```json
{
  "id": 501,
  "status": "CONFIRMED",
  "staffName": "Priya",
  "serviceName": "Haircut",
  "startDatetime": "2026-08-20T14:30:00",
  "endDatetime": "2026-08-20T15:00:00"
}
```

Conflict response (409) — this is the expected, normal outcome when two people race for the same slot, not an error state to hide from the user:
```json
{
  "error": "SLOT_UNAVAILABLE",
  "message": "This slot was just booked. Please choose another time."
}
```

## Tenant — Owner Dashboard (salon owner auth required, scoped to their own salon only)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/salon/dashboard/bookings?date=&staffId=` | owner | Calendar view of bookings |
| PATCH | `/api/salon/dashboard/bookings/{id}/status` | owner | Mark COMPLETED / NO_SHOW |
| PATCH | `/api/salon/dashboard/bookings/{id}/cancel` | owner | Owner-initiated cancellation |
| POST | `/api/salon/dashboard/services` | owner | Create service |
| PUT | `/api/salon/dashboard/services/{id}` | owner | Edit service |
| DELETE | `/api/salon/dashboard/services/{id}` | owner | Deactivate service |
| POST | `/api/salon/dashboard/staff` | owner | Add staff member |
| PUT | `/api/salon/dashboard/staff/{id}/working-hours` | owner | Set weekly working hours |
| POST | `/api/salon/dashboard/staff/{id}/time-off` | owner | Block time (leave, break) |
| GET | `/api/salon/dashboard/analytics` | owner | Bookings count, revenue, no-show rate |

## Authorization Rules (enforce in every controller, not just middleware)
- Owner endpoints must verify the logged-in owner actually owns the salon matching the current subdomain — an owner of salon A must get 403 if their JWT is somehow used against salon B's dashboard endpoints. Don't rely on subdomain resolution alone for this; check `salon.ownerId == currentUser.id` explicitly in each dashboard controller method.
- Customer endpoints (`cancel`, `review`) must verify `booking.customerId == currentUser.id`.
