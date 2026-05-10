import { getAccessToken } from "@auth0/nextjs-auth0";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function PUT(req, { params }) {
  try {
    const res = new NextResponse();
    const { accessToken } = await getAccessToken(req, res);

    const backendRes = await fetch(
      `${API_URL}/api/payments/${params.id}/resolve`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("Payment resolve proxy error:", err.message);
    return NextResponse.json(
      { error: "Failed to resolve payment." },
      { status: 500 },
    );
  }
}
