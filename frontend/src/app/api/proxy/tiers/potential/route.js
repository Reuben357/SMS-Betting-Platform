
import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

const API_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://backend:5000";

export async function POST(req) {
  try {
    //
    const { token: accessToken } = await auth0.getAccessToken({req});
    const body = await req.json();

    const backendRes = await fetch(`${API_URL}/api/tiers/potential`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("Tiers potential POST proxy error:", err.message);
    return NextResponse.json(
      { error: "Failed to create potential tier." },
      { status: 500 },
    );
  }
}
