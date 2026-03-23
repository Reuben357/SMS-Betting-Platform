import { getAccessToken } from "@auth0/nextjs-auth0";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const res = new NextResponse();
    const { accessToken } = await getAccessToken(req, res);
    return NextResponse.json({ accessToken });
  } catch (err) {
    console.error("Access token error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
