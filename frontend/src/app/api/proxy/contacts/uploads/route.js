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
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!backendRes.ok) {
       const errorData = await backendRes.text();
       console.error(`Backend Error (${backendRes.status}):`, errorData);
       return NextResponse.json({ error: "Backend rejected request", uploads: [] }, { status: backendRes.status });
    }

    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Proxy Connection Error:", err.message);
    return NextResponse.json({ error: "Cannot connect to backend server.", uploads: [] }, { status: 500 });
  }
}