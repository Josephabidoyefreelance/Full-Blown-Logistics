param([Parameter(Mandatory=$true)][string]$ProjectPath,
      [Parameter(Mandatory=$true)][string]$BackupPath)
$ErrorActionPreference='Stop'
$project = (Resolve-Path -LiteralPath $ProjectPath).Path
$backup = (Resolve-Path -LiteralPath $BackupPath).Path
$manifest = Join-Path $backup 'RESTORE-MANIFEST.json'
if (-not (Test-Path -LiteralPath $manifest)) { throw 'Valid restore manifest required' }
$rows = @(Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json)
foreach ($row in $rows) {
  $rel = [string]$row.rel
  if ($rel.Contains('..') -or $rel.StartsWith('/') -or $rel.Contains(':')) { throw 'Unsafe manifest path' }
  $dst = Join-Path $project ($rel.Replace('/', '\'))
  if ($row.existed) {
    $src = Join-Path $backup ($rel.Replace('/', '\'))
    if (-not (Test-Path -LiteralPath $src)) { throw "Backup file missing: $rel" }
    New-Item -ItemType Directory -Path (Split-Path -Parent $dst) -Force | Out-Null
    Copy-Item -LiteralPath $src -Destination $dst -Force
  } elseif (Test-Path -LiteralPath $dst) { Remove-Item -LiteralPath $dst -Force }
}
Write-Host "Restored $($rows.Count) paths. Restart Next.js after reviewing changes."
