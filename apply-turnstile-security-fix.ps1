$ErrorActionPreference = 'Stop'

# Run this script from the jaad-backend project root.
$projectRoot = (Get-Location).Path
$requiredFiles = @(
  'src/app/api/security/turnstile/route.ts',
  'src/components/turnstile-box.tsx',
  'src/app/admin/login/page.tsx',
  'src/app/customer/login/page.tsx',
  'src/app/customer/signup/page.tsx'
)

foreach ($relativePath in $requiredFiles) {
  if (-not (Test-Path (Join-Path $projectRoot $relativePath) -PathType Leaf)) {
    throw "Required file not found: $relativePath. Open PowerShell in the jaad-backend project root and run this script again."
  }
}

# Read all files and prepare all edits before writing anything.
$contents = @{}
foreach ($relativePath in $requiredFiles) {
  $contents[$relativePath] = [System.IO.File]::ReadAllText((Join-Path $projectRoot $relativePath))
}

function Replace-ExactlyOnce {
  param(
    [string]$Text,
    [string]$Pattern,
    [string]$Replacement,
    [string]$Description
  )
  $regex = [regex]::new($Pattern)
  $matches = $regex.Matches($Text)
  if ($matches.Count -ne 1) {
    throw "Safe patch stopped: expected exactly one match for '$Description', found $($matches.Count). No project files have been changed. Send this message to ChatGPT."
  }
  return $regex.Replace($Text, $Replacement, 1)
}

# Replace only the server verification route.
$contents['src/app/api/security/turnstile/route.ts'] = @'
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TurnstileResult = {
  success?: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
};

const VALID_ACTIONS = new Set([
  'admin_login',
  'customer_login',
  'customer_signup',
]);

