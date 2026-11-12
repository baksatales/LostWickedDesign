export const SAMPLE_SESSION_KEY = "baksa-sample-account-session";

export async function submitSampleCorporateEnquiry(input: {
  purpose: string; qty: number; budgetPaise: number; neededBy: string; name: string; company: string; contact: string;
}) {
  const response = await fetch("/api/sample/corporate/enquiries", {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({})) as { ref?: string; error?: string };
  if (!response.ok || !payload.ref) throw new Error(payload.error || "Your sample brief was not saved.");
  return { ref: payload.ref };
}

export async function sampleApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token: string | null = null;
  try {
    token = localStorage.getItem(SAMPLE_SESSION_KEY);
  } catch {
    throw new Error("Sample workspace storage is unavailable.");
  }
  if (!token) throw new Error("Sign in to the isolated sample workspace before saving.");

  const response = await fetch(`/api${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(payload.error || "The sample workspace could not save this change.");
  return payload as T;
}
