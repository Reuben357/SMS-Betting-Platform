import { getAccessToken } from "@auth0/nextjs-auth0";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(req) {
  try {
    const res = new NextResponse();
    const { accessToken } = await getAccessToken(req, res);

    const backendRes = await fetch(`${API_URL}/api/tiers`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Cache-Control": "no-store",
      },
      cache: "no-store",
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("Tiers GET proxy error:", err.message);
    return NextResponse.json(
      { error: "Failed to fetch tiers." },
      { status: 500 },
    );
  }
}

export async function PUT(req) {
  try {
    const res = new NextResponse();
    const { accessToken } = await getAccessToken(req, res);
    const body = await req.json();

    const backendRes = await fetch(`${API_URL}/api/tiers`, {
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
    console.error("Tiers PUT proxy error:", err.message);
    return NextResponse.json(
      { error: "Failed to update tiers." },
      { status: 500 },
    );
  }
  
}

export async function POST(req) {
  try {
    const res = new NextResponse();
    const { accessToken } = await getAccessToken(req, res);
    const body = await req.json();

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop(); 
    // gets 'potential', 'active', etc.

    const backendRes = await fetch(`${API_URL}/api/tiers/${path}`, {
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
    console.error("Tiers POST proxy error:", err.message);
    return NextResponse.json(
      { error: "Failed to create tier." },
      { status: 500 },
    );
  }
}