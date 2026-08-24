$ErrorActionPreference = 'Stop'

$sub     = 'demo'
$base    = "http://$sub.localhost:8080"
$resolve = "$sub.localhost:8080:127.0.0.1"
$jar     = Join-Path $env:TEMP 'groomit-owner-cookies.txt'
$bodyFile = Join-Path $env:TEMP 'groomit-body.json'
if (Test-Path $jar) { Remove-Item $jar }

function Req($method, $path, $body) {
  $cargs = @('-s', '-S', '--fail-with-body', '--resolve', $resolve,
             '-c', $jar, '-b', $jar, '-X', $method,
             '-H', 'Content-Type: application/json')
  if ($null -ne $body) {
    ($body | ConvertTo-Json -Depth 6 -Compress) |
      Set-Content -Path $bodyFile -Encoding utf8 -NoNewline
    $cargs += @('--data-binary', "@$bodyFile")
  }
  $cargs += "$base$path"
  $out = & curl.exe @cargs
  if ($LASTEXITCODE -ne 0) { throw "$method $path failed: $out" }
  if ([string]::IsNullOrWhiteSpace($out)) { return $null }
  return $out | ConvertFrom-Json
}

Req 'POST' '/api/platform/privileged-auth/login' @{
  email = 'demo.owner@groomit.local'; password = 'DemoOwnerPass123!'
} | Out-Null
Write-Host 'owner logged in on tenant host'

$serviceDefs = @(
  @{ name = 'Signature Haircut';   durationMinutes = 45; price = 750;  category = 'Hair' },
  @{ name = 'Beard Sculpt & Trim'; durationMinutes = 30; price = 450;  category = 'Beard' },
  @{ name = 'Hot Towel Shave';     durationMinutes = 30; price = 600;  category = 'Shave' },
  @{ name = 'Hair Colour';         durationMinutes = 90; price = 2200; category = 'Colour' },
  @{ name = 'Head Massage';        durationMinutes = 30; price = 500;  category = 'Wellness' }
)
$serviceIds = @()
foreach ($s in $serviceDefs) {
  $created = Req 'POST' '/api/salon/dashboard/services' $s
  $serviceIds += $created.id
  Write-Host "service: $($s.name) (id=$($created.id))"
}

$hours = @(2, 3, 4, 5, 6, 0) | ForEach-Object {
  @{ dayOfWeek = $_; startTime = '10:00:00'; endTime = '20:00:00' }
}

foreach ($name in @('Arjun Mehta', 'Rakesh Iyer', 'Sana Kapoor')) {
  $st = Req 'POST' '/api/salon/dashboard/staff' @{ name = $name; photoUrl = $null }
  Req 'PUT' "/api/salon/dashboard/staff/$($st.id)/services" @{ serviceIds = $serviceIds } | Out-Null
  Req 'PUT' "/api/salon/dashboard/staff/$($st.id)/working-hours" @{ workingHours = $hours } | Out-Null
  Write-Host "staff: $name (id=$($st.id)) - all services, Tue-Sun 10:00-20:00"
}

Remove-Item $bodyFile -ErrorAction SilentlyContinue
Write-Host ''
Write-Host 'seed complete'
