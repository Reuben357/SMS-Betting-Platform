import { getAccessToken } from "@auth0/nextjs-auth0";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(req) {
  try {
    const res = new NextResponse();
    const { accessToken } = await getAccessToken(req, res);

    const backendRes = await fetch(`${API_URL}/api/contacts/uploads`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Cache-Control': 'no-store',
      },
      cache: 'no-store',
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("Upload history proxy error:", err.message);
    return NextResponse.json(
      { error: "Failed to fetch upload history." },
      { status: 500 },
    );
  }
}
