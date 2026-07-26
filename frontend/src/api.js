const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function fetchStatus() {
  const res = await fetch(`${BASE_URL}/status`);

  if (!res.ok) {
    throw new Error(`API Error ${res.status}`);
  }

  return await res.json();
}

export async function pingCustomService(name, url) {
  const params = new URLSearchParams({ name, url });

  const res = await fetch(`${BASE_URL}/ping?${params}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Ping failed");
  }

  return await res.json();
}