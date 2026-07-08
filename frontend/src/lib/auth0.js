import { Auth0Client } from "@auth0/nextjs-auth0/server";

const ROLES_CLAIM = "https://betting-tips-api/roles";

export const auth0 = new Auth0Client({
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

        console.log(JSON.stringify(session.user, null, 2))
    },
});