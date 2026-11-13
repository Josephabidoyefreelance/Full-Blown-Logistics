# Application-file rollback for a Stage 2 installer backup.
# DOES NOT revert the Supabase database; restore that from your database backup.
param(
  [Parameter(Mandatory=$true)][string]$Project,
  [Parameter(Mandatory=$true)][string]$BackupPath
)
$ErrorActionPreference='Stop'
$manifestPath=Join-Path $BackupPath 'manifest.json'
if (!(Test-Path -LiteralPath $manifestPath)) { throw 'Missing Stage 2 backup manifest.' }
if (!(Test-Path -LiteralPath (Join-Path $Project 'package.json'))) { throw 'Invalid project directory.' }
$manifest=@(Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json)
foreach ($entry in $manifest) {
 $target=Join-Path $Project $entry.relative
 if ($entry.existed) {
  $source=Join-Path $BackupPath $entry.relative
  if (!(Test-Path -LiteralPath $source)) { throw "Missing saved original: $source" }
  New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
  Copy-Item -LiteralPath $source -Destination $target -Force
 } else {
  if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Force }
 }
}
Write-Host 'Application files restored. Database rollback must be performed separately from the known-good Supabase backup.' -ForegroundColor Yellow
