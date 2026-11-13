# JAAD ERP two-customer read-only test. No schema changes, writes, or service keys.
param([Parameter(Mandatory=$true)][string]$ProjectPath)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $ProjectPath
if(-not (Test-Path '.env.local')){throw '.env.local missing in project directory'}
Get-Content '.env.local' | ForEach-Object {
  if($_ -match '^\s*(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY)\s*=\s*(.*?)\s*$'){
    [Environment]::SetEnvironmentVariable($matches[1],$matches[2].Trim().Trim('"').Trim("'"),'Process')
  }
}
if(-not $env:NEXT_PUBLIC_SUPABASE_URL -or -not $env:NEXT_PUBLIC_SUPABASE_ANON_KEY -or $env:NEXT_PUBLIC_SUPABASE_URL -eq 'YOUR_SUPABASE_URL') {throw 'Missing real public Supabase environment variables.'}
$env:JAAD_TEST_A_EMAIL=Read-Host 'Test Customer A email'
$env:JAAD_TEST_A_PASSWORD=[System.Net.NetworkCredential]::new('',(Read-Host 'Customer A password' -AsSecureString)).Password
$env:JAAD_TEST_B_EMAIL=Read-Host 'Test Customer B email'
$env:JAAD_TEST_B_PASSWORD=[System.Net.NetworkCredential]::new('',(Read-Host 'Customer B password' -AsSecureString)).Password
try {
  node (Join-Path $PSScriptRoot 'TEST-READ-ONLY.mjs')
  if($LASTEXITCODE -ne 0){Write-Warning "Test blocked or failed (exit $LASTEXITCODE)."}
} finally {
  @('JAAD_TEST_A_EMAIL','JAAD_TEST_A_PASSWORD','JAAD_TEST_B_EMAIL','JAAD_TEST_B_PASSWORD') | ForEach-Object {Remove-Item "Env:$_" -ErrorAction SilentlyContinue}
}
