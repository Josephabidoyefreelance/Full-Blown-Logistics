warning: in the working copy of 'src/app/proxy.ts', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/src/app/proxy.ts b/src/app/proxy.ts[m
[1mnew file mode 100644[m
[1mindex 0000000..954e6fb[m
[1m--- /dev/null[m
[1m+++ b/src/app/proxy.ts[m
[36m@@ -0,0 +1,69 @@[m
[32m+[m
[32m+[m[32mimport { createServerClient } from '@supabase/ssr';[m
[32m+[m[32mimport { NextResponse, type NextRequest } from 'next/server';[m
[32m+[m
[32m+[m[32mexport async function proxy(request: NextRequest) {[m
[32m+[m[32m  // Webhook routes have no browser session (Resend, etc. call these directly),[m
[32m+[m[32m  // so they must skip the auth redirect entirely.[m
[32m+[m[32m  const pathname = request.nextUrl.pathname;[m
[32m+[m[32m  const isWebhookRoute =[m
[32m+[m[32m    pathname.startsWith('/api/inbound-email') ||[m
[32m+[m[32m    pathname === '/api/twilio/voice' ||[m
[32m+[m[32m    pathname === '/api/twilio/status';[m
[32m+[m
[32m+[m[32m  if (isWebhookRoute) {[m
[32m+[m[32m    return NextResponse.next({ request });[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  let response = NextResponse.next({ request });[m
[32m+[m
[32m+[m[32m  const supabase = createServerClient([m
[32m+[m[32m    process.env.NEXT_PUBLIC_SUPABASE_URL!,[m
[32m+[m[32m    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,[m
[32m+[m[32m    {[m
[32m+[m[32m      cookies: {[m
[32m+[m[32m        getAll() {[m
[32m+[m[32m          return request.cookies.getAll();[m
[32m+[m[32m        },[m
[32m+[m[32m        setAll(cookiesToSet) {[m
[32m+[m[32m          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));[m
[32m+[m[32m          response = NextResponse.next({ request });[m
[32m+[m[32m          cookiesToSet.forEach(({ name, value, options }) =>[m
[32m+[m[32m            response.cookies.set(name, value, options)[m
[32m+[m[32m          );[m
[32m+[m[32m        },[m
[32m+[m[32m      },[m
[32m+[m[32m    }[m
[32m+[m[32m  );[m
[32m+[m
[32m+[m[32m  const {[m
[32m+[m[32m    data: { user },[m
[32m+[m[32m  } = await supabase.auth.getUser();[m
[32m+[m
[32m+[m[32m  // Pages anyone can visit without being logged in: the homepage,[m
[32m+[m[32m  // both login pages, and customer signup. Everything else, including[m
[32m+[m[32m  // the customer dashboard, requires a logged-in session.[m
[32m+[m[32m  const isPublicRoute =[m
[32m+[m[32m    request.nextUrl.pathname === '/' ||[m
[32m+[m[32m    request.nextUrl.pathname.startsWith('/admin/login') ||[m
[32m+[m[32m    request.nextUrl.pathname === '/customer/login' ||[m
[32m+[m[32m    request.nextUrl.pathname === '/customer/signup';[m
[32m+[m
[32m+[m[32m  if (!user && !isPublicRoute) {[m
[32m+[m[32m    const url = request.nextUrl.clone();[m
[32m+[m[32m    url.pathname = request.nextUrl.pathname.startsWith('/customer') ? '/customer/login' : '/admin/login';[m
[32m+[m[32m    return NextResponse.redirect(url);[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  if (user && request.nextUrl.pathname.startsWith('/admin/login')) {[m
[32m+[m[32m    const url = request.nextUrl.clone();[m
[32m+[m[32m    url.pathname = '/dashboard';[m
[32m+[m[32m    return NextResponse.redirect(url);[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  return response;[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32mexport const config = {[m
[32m+[m[32m  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],[m
[32m+[m[32m};[m
