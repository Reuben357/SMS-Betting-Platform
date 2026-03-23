import { getAccessToken } from "@auth0/nextjs-auth0";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(req) {
  try {
    const res = new NextResponse();
    const { accessToken } = await getAccessToken(req, res);

    const { searchParams } = new URL(req.url);
    const query = searchParams.toString();

    const backendRes = await fetch(
      `${API_URL}/api/contacts${query ? `?${query}` : ""}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Cache-Control": "no-store",
        },
        cache: 'no-store',
      }
    );

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("Contacts proxy error:", err.message);
    return NextResponse.json(
      { error: "Failed to fetch contacts." },
      { status: 500 },
    );
  }
}
