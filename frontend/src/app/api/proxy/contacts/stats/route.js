import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

const API_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://backend:5000";

export async function GET(req) {
  try {
    const { token: accessToken } = await auth0.getAccessToken(req);
    const { searchParams } = new URL(req.url);
    const tier = searchParams.get("tier");

    const url = `${API_URL}/api/contacts/stats${tier ? `?tier=${tier}` : ""}`;
    const backendRes = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("Stats proxy error:", err.message);
    return NextResponse.json({ error: "Failed to fetch stats." }, { status: 500 });
  }
}