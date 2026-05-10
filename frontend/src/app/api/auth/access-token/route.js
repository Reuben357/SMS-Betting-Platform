import { getAccessToken } from "@auth0/nextjs-auth0";
import { NextResponse } from "next/server";

/**
 * GET /api/auth/access-token
 * Returns the Auth0 access token for the current session.
 * Used by frontend services (e.g., uploadService) to authenticate direct API calls.
 * This endpoint is protected by Auth0 – only logged‑in users can access it.
 */
export async function GET(req) {
  try {
    // Get the response object and access token from the session
    const res = new NextResponse();
    const { accessToken } = await getAccessToken(req, res);
    
    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    return NextResponse.json({ accessToken });
  } catch (err) {
    console.error("Access token error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
