import { connection } from 'next/server';
import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

const API_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://backend:5000";

/**
 * GET /api/proxy/dashboard
 * Proxies dashboard data from the backend API.
 * Adds the user's Auth0 access token to the request headers.
 */
export async function GET(req) {
  try {
    // Get the access token for the authenticated user
    //
    const { token: accessToken } = await auth0.getAccessToken();
    // Call the backend dashboard endpoint
    const backendRes = await fetch(`${API_URL}/api/dashboard`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Cache-Control": "no-store",
      },
      cache: "no-store",
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("Dashboard proxy error:", err.message);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data." },
      { status: 500 }
    );
  }
}
