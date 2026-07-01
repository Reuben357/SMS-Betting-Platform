import { connection } from 'next/server';
import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(req) {
  try {
    //
    const { token: accessToken } = await auth0.getAccessToken();

    const { searchParams } = new URL(req.url);
    const queryString = searchParams.toString();

    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "20";

    const backendRes = await fetch(
      `${API_URL}/api/payments${queryString ? `?${queryString}` : ''}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Cache-Control": "no-store",
        },
        cache: "no-store",
      },
    );

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("Payments GET proxy error:", err.message);
    return NextResponse.json(
      { error: "Failed to fetch payments." },
      { status: 500 },
    );
  }
}