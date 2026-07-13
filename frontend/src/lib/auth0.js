import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { readSecret } from "./secrets";

const ROLES_CLAIM = "https://betting-tips-api/roles";

export const auth0 = new Auth0Client({
    clientSecret: readSecret("AUTH0_CLIENT_SECRET_FILE", "AUTH0_CLIENT_SECRET", false),
    secret: readSecret("AUTH0_SECRET_FILE", "AUTH0_SECRET", false),
    routes: {
        login: "/api/auth/login",
        logout: "/api/auth/logout",
        callback: "/api/auth/callback",
        backChannelLogout: "/api/auth/backchannel-logout",
        profile: "/api/auth/me",
        accessToken: "/api/auth/access-token",
    },
    authorizationParameters: {
        audience: process.env.AUTH0_AUDIENCE,
        scope: "openid profile email",
    },
    // Without this, the SDK strips custom claims (like our roles claim)
    // from the session by default. We must opt back in explicitly.
    async beforeSessionSaved(session, idToken) {
        return {
            ...session,
            user: {
                ...session.user,
                [ROLES_CLAIM]: session.user[ROLES_CLAIM] ?? [],
            },
        };
    },
});