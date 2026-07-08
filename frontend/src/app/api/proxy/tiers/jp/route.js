import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

const API_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://backend:5000";

export async function GET(req) {
    try {
        //
        const { token: accessToken } = await auth0.getAccessToken();
        const backendRes = await fetch(`${API_URL}/api/tiers/jp`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
        });
        const data = await backendRes.json();
        return NextResponse.json(data, { status: backendRes.status });
    } catch (err) {
        console.error("JP tiers proxy error:", err.message);
        return NextResponse.json({ error: "Failed to fetch JP tiers." }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        //
        const { token: accessToken } = await auth0.getAccessToken();
        const body = await req.json();
        const backendRes = await fetch(`${API_URL}/api/tiers/jp`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            cache: "no-store",
        });
        const data = await backendRes.json();
        return NextResponse.json(data, { status: backendRes.status });
    } catch (err) {
        console.error("JP tiers PUT proxy error:", err.message);
        return NextResponse.json({ error: "Failed to update JP tiers." }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        //
        const { token: accessToken } = await auth0.getAccessToken();
        const body = await req.json();
        const backendRes = await fetch(`${API_URL}/api/tiers/jp`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            cache: "no-store",
        });
        const data = await backendRes.json();
        return NextResponse.json(data, { status: backendRes.status });
    } catch (err) {
        console.error("JP tiers POST proxy error:", err.message);
        return NextResponse.json({ error: "Failed to create JP tier." }, { status: 500 });
    }
}