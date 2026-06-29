import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_super_secret_for_tuition_class_app_2026";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = "tuition_auth_token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define public paths
  const isPublicPath = pathname === "/login" || pathname.startsWith("/api/auth/login");
  const isCronPath = pathname.startsWith("/api/cron");

  // Skip middleware for static assets, images, favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes("favicon.ico") ||
    pathname.includes(".") // matches files like .png, .jpg
  ) {
    return NextResponse.next();
  }

  // Retrieve token from cookies
  const token = request.cookies.get(COOKIE_NAME)?.value;
  let user = null;

  if (token) {
    try {
      const { payload } = await jose.jwtVerify(token, SECRET_KEY);
      user = payload as {
        userId: string;
        email: string;
        name: string;
        role: "OWNER" | "TEACHER" | "PARENT";
      };
    } catch (e) {
      // Invalid token, clear it below
    }
  }

  // Allow cron paths to pass (they will verify their own API key header)
  if (isCronPath) {
    return NextResponse.next();
  }

  // If user is not logged in and trying to access a private path
  if (!user && !isPublicPath) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    // Clear cookie if it was invalid
    if (token) {
      response.cookies.set({
        name: COOKIE_NAME,
        value: "",
        maxAge: 0,
        path: "/",
      });
    }
    return response;
  }

  // If user is logged in and trying to access the login page
  if (user && isPublicPath) {
    if (user.role === "OWNER") {
      return NextResponse.redirect(new URL("/owner/dashboard", request.url));
    } else if (user.role === "TEACHER") {
      return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
    } else if (user.role === "PARENT") {
      return NextResponse.redirect(new URL("/parent/dashboard", request.url));
    }
  }

  // If user is logged in and trying to access the root "/"
  if (user && pathname === "/") {
    if (user.role === "OWNER") {
      return NextResponse.redirect(new URL("/owner/dashboard", request.url));
    } else if (user.role === "TEACHER") {
      return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
    } else if (user.role === "PARENT") {
      return NextResponse.redirect(new URL("/parent/dashboard", request.url));
    }
  }

  // Role-based authorization checks
  if (user) {
    if (pathname.startsWith("/owner") && user.role !== "OWNER") {
      // Redirect to their own dashboard if they try to access owner routes
      return redirectToDashboard(user.role, request.url);
    }
    if (pathname.startsWith("/teacher") && user.role !== "TEACHER") {
      return redirectToDashboard(user.role, request.url);
    }
    if (pathname.startsWith("/parent") && user.role !== "PARENT") {
      return redirectToDashboard(user.role, request.url);
    }
  }

  return NextResponse.next();
}

function redirectToDashboard(role: string, baseUrl: string) {
  if (role === "OWNER") {
    return NextResponse.redirect(new URL("/owner/dashboard", baseUrl));
  } else if (role === "TEACHER") {
    return NextResponse.redirect(new URL("/teacher/dashboard", baseUrl));
  } else {
    return NextResponse.redirect(new URL("/parent/dashboard", baseUrl));
  }
}

// Config to specify which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth/login (handled in middleware explicitly)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
