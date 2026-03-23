import { handleLogout } from '@auth0/nextjs-auth0';

export async function GET(req) {
  try {
    return await handleLogout(req);
  } catch (err) {
    return new Response(err.message, { status: err.status ?? 500 });
  }
}