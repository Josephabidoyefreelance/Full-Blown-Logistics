# JAAD Logistics tenant-isolation test (STAGING ONLY)
# Uses two real staging user JWTs; never uses a service-role key.
# Tests customer_erp_leads INSERT, SELECT, UPDATE, DELETE and tenant reassignment.
# Deletes test-created rows at the end, including in the error handler where possible.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$script:base = 'https://aoootywbdbuhnzfvlmrr.supabase.co'
$script:productionRef = 'nflbwmmlzzznieovqkha'
if ($script:base -ne 'https://aoootywbdbuhnzfvlmrr.supabase.co' -or
    $script:base.Contains($script:productionRef)) {
    throw 'SAFETY STOP: Refusing to run against any endpoint except JAAD-ISOLATION-STAGING.'
}
$script:passed = 0
$script:failed = 0
$script:unverified = 0
$script:cleanupIssues = 0
$script:testRun = [guid]::NewGuid().ToString('N')
$script:fixtures = @()

function Report([string]$result, [string]$check, [string]$notes = '') {
    if ($result -eq 'PASS') { $script:passed++; $color = 'Green' }
    elseif ($result -eq 'FAIL') { $script:failed++; $color = 'Red' }
    else { $script:unverified++; $color = 'Yellow' }
    Write-Host ("{0}: {1} {2}" -f $result, $check, $notes) -ForegroundColor $color
}

function Api([string]$method, [string]$path, [string]$token = '', $data = $null) {
    $headers = @{ apikey = $script:key; Accept = 'application/json'; Prefer = 'return=representation' }
    if ($token) { $headers.Authorization = 'Bearer ' + $token }
    $args = @{
        Uri = $script:base + $path
        Method = $method
        Headers = $headers
        UseBasicParsing = $true
        ErrorAction = 'Stop'
    }
    if ($null -ne $data) {
        $args.ContentType = 'application/json'
        $args.Body = ConvertTo-Json -InputObject $data -Depth 8 -Compress
    }
    try {
        $r = Invoke-WebRequest @args
        return [pscustomobject]@{ OK = $true; Status = [int]$r.StatusCode; Raw = [string]$r.Content }
    }
    catch [System.Net.WebException] {
        $response = $_.Exception.Response
        if ($null -eq $response) { throw }
        $status = [int]$response.StatusCode
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        try { $raw = $reader.ReadToEnd() } finally { $reader.Dispose() }
        return [pscustomobject]@{ OK = $false; Status = $status; Raw = [string]$raw }
    }
}

function ErrorCode($r) {
    try {
        $parsed = ConvertFrom-Json -InputObject $r.Raw -ErrorAction Stop
        return [string]$parsed.code
    } catch { return '' }
}

function RlsDenied($r) {
    if ($r.OK -or $r.Status -lt 400 -or $r.Status -ge 500) { return $false }
    $code = ErrorCode $r
    return ($code -eq '42501' -or $r.Raw -match '(?i)row.level security|permission denied')
}

function Records($r) {
    if (-not $r.OK) { throw "HTTP $($r.Status) / database code $(ErrorCode $r)" }
    if ([string]::IsNullOrWhiteSpace($r.Raw) -or $r.Raw.Trim() -eq '[]') { return }
    $parsed = ConvertFrom-Json -InputObject $r.Raw -ErrorAction Stop
    foreach ($item in $parsed) { if ($null -ne $item) { Write-Output $item } }
}

function Fetch($session, [string]$path) {
    @(Records (Api -method 'GET' -path $path -token $session.access_token))
}

function SignIn([string]$label) {
    $email = (Read-Host "$label email (staging only)").Trim()
    $secret = Read-Host "$label password" -AsSecureString
    try {
        $password = ([pscredential]::new('login', $secret)).GetNetworkCredential().Password
        $answer = Api -method 'POST' -path '/auth/v1/token?grant_type=password' -data @{ email = $email; password = $password }
        if (-not $answer.OK) { throw "$label sign-in failed (HTTP $($answer.Status))." }
        $session = ConvertFrom-Json -InputObject $answer.Raw
        if (-not $session.access_token -or -not $session.user.id) { throw "${label}: no valid authenticated session" }
        return $session
    }
    finally { $password = $null; $secret.Dispose() }
}

