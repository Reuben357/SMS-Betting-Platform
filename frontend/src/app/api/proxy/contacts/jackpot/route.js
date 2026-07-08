import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

const API_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://backend:5000";

export async function GET(req) {
    try {
        //
        const { token: accessToken } = await auth0.getAccessToken({req});
        const { searchParams } = new URL(req.url);
        const page = searchParams.get("page") || "1";
        const limit = searchParams.get("limit") || "20";
        const search = searchParams.get("search") || "";
        const jpTier = searchParams.get("jp_tier") || ""; // NEW

        // Build URL with all parameters
        let url = `${API_URL}/api/contacts/jackpot?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
        if (jpTier) {
            url += `&jp_tier=${encodeURIComponent(jpTier)}`;
        }

        const backendRes = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Cache-Control": "no-store",
            },
            cache: "no-store",
        });

        const data = await backendRes.json();
        return NextResponse.json(data, { status: backendRes.status });
    } catch (err) {
        console.error("Jackpot proxy error:", err.message);
        return NextResponse.json({ error: "Failed to fetch jackpot customers." }, { status: 500 });
    }
}