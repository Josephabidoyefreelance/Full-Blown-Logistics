$ErrorActionPreference = 'Stop'

# Find the JAAD project root by walking up from this script location.
$dir = (Resolve-Path (Split-Path -Parent $MyInvocation.MyCommand.Path)).Path
$project = $null
while ($dir) {
  if (Test-Path (Join-Path $dir 'package.json')) { $project = $dir; break }
  $parent = Split-Path $dir -Parent
  if ($parent -eq $dir) { break }
  $dir = $parent
}

if (-not $project) {
  Write-Host 'ERROR: Could not find the JAAD project root (package.json).' -ForegroundColor Red
  Write-Host 'Put this file inside the project root and run it again.'
  exit 1
}

Write-Host "JAAD project: $project"

$driversRoots = @(
  (Join-Path $project 'src\app\(app)\drivers'),
  (Join-Path $project 'src\app\drivers')
)

$removed = $false
foreach ($root in $driversRoots) {
  if (Test-Path $root) {
    foreach ($name in @('route.ts','route.tsx','route.js','route.jsx')) {
      $p = Join-Path $root $name
      if (Test-Path $p) {
        Remove-Item $p -Force
        Write-Host "Removed conflicting route: $p" -ForegroundColor Green
        $removed = $true
      }
    }
  }
}

# Also catch a route file nested under a drivers folder anywhere in src/app.
$appRoot = Join-Path $project 'src\app'
if (Test-Path $appRoot) {
  Get-ChildItem -Path $appRoot -Recurse -File -Include 'route.ts','route.tsx','route.js','route.jsx' -ErrorAction SilentlyContinue |
    Where-Object { $_.Directory.Name -eq 'drivers' } |
    ForEach-Object {
      Remove-Item $_.FullName -Force
      Write-Host "Removed conflicting route: $($_.FullName)" -ForegroundColor Green
      $removed = $true
    }
}

# Clear stale Next.js build/cache output.
$next = Join-Path $project '.next'
if (Test-Path $next) {
  Remove-Item $next -Recurse -Force
  Write-Host 'Cleared .next cache.' -ForegroundColor Green
}

if (-not $removed) {
  Write-Host 'No drivers route.ts file was found. The conflict may be in a generated/stale cache.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'DONE. Start the app again with:' -ForegroundColor Cyan
Write-Host 'npm run dev' -ForegroundColor White