function LeadPath([string]$id, [string]$fields = 'id,tenant_customer_id,company,status,created_by') {
    '/rest/v1/customer_erp_leads?select=' + $fields + '&id=eq.' + $id
}

function GetLead($session, [string]$id) { @(Fetch $session (LeadPath $id)) }

function CheckOwnRow($session, [string]$id, [string]$tenant, [string]$status) {
    $rows = @(GetLead $session $id)
    return ($rows.Count -eq 1 -and $rows[0].tenant_customer_id -eq $tenant -and $rows[0].status -eq $status)
}

function Mark([string]$label) { 'JAAD-RLS-' + $script:testRun + '-' + $label }

function CheckBlockedInsert($actor, $target, [string]$label) {
    $marker = Mark $label
    $script:fixtures += [pscustomobject]@{ session = $target.session; tenant = $target.tenant; marker = $marker }
    $attempt = Api -method 'POST' -path '/rest/v1/customer_erp_leads?select=id' `
        -token $actor.session.access_token -data @{ tenant_customer_id = $target.tenant; company = $marker; contact_name = 'SECURITY TEST' }
    $filter = '/rest/v1/customer_erp_leads?select=id&tenant_customer_id=eq.' + $target.tenant + '&company=eq.' + $marker
    $seen = @(Fetch $target.session $filter)
    if ($seen.Count -gt 0 -or $attempt.OK) { Report 'FAIL' $label '(foreign-tenant INSERT succeeded or record appeared)' }
    elseif (RlsDenied $attempt) { Report 'PASS' $label '(INSERT rejected by database access control)' }
    else { Report 'UNVERIFIED' $label "(HTTP $($attempt.Status); code $(ErrorCode $attempt))" }
}

function CheckBlockedEdit($actor, $target, [string]$method, [string]$label) {
    $path = LeadPath $target.id
    if ($method -eq 'PATCH') {
        $attempt = Api -method 'PATCH' -path $path -token $actor.session.access_token -data @{ status = 'Won' }
    } else {
        $attempt = Api -method 'DELETE' -path $path -token $actor.session.access_token
    }
    $stillIntact = CheckOwnRow $target.session $target.id $target.tenant 'Contacted'
    if (-not $stillIntact) { Report 'FAIL' $label '(other owner record was modified or deleted)'; return }
    if ($attempt.OK) {
        $modified = @(Records $attempt)
        if ($modified.Count -gt 0) { Report 'FAIL' $label '(foreign record returned as changed)' }
        else { Report 'PASS' $label '(zero affected rows; other owner record intact)' }
    }
    elseif (RlsDenied $attempt) { Report 'PASS' $label '(access denied; other owner record intact)' }
    else { Report 'UNVERIFIED' $label "(HTTP $($attempt.Status); code $(ErrorCode $attempt))" }
}

function CheckReassignment($actor, $other, [string]$label) {
    $attempt = Api -method 'PATCH' -path (LeadPath $actor.id) -token $actor.session.access_token `
        -data @{ tenant_customer_id = $other.tenant }
    $stillOwn = CheckOwnRow $actor.session $actor.id $actor.tenant 'Contacted'
    if (-not $stillOwn) { Report 'FAIL' $label '(lead tenant or status changed)'; return }
    if ($attempt.OK) {
        $affected = @(Records $attempt)
        if ($affected.Count -eq 0) { Report 'UNVERIFIED' $label '(own record unexpectedly matched zero rows)' }
        else { Report 'FAIL' $label '(tenant reassignment was accepted)' }
    }
    elseif ((RlsDenied $attempt) -or $attempt.Raw -match 'Changing CRM lead tenant or creator') {
        Report 'PASS' $label '(tenant change rejected; own lead intact)'
    }
    else { Report 'UNVERIFIED' $label "(HTTP $($attempt.Status); code $(ErrorCode $attempt))" }
}

