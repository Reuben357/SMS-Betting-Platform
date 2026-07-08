import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

const API_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://backend:5000";

export async function GET(req, { params }) {
    try {
        //
        const { token: accessToken } = await auth0.getAccessToken(req);
        const { phone } = await params;

        if (!phone) {
            return NextResponse.json({ error: "Phone number required" }, { status: 400 });
        }

        // Forward the full query string from the original request
        const { searchParams } = new URL(req.url);
        const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';

        const backendRes = await fetch(`${API_URL}/api/contacts/${phone}/uploads${queryString}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });

        const data = await backendRes.json();
        return NextResponse.json(data, { status: backendRes.status });
    } catch (err) {
        console.error("Contact uploads proxy error:", err.message);
        return NextResponse.json({ error: "Failed to fetch upload history." }, { status: 500 });
    }
}