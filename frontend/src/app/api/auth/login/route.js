import { handleLogin } from "@auth0/nextjs-auth0";

/**
 * GET /api/auth/login
 * Initiates Auth0 login flow.
 * After successful authentication, Auth0 redirects to /api/auth/callback,
 * which then redirects to the default page (which forwards to /admin/dashboard).
 */
export const GET = handleLogin({
  authorizationParams: {
    audience: process.env.AUTH0_AUDIENCE,
    scope: "openid profile email",
  },
   returnTo: "/admin/dashboard"
});