function CleanupTestRecords {
    # Search with both legitimate owner sessions. This also catches a record
    # wrongly inserted into, or reassigned to, the other tenant.
    $markers = @($script:fixtures | Select-Object -ExpandProperty marker -Unique)
    foreach ($marker in $markers) {
        foreach ($owner in $owners) {
            try {
                $path = '/rest/v1/customer_erp_leads?select=id&company=eq.' + $marker
                $found = @(Fetch $owner.session $path)
                foreach ($row in $found) {
                    $deleted = Api -method 'DELETE' -path (LeadPath $row.id) -token $owner.session.access_token
                    $left = @(GetLead $owner.session $row.id)
                    if (-not $deleted.OK -or $left.Count -ne 0) {
                        $script:cleanupIssues++
                        Write-Host "CLEANUP WARNING: Could not delete test lead $($row.id)" -ForegroundColor Yellow
                    }
                }
            } catch {
                $script:cleanupIssues++
                Write-Host 'CLEANUP WARNING: A test marker could not be checked; inspect staging test leads.' -ForegroundColor Yellow
            }
        }
    }
}

Write-Host 'JAAD STAGING - CROSS-COMPANY WRITE PROTECTION' -ForegroundColor Cyan
Write-Host 'This WILL create, update, and delete disposable CRM test leads in STAGING only.'
Write-Host "Locked API host: $($script:base)" -ForegroundColor Cyan
Write-Host 'Do not enter production credentials or a service-role key.'
$keySecret = Read-Host 'STAGING publishable API key' -AsSecureString
try { $script:key = ([pscredential]::new('api', $keySecret)).GetNetworkCredential().Password.Trim() }
finally { $keySecret.Dispose() }
if (-not $script:key.StartsWith('sb_publishable_')) { throw 'STOP: Only the staging publishable key is accepted.' }

