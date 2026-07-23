const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export async function fetchStatus() {
  const res = await fetch(`${BASE_URL}/api/status`);

  if (!res.ok) {
    throw new Error(`API Error ${res.status}`);
  }

  return await res.json();
}

export async function pingCustomService(name, url) {
  const params = new URLSearchParams({
    name,
    url,
  });

  const res = await fetch(`${BASE_URL}/api/ping?${params}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Ping failed");
  }

  return await res.json();
}