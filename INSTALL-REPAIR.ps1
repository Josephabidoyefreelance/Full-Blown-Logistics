# JAAD Stage 2 owner settings repair overlay (staging first).
# Default is preview; -Apply creates an application-file backup + manifest.
param(
  [string]$Project = (Get-Location).Path,
  [switch]$Apply
)
$ErrorActionPreference = 'Stop'
$base = $PSScriptRoot
$overlay = Join-Path $base 'src'
$packagePath = Join-Path $Project 'package.json'
if (!(Test-Path -LiteralPath $packagePath)) { throw "Missing package.json at $Project" }
$package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
if ($package.name -ne 'jaad-backend') { throw "Expected jaad-backend; found $($package.name)" }
if (!(Test-Path (Join-Path $Project 'src\lib\customer-billing-workspace.ts'))) {
  throw 'Expected JAAD source layout is missing.'
}
$files = @(Get-ChildItem -LiteralPath $overlay -Recurse -File)
if ($files.Count -ne 9) { throw 'Expected exactly nine repair application files; refusing to install.' }
$manifest = @($files | ForEach-Object {
  $rel = $_.FullName.Substring($overlay.Length + 1)
  $target = Join-Path $Project (Join-Path 'src' $rel)
  [pscustomobject]@{ relative = (Join-Path 'src' $rel); existed = (Test-Path -LiteralPath $target) }
})
Write-Host "JAAD Stage 2 settings repair candidate — $($files.Count) application files" -ForegroundColor Cyan
Write-Host "Project: $Project"
$manifest | ForEach-Object { Write-Host "  $($_.relative) $($(if ($_.existed) {'[backup existing]'} else {'[new]'}))" }
if (!$Apply) {
  Write-Host 'PREVIEW ONLY. No files changed. Apply ONLY in staging after the additive SQL migration and backups.' -ForegroundColor Yellow
  return
}
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $Project ".jaad-stage2-backup\$stamp"
New-Item -ItemType Directory -Path $backup -Force | Out-Null
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $backup 'manifest.json') -Encoding UTF8
foreach ($entry in $manifest) {
  if (!$entry.existed) { continue }
  $from = Join-Path $Project $entry.relative
  $to = Join-Path $backup $entry.relative
  New-Item -ItemType Directory -Path (Split-Path $to -Parent) -Force | Out-Null
  Copy-Item -LiteralPath $from -Destination $to -Force
}
Write-Host "Original files backed up to $backup" -ForegroundColor Green
foreach ($file in $files) {
  $rel = $file.FullName.Substring($overlay.Length + 1)
  $to = Join-Path $Project (Join-Path 'src' $rel)
  New-Item -ItemType Directory -Path (Split-Path $to -Parent) -Force | Out-Null
  Copy-Item -LiteralPath $file.FullName -Destination $to -Force
}
Write-Host 'Overlay applied. Run npm run build and complete TESTING.md in staging.' -ForegroundColor Yellow
Write-Host "For application rollback: RESTORE-REPAIR.ps1 -Project `"$Project`" -BackupPath `"$backup`"" -ForegroundColor Yellow
