const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Generic fetch wrapper – does NOT attach access token.
 * Use this only for public endpoints or when the token is not required.
 * For authenticated calls, use the proxy routes (which handle the token automatically).
 */
export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Request failed");
  }

  return res.json();
}

/**
 * Server‑side fetch wrapper that attaches an access token.
 * Use this inside server components or server actions.
 */
export async function apiAuthFetch(path, accessToken, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Request failed");
  }
  
  return res.json();
}
