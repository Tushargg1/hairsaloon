# Local E2E

Playwright starts the Vite server automatically at `http://lvh.me:5173`. Public login and PWA tests run without the backend. The customer account test checks `http://lvh.me:8080/actuator/health` and skips when the backend is unavailable.

On Windows PowerShell, after installing dependencies and Chromium:

```powershell
Set-Location frontend
npm ci
npm run e2e:install
npm run e2e:local
```

To exercise customer signup, profile, and favorites, start PostgreSQL/Redis and the backend using the repository README first. The backend must use `BASE_DOMAIN=lvh.me`, `PLATFORM_HOSTS=lvh.me,www.lvh.me`, `AUTH_COOKIE_DOMAIN=.lvh.me`, `AUTH_COOKIE_SECURE=false`, and allow `http://lvh.me:5173` through CORS. Override endpoints with `PLAYWRIGHT_BASE_URL` and `E2E_API_BASE_URL` when needed.
