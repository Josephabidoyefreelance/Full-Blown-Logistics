$ErrorActionPreference = 'Stop'
$source = 'C:\Users\DELL\Desktop\VS Code 2\Full Blown Logistics\jaad-backend'
$patch = Join-Path $PSScriptRoot 'JAAD-STAGE5-02B-REVIEW-PATCH.zip'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$target = Join-Path $env:LOCALAPPDATA "Temp\JAAD-STAGE5-02B-VERIFY-$stamp"
$patchTemp = Join-Path $env:TEMP "JAAD-STAGE5-02B-PATCH-$stamp"
if (-not (Test-Path (Join-Path $source 'package.json'))) { throw "Project not found: $source" }
if (-not (Test-Path $patch)) { throw "Patch ZIP missing next to installer: $patch" }
New-Item -ItemType Directory -Path $target, $patchTemp -Force | Out-Null
Write-Host 'Copying project to isolated test directory...' -ForegroundColor Cyan
robocopy $source $target /E /XD node_modules .next .git .turbo .local-backups /XF .env .env.* *.zip | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Project copy failed (robocopy $LASTEXITCODE)" }
Expand-Archive -LiteralPath $patch -DestinationPath $patchTemp -Force
$files = Get-ChildItem (Join-Path $patchTemp 'src') -Recurse -File | Where-Object { $_.Extension -in '.ts','.tsx' }
foreach ($f in $files) {
  $relative = $f.FullName.Substring($patchTemp.Length + 1)
  $destination = Join-Path $target $relative
  New-Item -ItemType Directory -Path (Split-Path $destination) -Force | Out-Null
  Copy-Item -LiteralPath $f.FullName -Destination $destination -Force
}
Write-Host "Applied $($files.Count) TypeScript files to test copy." -ForegroundColor Cyan
$nodeModules = Join-Path $source 'node_modules'
if (-not (Test-Path $nodeModules)) { throw 'node_modules not found in original project. Run npm install in test copy before testing.' }
# Use a directory junction for fast, non-mutating access to installed dependencies.
cmd /c mklink /J "$(Join-Path $target 'node_modules')" "$nodeModules" | Out-Null
Push-Location $target
try {
  Write-Host 'Checking TypeScript...' -ForegroundColor Cyan
  & (Join-Path $nodeModules '.bin\tsc.cmd') --noEmit
  if ($LASTEXITCODE -ne 0) { throw 'TypeScript failed. Do not install patch into original project.' }
  Write-Host 'TypeScript passed. Checking Next.js webpack build...' -ForegroundColor Cyan
  & (Join-Path $nodeModules '.bin\next.cmd') build --webpack
  if ($LASTEXITCODE -ne 0) { throw 'Next.js build failed. Do not install patch into original project.' }
  Write-Host 'TEST BUILD PASSED. Runtime tenant isolation and upload security are NOT verified.' -ForegroundColor Green
} finally { Pop-Location; Write-Host "Test copy: $target"; Write-Host "Patch extraction: $patchTemp" }
