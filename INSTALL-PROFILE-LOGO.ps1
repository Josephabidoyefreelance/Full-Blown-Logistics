# JAAD stage 2 profile/logo repair. Preview by default.
param([string]$Project = (Get-Location).Path, [switch]$Apply)
$ErrorActionPreference = 'Stop'
$src = Join-Path $PSScriptRoot 'src'
$packageJson = Join-Path $Project 'package.json'
if (!(Test-Path -LiteralPath $packageJson)) { throw "Project package.json not found: $Project" }
$projectInfo = Get-Content -LiteralPath $packageJson -Raw | ConvertFrom-Json
if ($projectInfo.name -ne 'jaad-backend') { throw 'Not the expected JAAD project' }
if (!(Test-Path (Join-Path $Project 'src\lib\customer-billing-workspace.ts'))) {
 throw 'Requires the Stage 2 integrated application version (customer-billing-workspace.ts missing)'
}
$files = @(Get-ChildItem -LiteralPath $src -Recurse -File)
if ($files.Count -ne 2) { throw 'Expected exactly two application source files' }
$entries = @($files | ForEach-Object {
 $relative = $_.FullName.Substring($src.Length + 1)
 [pscustomobject]@{relative=(Join-Path 'src' $relative); existed=(Test-Path -LiteralPath (Join-Path $Project (Join-Path 'src' $relative)))}
})
Write-Host 'JAAD profile/logo repair: application files to update:' -ForegroundColor Cyan
$entries | ForEach-Object { Write-Host "  $($_.relative)" }
if (!$Apply) { Write-Host 'PREVIEW. No changes. Run with -Apply only after backing up and executing SQL in staging.'; return }
$backup = Join-Path $Project ('.jaad-stage2-backup\profile-logo-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
$entries | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $backup 'manifest.json') -Encoding UTF8
foreach ($e in $entries) {
 $target = Join-Path $Project $e.relative
 if ($e.existed) {
  $old = Join-Path $backup $e.relative
  New-Item -ItemType Directory -Path (Split-Path -Parent $old) -Force | Out-Null
  Copy-Item -LiteralPath $target -Destination $old -Force
 }
}
foreach ($file in $files) {
 $relative = $file.FullName.Substring($src.Length + 1)
 $target = Join-Path $Project (Join-Path 'src' $relative)
 New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
 Copy-Item -LiteralPath $file.FullName -Destination $target -Force
}
Write-Host "Updated two source files. Backup: $backup" -ForegroundColor Green
Write-Host 'Run npm run build and authenticated tests in staging.'