try {
    $a = SignIn 'Test user 1'
    $b = SignIn 'Test user 2'
    if ($a.user.id -eq $b.user.id) { throw 'STOP: Sign in with two distinct staging accounts.' }
    $owners = @()
    foreach ($s in @($a, $b)) {
        $company = @(Fetch $s ('/rest/v1/companies?select=id,name,owner_user_id&owner_user_id=eq.' + $s.user.id))
        if ($company.Count -ne 1) { throw 'STOP: A test user cannot read exactly one owned company.' }
        if ($company[0].name -notmatch '^JAAD STAGING TEST COMPANY [AB]$') { throw 'STOP: Unexpected company fixture; no writes performed.' }
        $tenantRows = @(Fetch $s ('/rest/v1/customers?select=id,company_id&company_id=eq.' + $company[0].id))
        if ($tenantRows.Count -ne 1) { throw 'STOP: An owner cannot read exactly one customer workspace.' }
        $owners += [pscustomobject]@{ session = $s; company = $company[0].name; companyId = $company[0].id; tenant = $tenantRows[0].id; id = $null }
    }
    if ($owners[0].companyId -eq $owners[1].companyId -or $owners[0].tenant -eq $owners[1].tenant -or
        (@($owners | Select-Object -ExpandProperty company -Unique).Count -ne 2)) {
        throw 'STOP: Expected two distinct staging companies A and B.'
    }
    Write-Host "PREFLIGHT OK: $($owners[0].company) and $($owners[1].company)" -ForegroundColor Green
    $confirmation = Read-Host 'Type STAGING to authorize temporary writes in the isolated project'
    if ($confirmation -cne 'STAGING') { throw 'Cancelled before any write.' }

    foreach ($i in @(0,1)) {
        $owner = $owners[$i]
        $marker = Mark ('own-' + $i)
        $script:fixtures += [pscustomobject]@{ session = $owner.session; tenant = $owner.tenant; marker = $marker }
        $res = Api -method 'POST' -path '/rest/v1/customer_erp_leads?select=id,tenant_customer_id,created_by,status' `
            -token $owner.session.access_token -data @{ tenant_customer_id = $owner.tenant; company = $marker; contact_name = 'SECURITY TEST' }
        if (-not $res.OK) { throw "Own lead INSERT failed for test user $($i+1) (HTTP $($res.Status), code $(ErrorCode $res))." }
        $inserted = @(Records $res)
        if ($inserted.Count -ne 1 -or $inserted[0].tenant_customer_id -ne $owner.tenant -or
            $inserted[0].created_by -ne $owner.session.user.id) {
            throw "Own lead INSERT returned an unexpected result for test user $($i+1)."
        }
        $owner.id = $inserted[0].id
        Report 'PASS' "User $($i+1) own INSERT" '(one correctly owned row created)'
    }

    foreach ($i in @(0,1)) {
        $owner = $owners[$i]
        $other = $owners[1-$i]
        $otherVisible = @(GetLead $other.session $owner.id)
        if ((CheckOwnRow $owner.session $owner.id $owner.tenant 'New') -and
            $otherVisible.Count -eq 0) {
            Report 'PASS' "User $($i+1) own read / other read blocked"
        } else { Report 'FAIL' "User $($i+1) own read / other read blocked" }
        $res = Api -method 'PATCH' -path (LeadPath $owner.id) -token $owner.session.access_token -data @{ status = 'Contacted' }
        $updated = @()
        if ($res.OK) { $updated = @(Records $res) }
        if ($res.OK -and $updated.Count -eq 1 -and (CheckOwnRow $owner.session $owner.id $owner.tenant 'Contacted')) {
            Report 'PASS' "User $($i+1) own UPDATE"
        } else {
            Report 'FAIL' "User $($i+1) own UPDATE" '(cannot continue write tests reliably)'
            throw 'Own UPDATE precondition failed.'
        }
    }

    CheckBlockedInsert $owners[0] $owners[1] 'User 1 foreign-tenant INSERT blocked'
    CheckBlockedInsert $owners[1] $owners[0] 'User 2 foreign-tenant INSERT blocked'
    CheckBlockedEdit $owners[0] $owners[1] 'PATCH'  'User 1 foreign-tenant UPDATE blocked'
    CheckBlockedEdit $owners[1] $owners[0] 'PATCH'  'User 2 foreign-tenant UPDATE blocked'
    CheckReassignment $owners[0] $owners[1] 'User 1 cannot reassign own lead tenant'
    CheckReassignment $owners[1] $owners[0] 'User 2 cannot reassign own lead tenant'
    CheckBlockedEdit $owners[0] $owners[1] 'DELETE' 'User 1 foreign-tenant DELETE blocked'
    CheckBlockedEdit $owners[1] $owners[0] 'DELETE' 'User 2 foreign-tenant DELETE blocked'

    foreach ($i in @(0,1)) {
        $owner = $owners[$i]
        $res = Api -method 'DELETE' -path (LeadPath $owner.id) -token $owner.session.access_token
        $left = @(GetLead $owner.session $owner.id)
        $affected = @()
        if ($res.OK) { $affected = @(Records $res) }
        if ($res.OK -and $affected.Count -eq 1 -and $left.Count -eq 0) {
            Report 'PASS' "User $($i+1) own DELETE"
        } else { Report 'FAIL' "User $($i+1) own DELETE" '(remaining test rows will be cleaned up if possible)' }
    }
}
catch {
    $script:unverified++
    Write-Host "BLOCKER: $($_.Exception.Message)" -ForegroundColor Yellow
}
finally {
    if ($script:fixtures.Count -gt 0) { CleanupTestRecords }
    Write-Host ''
    Write-Host ("RESULT: PASS={0} FAIL={1} UNVERIFIED={2} CLEANUP_WARNINGS={3}" -f $script:passed,$script:failed,$script:unverified,$script:cleanupIssues) -ForegroundColor Cyan
    Write-Host 'Only customer_erp_leads was tested. Remaining modules, Storage and API routes still require verification.'
    $script:key = $null
    $a = $null; $b = $null
}
