# Run from JAAD project root: powershell -ExecutionPolicy Bypass -File .\Install-JAAD-Admin-Fix.ps1
$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
if (!(Test-Path -LiteralPath (Join-Path $root 'package.json')) -or !(Test-Path -LiteralPath (Join-Path $root 'src\app\(app)'))) {
    throw 'Run this script from the jaad-backend project root.'
}
$sourceRoot = Join-Path $PSScriptRoot 'src'
if (!(Test-Path -LiteralPath $sourceRoot)) { throw 'The patch src folder must remain beside this installer.' }
$backup = Join-Path $root ('JAAD-ADMIN-BACKUP-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$items = Get-ChildItem -LiteralPath $sourceRoot -Recurse -File
foreach ($item in $items) {
    $relative = $item.FullName.Substring($PSScriptRoot.Length).TrimStart('\','/')
    $destination = Join-Path $root $relative
    if (Test-Path -LiteralPath $destination) {
        $saved = Join-Path $backup $relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $saved) -Force | Out-Null
        Copy-Item -LiteralPath $destination -Destination $saved -Force
    }
    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    Copy-Item -LiteralPath $item.FullName -Destination $destination -Force
}
Write-Host ('Installed ' + $items.Count + ' files. Backup: ' + $backup) -ForegroundColor Green
Write-Host 'Checking source signatures...' -ForegroundColor Cyan
$checks = @(
  @{ Path='src\app\(app)\api\clock-tracker\report\route.ts'; Text='function makePdf(pages: string[][][])' },
  @{ Path='src\app\(app)\finance\purchase-order-modal.tsx'; Text='requestedBy?: string | null' },
  @{ Path='src\app\(app)\fleet\actions.ts'; Text='export async function updateInsuranceExpiry' },
  @{ Path='src\app\(app)\fleet\actions.ts'; Text='export async function updateInsurer' },
  @{ Path='src\app\(app)\hr\careers\[id]\actions.ts'; Text='export const submitApplication' },
  @{ Path='src\app\(app)\hr\actions.ts'; Text='export { submitPublicVote }' }
)
foreach ($check in $checks) {
    $target = Join-Path $root $check.Path
    if (!(Select-String -LiteralPath $target -SimpleMatch -Quiet -Pattern $check.Text)) {
        throw ('Verification failed: ' + $check.Path + ' lacks ' + $check.Text)
    }
}
Write-Host 'Patch file verification passed.' -ForegroundColor Green
Write-Host 'Running TypeScript validation...' -ForegroundColor Cyan
& npx tsc --noEmit --pretty false
if ($LASTEXITCODE -ne 0) { throw 'TypeScript still reports errors. Keep the output and backup; do not deploy.' }
Write-Host 'TypeScript check PASSED.' -ForegroundColor Green
