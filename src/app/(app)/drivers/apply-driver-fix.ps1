$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$drivers = Join-Path $root 'src\app\(app)\drivers'

Write-Host 'JAAD Driver Management final fix'
Write-Host 'Removing conflicting Next.js route files...'
foreach ($name in @('route.ts','route.tsx','route.js','route.jsx')) {
  $p = Join-Path $drivers $name
  if (Test-Path $p) { Remove-Item $p -Force; Write-Host "Removed $name" }
}

Write-Host 'Clearing Next.js cache...'
$next = Join-Path $root '.next'
if (Test-Path $next) { Remove-Item $next -Recurse -Force }

Write-Host 'Driver files are already in the correct src/app/(app)/drivers folder.'
Write-Host ''
Write-Host 'Now restart your dev server:'
Write-Host '  npm run dev'
Write-Host ''
Write-Host 'Done.'
