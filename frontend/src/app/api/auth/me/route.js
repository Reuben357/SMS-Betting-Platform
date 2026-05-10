import { handleProfile } from "@auth0/nextjs-auth0";

/**
 * GET /api/auth/me
 * Returns the user profile of the currently logged‑in user.
 * Used by the frontend to get user info and roles.
 */
export async function GET(req) {
  try {
    return await handleProfile(req);
  } catch (err) {
    console.error("Profile error:", err.message);
    return new Response(err.message, { status: err.status ?? 500 });
  }
}
