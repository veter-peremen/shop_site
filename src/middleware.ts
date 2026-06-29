import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { CART_SESSION_COOKIE } from "@/lib/cart-constants";
import { defaultLocale, locales } from "@/i18n/routing";
import { CSRF_COOKIE } from "@/lib/csrf-constants";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

function generateToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  if (!request.cookies.get(CSRF_COOKIE)) {
    response.cookies.set(CSRF_COOKIE, generateToken(), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  if (!request.cookies.get(CART_SESSION_COOKIE)) {
    response.cookies.set(CART_SESSION_COOKIE, generateToken(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
