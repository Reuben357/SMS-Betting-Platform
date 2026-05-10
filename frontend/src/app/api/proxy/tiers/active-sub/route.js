import { getAccessToken } from "@auth0/nextjs-auth0";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(req) {
  try {
    const res = new NextResponse();
    const { accessToken } = await getAccessToken(req, res);
    const body = await req.json();

    const backendRes = await fetch(`${API_URL}/api/tiers/active-sub`, {
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
    console.error("Tiers active-sub POST proxy error:", err.message);
    return NextResponse.json(
      { error: "Failed to create active sub-tier." },
      { status: 500 },
    );
  }
}
