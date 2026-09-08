import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // Webhook routes have no browser session (Resend, etc. call these directly),
  // so they must skip the auth redirect entirely.
  const isWebhookRoute = request.nextUrl.pathname.startsWith('/api/inbound-email');
  if (isWebhookRoute) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pages anyone can visit without being logged in: the homepage,
  // both login pages, and customer signup. Everything else, including
  // the customer dashboard, requires a logged-in session.
  const isPublicRoute =
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/admin/login') ||
    request.nextUrl.pathname === '/customer/login' ||
    request.nextUrl.pathname === '/customer/signup';

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = request.nextUrl.pathname.startsWith('/customer') ? '/customer/login' : '/admin/login';
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname.startsWith('/admin/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
