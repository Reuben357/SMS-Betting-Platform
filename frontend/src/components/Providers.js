"use client";

import { Auth0Provider } from "@auth0/nextjs-auth0";

/**
 * Client-side provider wrapper.
 *
 * WHY THIS FILE EXISTS:
 * src/app/layout.js is a Next.js server component. Auth0Provider rendered
 * inside a server component cannot propagate props (like profileRoute) into
 * the client-side React context — the prop is evaluated server-side and
 * never reaches the browser bundle.
 *
 * Marking this component "use client" ensures Auth0Provider runs in the
 * browser where it sets up the useUser() context correctly, and the
 * profileRoute prop is actually passed to the client SDK.
 *
 * profileRoute="/api/auth/me" — tells the client SDK where to fetch the
 * session. Our middleware serves it at /api/auth/me (configured in
 * src/lib/auth0.js routes.profile). Without this, the SDK defaults to
 * /auth/profile which 404s and leaves useUser() returning undefined.
 */
export default function Providers({ children }) {
    return (
        <Auth0Provider profileRoute="/api/auth/me">
            {children}
        </Auth0Provider>
    );
}
