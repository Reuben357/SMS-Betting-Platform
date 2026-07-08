import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

const API_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://backend:5000";

export async function GET(req, { params }) {
  try {
    const { token: accessToken } = await auth0.getAccessToken(req);
    const resolvedParams = await params;
    const path = resolvedParams.path?.join("/") || "";

    const backendRes = await fetch(
        `${API_URL}/api/accounting/${path}${new URL(req.url).search}`,
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
    console.error("Accounting proxy error:", err.message);
    return NextResponse.json(
        { error: "Failed to fetch accounting data." },
        { status: 500 }
    );
  }
}