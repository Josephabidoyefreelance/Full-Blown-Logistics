
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Keep customer workspaces locked until tenant isolation is verified.
  if (
    process.env.CUSTOMER_ERP_TENANT_MODE !== "enabled" &&
    (
      request.nextUrl.pathname === "/customer/dashboard/workspace" ||
      request.nextUrl.pathname.startsWith("/customer/dashboard/workspace/")
    )
  ) {
    return new NextResponse(
      "Customer ERP workspace is locked pending tenant-isolation verification.",
      { status: 503 }
    );
  }

  const pathname = request.nextUrl.pathname;

  const publicRoutes = [
    "/",
    "/erp",
    "/admin/login",
    "/admin/forgot-password",
    "/admin/reset-password",
    "/customer/login",
    "/customer/reset-password",
    "/customer/customer/reset-password",
    "/customer/signup",
    "/customer/erp-signup",
  ];

  const isPublicPage = publicRoutes.includes(pathname);

  const isPublicAsset =
    pathname.startsWith("/documents/") ||
    pathname.startsWith("/legal-pages/");

  const isWebhook =
    pathname === "/api/security/turnstile" ||
    pathname === "/api/turnstile" ||
    pathname.startsWith("/api/inbound-email") ||
    pathname === "/api/twilio/voice" ||
    pathname === "/api/twilio/status";

  if (isPublicPage || isPublicAsset || isWebhook) {
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

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

  if (!user) {
    // Do not redirect public login or signup pages.
    // Keep admin and customer authentication separate.
    const url = request.nextUrl.clone();

    url.pathname = pathname.startsWith("/customer")
      ? "/customer/login"
      : "/admin/login";

    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
