import { handleLogout } from "@auth0/nextjs-auth0";

/**
 * GET /api/auth/logout
 * Logs out the user from both the app and Auth0.
 * After logout, redirects to the home page (or the configured returnTo).
 */
export async function GET(req) {
  try {
    return await handleLogout(req);
  } catch (err) {
    console.error("Logout error:", err.message);
    return new Response(err.message, { status: err.status ?? 500 });
  }
}
