import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

const API_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://backend:5000";

export async function GET(req) {
  try {
    const { token: accessToken } = await auth0.getAccessToken({req});

    const { searchParams } = new URL(req.url);
    const page   = searchParams.get("page")   || "1";
    const limit  = searchParams.get("limit")  || "20";
    const search = searchParams.get("search") || "";
    const tier   = searchParams.get("tier")   || "";

    const backendRes = await fetch(
        `${API_URL}/api/contacts?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&tier=${encodeURIComponent(tier)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Cache-Control": "no-store",
          },
          cache: "no-store",
        }
    );

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("Contacts proxy error:", err.message);
    return NextResponse.json({ error: "Failed to fetch contacts." }, { status: 500 });
  }
}
