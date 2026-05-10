import { getAccessToken, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const GET = withApiAuthRequired(async function GET(req, { params }) {
  const res = new NextResponse();
  const { accessToken } = await getAccessToken(req, res);
  const path = params.path?.join("/") || "";

  const backendRes = await fetch(`${API_URL}/api/accounting/${path}${new URL(req.url).search}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return NextResponse.json(await backendRes.json(), { status: backendRes.status });
});