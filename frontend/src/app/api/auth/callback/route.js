import { handleCallback } from "@auth0/nextjs-auth0";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const res = await handleCallback(req, {
      redirectUri: process.env.AUTH0_BASE_URL + "/api/auth/callback",
    });
    return res;
  } catch (err) {
    // User clicked Decline on the consent screen, or
    // any other auth error — redirect back to login
    // instead of showing a raw error page.
    if (
      err.message?.includes("access_denied") ||
      err.cause?.includes("access_denied") ||
      err.status === 401
    ) {
      return NextResponse.redirect(
        new URL("/api/auth/login", process.env.AUTH0_BASE_URL),
      );
    }

    // For any other unexpected error, redirect to login
    // with an error param so it can be surfaced if needed
    console.error("Callback error:", err.message);
    return NextResponse.redirect(
      new URL("/api/auth/login", process.env.AUTH0_BASE_URL),
    );
  }
}
