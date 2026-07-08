import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

const API_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://backend:5000";

export async function GET(req) {
  try {
    //
    const { token: accessToken } = await auth0.getAccessToken(req);
    const backendRes = await fetch(`${API_URL}/api/customers/stats`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("Customers stats proxy error:", err.message);
    return NextResponse.json(
      { error: "Failed to fetch customer stats." },
      { status: 500 }
    );
  }
}