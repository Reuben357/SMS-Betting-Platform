"use client";

import { Auth0Provider } from "@auth0/nextjs-auth0";
/**
 * Client-side wrapper for Auth0Provider. layout.js is a server component,
 * so profileRoute only reaches the browser SDK if Auth0Provider runs here
 * under "use client". profileRoute must match routes.profile in lib/auth0.js
 * — otherwise the SDK defaults to /auth/profile, which 404s, and useUser()
 * returns undefined.
 */
export default function Providers({ children }) {
    return (
        <Auth0Provider profileRoute="/api/auth/me">
            {children}
        </Auth0Provider>
    );
}
