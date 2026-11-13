param(
  [Parameter(Mandatory=$true)][string]$ProjectPath,
  [switch]$Apply
)
$ErrorActionPreference = 'Stop'
$project = (Resolve-Path -LiteralPath $ProjectPath).Path
if (-not (Test-Path -LiteralPath (Join-Path $project 'package.json'))) { throw 'Not a Next.js project (package.json missing).' }
if (-not (Test-Path -LiteralPath (Join-Path $project 'src\app\customer\dashboard\layout.tsx'))) { throw 'This is not the expected JAAD project.' }
$expected = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'SOURCE-HASHES.json') -Raw | ConvertFrom-Json
function Get-Sha256Text([string]$path) {
  $s = [System.IO.File]::ReadAllText($path)
  $s = $s.TrimStart([char]0xFEFF).Replace("`r`n", "`n").Replace("`r", "`n")
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($s)))).Replace('-', '').ToLowerInvariant() }
  finally { $sha.Dispose() }
}
$items = @()
foreach ($prop in $expected.PSObject.Properties) {
  $relative = $prop.Name
  $source = Join-Path $PSScriptRoot ($relative.Replace('/', '\'))
  $target = Join-Path $project ($relative.Replace('/', '\'))
  if (-not (Test-Path -LiteralPath $source)) { throw "Package file missing: $relative" }
  if (-not (Test-Path -LiteralPath $target)) { throw "Current project file missing: $relative" }
  $current = Get-Sha256Text $target
  $new = Get-Sha256Text $source
  if ($current -ne $prop.Value -and $current -ne $new) {
    throw "PRECHECK STOP: $relative has unreviewed modifications. No files changed. Do not force install."
  }
  $items += [pscustomobject]@{ relative=$relative; source=$source; target=$target; update=($current -ne $new) }
}
Write-Host "JAAD settings/logo correction: $($items.Count) files checked, $(@($items | Where-Object { $_.update }).Count) require updates."
if (-not $Apply) { Write-Host 'PREVIEW ONLY. For staging testing, rerun with -Apply.' -ForegroundColor Yellow; exit 0 }
$changes = @($items | Where-Object { $_.update })
if ($changes.Count -eq 0) { Write-Host 'Already installed. No changes required.' -ForegroundColor Green; exit 0 }
$backup = Join-Path $project ('JAAD-BACKUP-LOGO-SETTINGS-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $backup | Out-Null
foreach ($item in $changes) {
  $dest = Join-Path $backup ($item.relative.Replace('/', '\'))
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
  Copy-Item -LiteralPath $item.target -Destination $dest
}
try {
  foreach ($item in $changes) { Copy-Item -LiteralPath $item.source -Destination $item.target -Force }
} catch {
  foreach ($item in $changes) {
    $saved = Join-Path $backup ($item.relative.Replace('/', '\'))
    if (Test-Path -LiteralPath $saved) { Copy-Item -LiteralPath $saved -Destination $item.target -Force }
  }
  throw
}
Write-Host "Installed. Backup: $backup" -ForegroundColor Green
Write-Host 'Next: npm run build, then authenticated settings/logo tests on staging.'
Write-Host 'This patch does NOT unlock operational modules. Do NOT turn on CUSTOMER_ERP_TENANT_MODE against production until cross-tenant security tests pass.' -ForegroundColor Yellow
