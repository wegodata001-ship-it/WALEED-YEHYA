const QUEUE_KEY = "wyg-erp-offline-queue";

export type OfflineItem = {
  id: string;
  type: "machinery" | "fuel" | "attendance";
  payload: Record<string, unknown>;
  createdAt: string;
};

export function getOfflineQueue(): OfflineItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addToOfflineQueue(item: Omit<OfflineItem, "createdAt">) {
  const queue = getOfflineQueue();
  queue.push({ ...item, createdAt: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function removeFromOfflineQueue(id: string) {
  const queue = getOfflineQueue().filter((i) => i.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const queue = getOfflineQueue();
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    const endpoint =
      item.type === "machinery"
        ? "/api/machinery"
        : item.type === "fuel"
          ? "/api/fuel"
          : "/api/attendance";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item.payload, clientId: item.id }),
      });
      if (res.ok) {
        removeFromOfflineQueue(item.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}
