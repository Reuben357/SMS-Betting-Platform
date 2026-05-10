import { getAccessToken } from "@auth0/nextjs-auth0";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Handles multipart/form-data (file uploads) correctly.

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes — Next.js route timeout

export async function POST(req) {
  try {
    const res = new NextResponse();
    const { accessToken } = await getAccessToken(req, res);
    const formData = await req.formData();

    const backendRes = await fetch(`${API_URL}/api/uploads/csv`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
      signal: AbortSignal.timeout(280000), // 4m40s — under the 5min route limit
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("CSV upload proxy error:", err.message);
    return NextResponse.json(
      {
        error: err.message.includes("timeout")
          ? "Upload timed out. Try a smaller file or split it."
          : "Upload failed. Please try again.",
      },
      { status: 500 },
    );
  }
}
