/** Fetch JSON with AbortSignal; returns null if aborted. */
export async function fetchJsonAbortable<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit & { signal?: AbortSignal }
): Promise<{ ok: boolean; status: number; data: T } | null> {
  try {
    const res = await fetch(input, init);
    if (init?.signal?.aborted) return null;
    const data = (await res.json()) as T;
    if (init?.signal?.aborted) return null;
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return null;
    if (init?.signal?.aborted) return null;
    throw e;
  }
}
