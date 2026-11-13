# JAAD ERP Stage 2 - linked shipment isolation tests (corrected URL construction)
# STAGING ONLY. Writes disposable test fixtures and removes them.
# Does not modify policies, subscriptions, app files or production.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = 'https://aoootywbdbuhnzfvlmrr.supabase.co'
$pass=0; $fail=0; $unverified=0; $cleanupWarnings=0
$key=$null; $marks=@(); $sessions=@(); $objs=@()
function Result([string]$kind,[string]$label) {
  switch($kind) { 'PASS' {$script:pass++;$c='Green'} 'FAIL' {$script:fail++;$c='Red'} default {$script:unverified++;$c='Yellow'} }
  Write-Host "${kind}: $label" -ForegroundColor $c
}
function Json($r) { if([string]::IsNullOrWhiteSpace($r.body)) { return $null }; return ConvertFrom-Json -InputObject $r.body }
function Request($method,$path,$token,$data=$null,$returnRow=$false) {
 $headers=@{ apikey=$script:key; Accept='application/json' }
 if($token) { $headers.Authorization="Bearer $token" }
 if($returnRow) { $headers.Prefer='return=representation' }
 $params=@{Uri="$script:base$path";Method=$method;Headers=$headers;UseBasicParsing=$true;ErrorAction='Stop'}
 if($null -ne $data) {$params.ContentType='application/json';$params.Body=ConvertTo-Json -InputObject $data -Depth 12 -Compress}
 try { $resp=Invoke-WebRequest @params; return [pscustomobject]@{ok=$true;status=[int]$resp.StatusCode;body=[string]$resp.Content} }
 catch [System.Net.WebException] {
   if(!$_.Exception.Response){throw}
   $resp=$_.Exception.Response; $rd=New-Object IO.StreamReader($resp.GetResponseStream())
   try {$msg=$rd.ReadToEnd()} finally {$rd.Dispose()}
   return [pscustomobject]@{ok=$false;status=[int]$resp.StatusCode;body=[string]$msg}
 }
}
function Rows($r) {
 if(!$r.ok) { return @() }
 if([string]::IsNullOrWhiteSpace($r.body) -or $r.body.Trim() -eq '[]') { return @() }
 $value=Json $r; return @($value)
}
function Secret([string]$prompt) {
 $s=Read-Host $prompt -AsSecureString
 try{return ([pscredential]::new('tmp',$s)).GetNetworkCredential().Password}finally{$s.Dispose()}
}
function SignIn([string]$name) {
 $email=Read-Host "$name staging email"; $pw=Secret "$name staging password"
 $auth=Request POST '/auth/v1/token?grant_type=password' $null @{email=$email;password=$pw}
 $pw=$null
 if(!$auth.ok){throw "$name sign-in failed HTTP $($auth.status)"}
 $login=Json $auth
 $co=Request GET '/rest/v1/companies?select=id,name,owner_user_id&limit=10' $login.access_token
 if(!$co.ok){throw "$name companies lookup HTTP $($co.status)"}
 $own=@(Rows $co | Where-Object {$_.owner_user_id -eq $login.user.id -and $_.name -in @('JAAD STAGING TEST COMPANY A','JAAD STAGING TEST COMPANY B')})
 if($own.Count -ne 1){throw "$name staging owner/company identity not uniquely established"}
 $tenants=Request POST '/rest/v1/rpc/jaad_my_customer_tenants' $login.access_token @{}
 if(!$tenants.ok){throw "$name workspace membership query HTTP $($tenants.status)"}
 return [pscustomobject]@{label=$name;token=$login.access_token;user=$login.user.id;company=$own[0].id;name=$own[0].name}
}
function GetRows($who,$table,$query) {return Request GET "/rest/v1/${table}?$query" $who.token}
function Create($who,$table,$body,[string]$label) {
 $r=Request POST "/rest/v1/${table}?select=*" $who.token $body $true
 if(!$r.ok) {Result 'UNVERIFIED' "${label}: own INSERT HTTP $($r.status) $($r.body)";return $null}
 $rows=@(Rows $r)
 if($rows.Count -ne 1) {Result 'UNVERIFIED' "${label}: expected exactly one inserted row";return $null}
 Result 'PASS' "${label}: own INSERT"
 if($table -eq 'bookings' -or $table -eq 'manifests' -or $table -eq 'booking_cargo_items' -or $table -eq 'proof_of_delivery' -or $table -eq 'tracking_events') {
  $script:objs+= [pscustomobject]@{who=$who;table=$table;id=$rows[0].id}
 }
 return $rows[0]
}
function OwnForeign($a,$b,$table,$id,$label) {
 $mine=GetRows $a $table "select=*&id=eq.$id"
 $foreign=GetRows $b $table "select=id&id=eq.$id"
 if(!$mine.ok -or !$foreign.ok){Result 'UNVERIFIED' "${label}: read HTTP own=$($mine.status) foreign=$($foreign.status)";return}
 if(@(Rows $mine).Count -eq 1 -and @(Rows $foreign).Count -eq 0){Result 'PASS' "${label}: own visible, foreign hidden"}
 else {Result 'FAIL' "${label}: unexpected own/foreign visibility"}
}
function CrossInsert($attacker,$table,$payload,$label) {
 $r=Request POST "/rest/v1/${table}?select=*" $attacker.token $payload $true
 $items=@(Rows $r)
 if(!$r.ok -and ($r.status -in @(401,403) -or ($r.status -in @(400,409,422) -and $r.body -match '(?i)row.level.security|permission|cross.company|tenant|policy|violates.*check'))) {Result 'PASS' "${label}: denied HTTP $($r.status)"}
 elseif($r.ok -and $items.Count -eq 0) {Result 'UNVERIFIED' "${label}: HTTP success without returned row"}
 elseif($r.ok) {
  Result 'FAIL' "${label}: foreign link INSERT succeeded"
  foreach($it in $items) {
    if($null -ne $it.id) {$script:objs += [pscustomobject]@{who=$attacker;table=$table;id=$it.id}}
    elseif($null -ne $it.booking_id -and $null -ne $it.manifest_id) {
      $path="/rest/v1/${table}?booking_id=eq.$($it.booking_id)&manifest_id=eq.$($it.manifest_id)"
      $del=Request DELETE $path $attacker.token
      if(!$del.ok) {$script:cleanupWarnings++;Write-Host "CLEANUP WARNING: ${table} cross-link" -ForegroundColor Yellow}
    }
  }
}
 else {Result 'UNVERIFIED' "${label}: HTTP $($r.status) $($r.body)"}
}
function ForeignEdit($attacker,$table,$id,$label) {
 # Use no-op patch. A foreign UPDATE should affect zero rows; non-2xx denied is acceptable.
 $r=Request PATCH "/rest/v1/${table}?id=eq.$id&select=id" $attacker.token @{id=$id} $true
 if(!$r.ok -and $r.status -in @(400,401,403,409,422)) {Result 'PASS' "${label}: rejected HTTP $($r.status)";return}
 if(!$r.ok) {Result 'UNVERIFIED' "${label}: HTTP $($r.status) $($r.body)";return}
 if(@(Rows $r).Count -eq 0) {Result 'PASS' "${label}: foreign PATCH affected zero rows"}else{Result 'FAIL' "${label}: foreign PATCH touched a row"}
}
Write-Host 'JAAD STAGE 2 - LINKED SHIPMENT TENANT ISOLATION' -ForegroundColor Cyan
Write-Host "Endpoint: $base"
Write-Host 'STAGING ONLY. Temporary test rows will be created and deleted.'
try {
 $key=Secret 'STAGING publishable API key'
 if(!$key.StartsWith('sb_publishable_')) {throw 'STOP: staging publishable key required'}
 $a=SignIn 'Company A owner';$b=SignIn 'Company B owner';$sessions=@($a,$b)
 if($a.user -eq $b.user -or $a.company -eq $b.company -or $a.name -eq $b.name){throw 'STOP: independent staging identities required'}
 if(!(($a.name -eq 'JAAD STAGING TEST COMPANY A' -and $b.name -eq 'JAAD STAGING TEST COMPANY B') -or ($a.name -eq 'JAAD STAGING TEST COMPANY B' -and $b.name -eq 'JAAD STAGING TEST COMPANY A'))) {throw 'STOP: unexpected companies'}
 Write-Host 'PREFLIGHT PASS: two different staging company owners' -ForegroundColor Green
 if((Read-Host 'Type STAGING to authorize disposable fixture writes') -cne 'STAGING'){throw 'STOP: staging write confirmation missing'}
 $run=[guid]::NewGuid().ToString('N')
 $date=(Get-Date).ToString('yyyy-MM-dd')
 $fixtures=@()
 foreach($who in $sessions) {
  $booking=Create $who 'bookings' @{tracking_no="JAAD-STAGE2-LINK-$run-$($who.label.Replace(' ',''))";company_id=$who.company;user_id=$who.user;customer_name='JAAD staging isolation fixture';origin='Staging';destination='Staging';type='Road';status='Pending';pickup_date=$date} "$($who.label) booking"
  if($null -eq $booking) {throw 'STOP: cannot establish booking fixtures; no linked tests are valid'}
  $fixtures+= [pscustomobject]@{who=$who;booking=$booking;tracking=$null;cargo=$null;pod=$null;manifest=$null}
 }
 foreach($f in $fixtures) {
  $f.tracking=Create $f.who 'tracking_events' @{booking_id=$f.booking.id;description="Stage 2 isolation $run"} "$($f.who.label) tracking"
  $f.cargo=Create $f.who 'booking_cargo_items' @{booking_id=$f.booking.id;company_id=$f.who.company;description="Stage 2 cargo $run";quantity='1'} "$($f.who.label) cargo"
  $f.pod=Create $f.who 'proof_of_delivery' @{booking_id=$f.booking.id;company_id=$f.who.company;status='Pending';received_by='STAGING TEST'} "$($f.who.label) POD"
  $f.manifest=Create $f.who 'manifests' @{company_id=$f.who.company;manifest_no="STAGE2-$run-$($f.who.label.Replace(' ',''))"} "$($f.who.label) manifest"
 }
 for($i=0;$i -lt 2;$i++) {
  $f=$fixtures[$i]; $other=$fixtures[1-$i]
  foreach($name in @('tracking','cargo','pod','manifest')) {
   $item=$f.$name
   $table=@{tracking='tracking_events';cargo='booking_cargo_items';pod='proof_of_delivery';manifest='manifests'}[$name]
   if($null -ne $item){OwnForeign $f.who $other.who $table $item.id "$($f.who.label) $name"; ForeignEdit $other.who $table $item.id "$($other.who.label) foreign $name"}
  }
  CrossInsert $f.who 'tracking_events' @{booking_id=$other.booking.id;description="Stage 2 foreign tracking $run"} "$($f.who.label) foreign tracking parent"
  CrossInsert $f.who 'booking_cargo_items' @{booking_id=$other.booking.id;company_id=$f.who.company;description="Stage 2 foreign cargo $run"} "$($f.who.label) foreign cargo parent"
  CrossInsert $f.who 'proof_of_delivery' @{booking_id=$other.booking.id;company_id=$f.who.company;status='Pending';received_by='STAGING TEST'} "$($f.who.label) foreign POD parent"
  if($null -ne $f.manifest -and $null -ne $other.manifest) {
   CrossInsert $f.who 'manifest_bookings' @{booking_id=$other.booking.id;manifest_id=$f.manifest.id} "$($f.who.label) cross-company manifest_bookings"
   CrossInsert $f.who 'manifest_shipments' @{booking_id=$other.booking.id;manifest_id=$f.manifest.id} "$($f.who.label) cross-company manifest_shipments"
  }else{Result 'UNVERIFIED' "$($f.who.label): manifest link tests lack owned manifest fixtures"}
 }
}
catch { Result 'UNVERIFIED' "BLOCKER: $($_.Exception.Message)" }
finally {
 # Cleanup is defensive: delete only the records created by this script, in dependency order.
 $order=@('tracking_events','booking_cargo_items','proof_of_delivery','manifests','bookings')
 foreach($table in $order) {
  foreach($o in @($objs | Where-Object {$_.table -eq $table})) {
   $r=Request DELETE "/rest/v1/${table}?id=eq.$($o.id)&select=id" $o.who.token $null $true
   if(!$r.ok -or @(Rows $r).Count -ne 1) {
    $cleanupWarnings++;Write-Host "CLEANUP WARNING: $table id $($o.id) HTTP $($r.status)" -ForegroundColor Yellow
   }
  }
 }
 Write-Host "RESULT: PASS=$pass FAIL=$fail UNVERIFIED=$unverified CLEANUP_WARNINGS=$cleanupWarnings" -ForegroundColor Cyan
 Write-Host 'Staging only. API route and Storage security are separate pending tests.'
 $key=$null; $sessions=@()
}
