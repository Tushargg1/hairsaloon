$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$platform = 'http://localhost:8080'
$sub      = 'demo'
$tenant   = "http://$sub.localhost:8080"

function Post($session, $url, $body, $hostHeader) {
  $json = $body | ConvertTo-Json -Depth 6 -Compress
  Invoke-RestMethod -Method Post -Uri $url -Body $json -ContentType 'application/json' `
    -WebSession $session -TimeoutSec 60
}

# 1. platform admin session
$admin = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Post $admin "$platform/api/platform/privileged-auth/login" @{
  email = 'admin@hairsaloon.local'; password = 'AdminPass123!'
} | Out-Null
Write-Host 'admin logged in'

# 2. provision a salon owner
$ownerEmail = 'demo.owner@groomit.local'
$ownerPass  = 'DemoOwnerPass123!'
try {
  Post $admin "$platform/api/platform/admin/owners" @{
    name = 'Demo Owner'; phone = '9700000001'
    email = $ownerEmail; temporaryPassword = $ownerPass
  } | Out-Null
  Write-Host 'owner created'
} catch { Write-Host "owner exists or failed: $($_.Exception.Message)" }

# 3. owner session + salon registration
$owner = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Post $owner "$platform/api/platform/privileged-auth/login" @{
  email = $ownerEmail; password = $ownerPass
} | Out-Null
Write-Host 'owner logged in'

$salon = Post $owner "$platform/api/platform/salons" @{
  subdomain = $sub
  name = 'The Gentlemen''s Chair'
  description = 'A heritage barbershop in the heart of the city. Precision cuts, hot-towel shaves, and beard sculpting by master barbers.'
  address = '14 Brigade Road, Ashok Nagar'
  city = 'Bengaluru'
  phone = '08040001234'
  email = 'hello@gentlemenschair.in'
  logoUrl = $null
  timezone = 'Asia/Kolkata'
  latitude = 12.9716
  longitude = 77.5946
}
Write-Host "salon created id=$($salon.id) subdomain=$($salon.subdomain) status=$($salon.status)"

# 4. approve so it is publicly visible
Post $admin "$platform/api/platform/admin/salons/$($salon.id)/approve" @{} | Out-Null
Write-Host 'salon approved'

# 5. services
$serviceDefs = @(
  @{ name = 'Signature Haircut';      durationMinutes = 45; price = 750;  category = 'Hair' },
  @{ name = 'Beard Sculpt & Trim';    durationMinutes = 30; price = 450;  category = 'Beard' },
  @{ name = 'Hot Towel Shave';        durationMinutes = 30; price = 600;  category = 'Shave' },
  @{ name = 'Hair Colour';            durationMinutes = 90; price = 2200; category = 'Colour' },
  @{ name = 'Head Massage';           durationMinutes = 30; price = 500;  category = 'Wellness' }
)
$services = @()
foreach ($s in $serviceDefs) {
  $services += Post $owner "$tenant/api/salon/dashboard/services" $s
}
Write-Host "services created: $($services.Count)"

# 6. staff, each able to do every service, Tue-Sun 10:00-20:00
$hours = @(2,3,4,5,6,0) | ForEach-Object {
  @{ dayOfWeek = $_; startTime = '10:00:00'; endTime = '20:00:00' }
}
$serviceIds = $services | ForEach-Object { $_.id }
foreach ($name in @('Arjun Mehta','Rakesh Iyer','Sana Kapoor')) {
  $st = Post $owner "$tenant/api/salon/dashboard/staff" @{ name = $name; photoUrl = $null }
  Invoke-RestMethod -Method Put -Uri "$tenant/api/salon/dashboard/staff/$($st.id)/services" `
    -Body (@{ serviceIds = $serviceIds } | ConvertTo-Json -Compress) `
    -ContentType 'application/json' -WebSession $owner -TimeoutSec 60 | Out-Null
  Invoke-RestMethod -Method Put -Uri "$tenant/api/salon/dashboard/staff/$($st.id)/working-hours" `
    -Body (@{ workingHours = $hours } | ConvertTo-Json -Depth 5 -Compress) `
    -ContentType 'application/json' -WebSession $owner -TimeoutSec 60 | Out-Null
  Write-Host "staff ready: $name (id=$($st.id))"
}

Write-Host ''
Write-Host "salon site : http://$sub.localhost:5173"
Write-Host "owner login: $ownerEmail / $ownerPass"
