# Run from the JAAD project directory after npm install.
# Prompts do not echo passwords or write them to a file.
$ErrorActionPreference='Stop'
if (!(Test-Path '.\node_modules\@supabase\supabase-js')) {
 throw 'Run this from the JAAD project root, after npm install.'
}
if (-not $env:NEXT_PUBLIC_SUPABASE_URL -or -not $env:NEXT_PUBLIC_SUPABASE_ANON_KEY) {
 throw 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in this PowerShell session first. Never use SERVICE_ROLE.'
}
$env:JAAD_TEST_A_EMAIL=Read-Host 'Test customer A email'
$passA=Read-Host 'Test customer A password' -AsSecureString
$env:JAAD_TEST_B_EMAIL=Read-Host 'Test customer B email'
$passB=Read-Host 'Test customer B password' -AsSecureString
$env:JAAD_TEST_A_PASSWORD=[System.Net.NetworkCredential]::new('', $passA).Password
$env:JAAD_TEST_B_PASSWORD=[System.Net.NetworkCredential]::new('', $passB).Password
try {
  $script=(Resolve-Path "$PSScriptRoot\cross-tenant-readonly.mjs").Path
  node $script
} finally {
  Remove-Item Env:\JAAD_TEST_A_EMAIL,Env:\JAAD_TEST_B_EMAIL,Env:\JAAD_TEST_A_PASSWORD,Env:\JAAD_TEST_B_PASSWORD -ErrorAction SilentlyContinue
}
