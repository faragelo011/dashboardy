const apiBase = () => {
  const base = process.env.API_PUBLIC_URL ?? process.env.NEXT_PUBLIC_API_PUBLIC_URL;
  if (!base) {
    throw new Error("API_PUBLIC_URL or NEXT_PUBLIC_API_PUBLIC_URL must be set");
  }
  return base.replace(/\/$/, "");
};

const DEFAULT_ME_TIMEOUT_MS = 5000;

/** Server-side GET /me using the caller's Supabase access token. */
export async function fetchMe(accessToken: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = DEFAULT_ME_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiBase()}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
