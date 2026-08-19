$ErrorActionPreference = 'Stop'

$frontendRoot = Split-Path -Parent $PSScriptRoot
$healthUrl = if ($env:E2E_API_BASE_URL) {
  "$($env:E2E_API_BASE_URL.TrimEnd('/'))/actuator/health"
} else {
  'http://lvh.me:8080/actuator/health'
}

try {
  $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3
  if ($health.status -eq 'UP') {
    Write-Host "Backend is healthy; customer account E2E will run."
  }
} catch {
  Write-Warning "Backend is unavailable at $healthUrl; backend-dependent E2E will be skipped."
}

Push-Location $frontendRoot
try {
  & npm run e2e
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
