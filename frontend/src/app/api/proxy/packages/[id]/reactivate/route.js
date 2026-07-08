import { auth0 } from "@/lib/auth0";
import { NextResponse } from 'next/server';

const API_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://backend:5000";

export async function PUT(req, { params }) {
  try {
    //
    const { token: accessToken } = await auth0.getAccessToken({req});
    const { id } = await params;
    const backendRes = await fetch(
      `${API_URL}/api/packages/${id}/reactivate`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}