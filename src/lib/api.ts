const BASE = import.meta.env.VITE_REALTIME_URL as string | undefined
if (!BASE) throw new Error('Missing VITE_REALTIME_URL')

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json() as Promise<T>
}
