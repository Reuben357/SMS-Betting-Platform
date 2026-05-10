import { getAccessToken } from "@auth0/nextjs-auth0";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(req, { params }) {
  try {
    const res = new NextResponse();
    const { accessToken } = await getAccessToken(req, res);
    const path = params.path?.join("/") || "";
    const backendRes = await fetch(
      `${API_URL}/api/settings/${path}${new URL(req.url).search}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const res = new NextResponse();
    const { accessToken } = await getAccessToken(req, res);
    const path = params.path?.join("/") || "";
    const body = await req.json();
    const backendRes = await fetch(`${API_URL}/api/settings/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
