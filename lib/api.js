import { supabaseClient } from "./supabaseClient";

export async function api(url, options) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const headers = { "Content-Type": "application/json", ...(options?.headers || {}) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  const res = await fetch(url, {
    ...options,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Une erreur est survenue.");
  return data;
}
