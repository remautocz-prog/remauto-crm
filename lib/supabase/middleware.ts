import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isInviteCallbackErrorParam,
  resolveInviteCallbackError,
} from "@/lib/auth/invite-callback-errors";
import {
  AUTH_SET_PASSWORD_PATH,
  shouldSetPassword,
} from "@/lib/auth/invite-flow";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/login");
  const isAuthCallback = pathname.startsWith("/auth/callback");
  const isInviteErrorPage = pathname.startsWith("/auth/invite-error");
  const isSetPasswordRoute = pathname.startsWith(AUTH_SET_PASSWORD_PATH);
  const isAuthPublicRoute =
    isAuthRoute || isAuthCallback || isInviteErrorPage || isSetPasswordRoute;

  if (
    isAuthRoute &&
    isInviteCallbackErrorParam(
      request.nextUrl.searchParams.get("error"),
      request.nextUrl.searchParams.get("error_code")
    )
  ) {
    const reason = resolveInviteCallbackError({
      error: request.nextUrl.searchParams.get("error"),
      errorCode: request.nextUrl.searchParams.get("error_code"),
      errorDescription: request.nextUrl.searchParams.get("error_description"),
    });
    const url = request.nextUrl.clone();
    url.pathname = "/auth/invite-error";
    url.search = "";
    url.searchParams.set("reason", reason);
    return NextResponse.redirect(url);
  }

  if (!user && !isAuthPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (
    user &&
    shouldSetPassword(null, user) &&
    !isSetPasswordRoute &&
    !isAuthCallback &&
    !isInviteErrorPage
  ) {
    const url = request.nextUrl.clone();
    url.pathname = AUTH_SET_PASSWORD_PATH;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
