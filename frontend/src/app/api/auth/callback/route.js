import { handleCallback } from "@auth0/nextjs-auth0";
import { NextResponse } from "next/server";

/**
 * GET /api/auth/callback
 * Auth0 OAuth callback handler.
 * On success, redirects to the default page (which is `/` then redirects to `/admin/dashboard`).
 * On error (e.g., user declined consent), redirects back to the login page.
 */
export async function GET(req) {
  try {
    // Let Auth0 handle the callback; it will redirect to the `returnTo` URL
    // (defaults to the root URL of your app, which then redirects to /admin/dashboard)
    const res = await handleCallback(req, {
      redirectUri: process.env.AUTH0_BASE_URL + "/api/auth/callback",
    });
    return res;
  } catch (err) {
    // Access denied (user clicked "Decline") or other auth error → redirect to login
    if (
      err.message?.includes("access_denied") ||
      err.cause?.includes("access_denied") ||
      err.status === 401
    ) {
      // Use AUTH0_BASE_URL fallback if not defined
      const baseUrl = process.env.AUTH0_BASE_URL || "http://localhost:3000";
      return NextResponse.redirect(new URL("/api/auth/login", baseUrl));
    }

    // Any other unexpected error – log and redirect to login
    console.error("Callback error:", err.message);
    const baseUrl = process.env.AUTH0_BASE_URL || "http://localhost:3000";
    return NextResponse.redirect(new URL("/api/auth/login", baseUrl));
  }
}
