$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$layout = Join-Path $root 'src\app\customer\layout.tsx'
$dashboard = Join-Path $root 'src\app\customer\dashboard'
if (!(Test-Path $layout)) { throw "Run this from jaad-backend project root. Missing: $layout" }
$required = @('customer-digital-clock.tsx','customer-sign-out-button.tsx')
foreach ($file in $required) {
  if (!(Test-Path (Join-Path $dashboard $file))) { throw "Missing component: $(Join-Path $dashboard $file). Do not continue until the component is restored." }
}
$source = [System.IO.File]::ReadAllText($layout)
$changes = @(
  @{ from = "from './customer-sign-out-button'"; to = "from './dashboard/customer-sign-out-button'" },
  @{ from = "from './customer-digital-clock'"; to = "from './dashboard/customer-digital-clock'" }
)
foreach ($change in $changes) {
  if ($source.Contains($change.from)) { $source = $source.Replace($change.from, $change.to) }
  elseif (!$source.Contains($change.to)) { throw "Expected import not found: $($change.from). No file changed." }
}
$backup = "$layout.before-import-fix.bak"
Copy-Item $layout $backup -Force
[System.IO.File]::WriteAllText($layout, $source, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Fixed both imports in $layout" -ForegroundColor Green
Write-Host "Backup saved at $backup"
Write-Host "Now run: npm run build"
