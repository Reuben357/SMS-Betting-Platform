import { auth0 } from "@/lib/auth0";

export async function middleware(req) {
    return await auth0.middleware(req);
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
    runtime: "nodejs",
};