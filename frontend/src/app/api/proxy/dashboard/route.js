import { auth0 } from '@/lib/auth0';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const API_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://backend:5000';

/**
 * GET /api/proxy/dashboard
 * Proxies dashboard data from the backend API.
 * Adds the user's Auth0 access token to the request headers.
 */
export async function GET(req) {
  try {
    const { token: accessToken } = await auth0.getAccessToken({ req });

    const backendRes = await fetch(`${API_URL}/api/dashboard`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Cache-Control': 'no-store',
      },
      cache: 'no-store',
    });

    const rawBody = await backendRes.text();
    let data;
    try {
      data = JSON.parse(rawBody);
    } catch (parseErr) {
      logger.error(
          { status: backendRes.status, bodySnippet: rawBody.slice(0, 300) },
          'Dashboard proxy: backend response was not valid JSON',
      );
      return NextResponse.json({ error: 'Failed to fetch dashboard data.' }, { status: 502 });
    }

    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
   logger.error({ err }, 'Dashboard proxy error');
    return NextResponse.json({ error: 'Failed to fetch dashboard data.' }, { status: 500 });
  }
}