function jsonError(error: string, status: number) {
  return NextResponse.json(
    { success: false, error },
    {
      status,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

export async function POST(request: NextRequest) {
  const secret =
    process.env.TURNSTILE_SECRET_KEY ||
    process.env.TURNSTILE_SECRET;

  if (!secret) {
    console.error('Turnstile server secret is not configured.');
    return jsonError(
      'Security verification is temporarily unavailable.',
      503,
    );
  }

  let body: { token?: unknown; action?: unknown };

  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid verification request.', 400);
  }

  const token =
    typeof body.token === 'string' ? body.token.trim() : '';
  const action =
    typeof body.action === 'string' ? body.action : '';

  if (!token || token.length > 4096) {
    return jsonError(
      'Complete the Cloudflare security check and try again.',
      400,
    );
  }

  if (!VALID_ACTIONS.has(action)) {
    return jsonError('Invalid security-check action.', 400);
  }

  const form = new URLSearchParams({
    secret,
    response: token,
  });

  let result: TurnstileResult;

  try {
    const verification = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!verification.ok) {
      console.error(
        'Turnstile Siteverify returned HTTP status:',
        verification.status,
      );
      return jsonError(
        'Cloudflare verification is temporarily unavailable. Please try again.',
        502,
      );
    }

    result = (await verification.json()) as TurnstileResult;
  } catch (error) {
    console.error(
      'Turnstile Siteverify request failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    return jsonError(
      'Cloudflare verification is temporarily unavailable. Please try again.',
      502,
    );
  }

  if (!result.success) {
    const codes = Array.isArray(result['error-codes'])
      ? result['error-codes'].filter(
          (code): code is string => typeof code === 'string',
        )
      : [];

    console.warn('Turnstile verification rejected:', codes);

    return jsonError(
      'Cloudflare could not verify this request. Please try again.',
      400,
    );
  }

  const hostname =
    typeof result.hostname === 'string'
      ? result.hostname.toLowerCase().replace(/\.$/, '')
      : '';

  // Localhost is accepted only in local development.
  // Production accepts the live domains and the named Vercel preview hostname.
  const allowedHostnames =
    process.env.NODE_ENV === 'development'
      ? new Set(['localhost'])
      : new Set([
          'jaadlogistics.com',
          'www.jaadlogistics.com',
          'full-blown-logistics.vercel.app',
        ]);

  if (!hostname || !allowedHostnames.has(hostname)) {
    console.warn('Turnstile hostname rejected:', hostname || '(missing)');
    return jsonError(
      'This website hostname is not authorized for verification.',
      400,
    );
  }

  // The widget must send the exact action expected by this endpoint.
  if (result.action !== action) {
    console.warn('Turnstile action mismatch:', {
      expected: action,
      received: result.action ?? null,
    });

    return jsonError(
      'Security verification did not match this page. Please try again.',
      400,
    );
  }

  return NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
'@

# Add the explicit action prop to the shared customer widget.
$contents['src/components/turnstile-box.tsx'] = Replace-ExactlyOnce `
  $contents['src/components/turnstile-box.tsx'] `
  'export default function TurnstileBox\(\{\s*onToken,\s*resetKey = 0,\s*\}: \{\s*onToken: \(token: string\) => void;\s*resetKey\?: number;\s*\}\)' `
  "export default function TurnstileBox({`r`n  onToken,`r`n  action,`r`n  resetKey = 0,`r`n}: {`r`n  onToken: (token: string) => void;`r`n  action: 'customer_login' | 'customer_signup';`r`n  resetKey?: number;`r`n})" `
  'shared TurnstileBox props'

$contents['src/components/turnstile-box.tsx'] = Replace-ExactlyOnce `
  $contents['src/components/turnstile-box.tsx'] `
  'sitekey: siteKey,\s*theme: .light.,\s*size: .flexible.,' `
  "sitekey: siteKey,`r`n      action,`r`n      theme: 'light',`r`n      size: 'flexible'," `
  'shared widget action setting'

$contents['src/components/turnstile-box.tsx'] = Replace-ExactlyOnce `
  $contents['src/components/turnstile-box.tsx'] `
  '\}, \[siteKey\]\);' `
  '}, [siteKey, action]);' `
  'shared widget render dependencies'

# Add the admin action without changing surrounding layout or styling.
$contents['src/app/admin/login/page.tsx'] = Replace-ExactlyOnce `
  $contents['src/app/admin/login/page.tsx'] `
  'sitekey: siteKey,\s*theme: .light.,\s*size: .flexible.,' `
  "sitekey: siteKey,`r`n      action: 'admin_login',`r`n      theme: 'light',`r`n      size: 'flexible'," `
  'admin widget action setting'

# Add action props to the existing customer login and signup widget instances.
$contents['src/app/customer/login/page.tsx'] = Replace-ExactlyOnce `
  $contents['src/app/customer/login/page.tsx'] `
  '<TurnstileBox(?=\s+resetKey=\{captchaResetKey\})' `
  '<TurnstileBox action="customer_login"' `
  'customer login widget action'

$contents['src/app/customer/signup/page.tsx'] = Replace-ExactlyOnce `
  $contents['src/app/customer/signup/page.tsx'] `
  '<TurnstileBox(?=\s+resetKey=\{captchaResetKey\})' `
  '<TurnstileBox action="customer_signup"' `
  'customer signup widget action'

# Back up the original files before applying the prepared changes.
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $projectRoot ".local-backups/turnstile-security-$stamp"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

foreach ($relativePath in $requiredFiles) {
  $backupPath = Join-Path $backupRoot $relativePath
  $backupDirectory = Split-Path -Parent $backupPath
  New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null
  Copy-Item (Join-Path $projectRoot $relativePath) $backupPath
}

# Write the prepared files as UTF-8 without a BOM.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
foreach ($relativePath in $requiredFiles) {
  $targetPath = Join-Path $projectRoot $relativePath
  [System.IO.File]::WriteAllText($targetPath, $contents[$relativePath], $utf8NoBom)
}

Write-Host ''
Write-Host 'Turnstile security patch applied successfully.' -ForegroundColor Green
Write-Host "Backup saved at: $backupRoot"
Write-Host 'No Git commit, push, merge, or deployment was performed.'
Write-Host 'Next: run git diff --check, then npx tsc --noEmit.'
