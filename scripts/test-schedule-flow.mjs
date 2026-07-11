/**
 * E2E flow test: manager creates schedule → employee starts/completes → manager sees update
 * Run: node scripts/test-schedule-flow.mjs
 */
const BASE = process.env.BASE_URL || "http://localhost:3001";

const ROUTES = [
  "/employee",
  "/employee/schedule",
  "/employee/history",
  "/employee/my-attendance",
  "/employee/attendance",
  "/employee/profile",
  "/employee/reports",
  "/employee/machinery",
  "/schedule",
  "/mobile",
  "/mobile/tasks",
];

function parseCookies(res) {
  const raw = res.headers.getSetCookie?.() || [];
  return raw.map((c) => c.split(";")[0]).join("; ");
}

async function login(phone, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed ${phone}: ${data.error || res.status}`);
  return { cookie: parseCookies(res), user: data };
}

async function get(path, cookie) {
  const res = await fetch(`${BASE}${path}`, { headers: cookie ? { Cookie: cookie } : {} });
  const text = await res.text();
  return { status: res.status, ok: res.ok, text };
}

async function api(path, cookie, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...options.headers,
    },
  });
  const data = res.headers.get("content-type")?.includes("json") ? await res.json() : await res.text();
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  const results = [];
  const pass = (name, detail = "") => results.push({ name, ok: true, detail });
  const fail = (name, detail = "") => results.push({ name, ok: false, detail });

  console.log(`\n=== Schedule Flow E2E @ ${BASE} ===\n`);

  // Health
  try {
    const h = await api("/api/health");
    if (h.ok) pass("API health");
    else fail("API health", String(h.status));
  } catch (e) {
    fail("API health", e.message);
    console.error("Server not reachable. Start with: npm run dev");
    process.exit(1);
  }

  // Routes (HTML pages)
  const owner = await login("0500000000", "1234");
  pass("Owner login");

  for (const route of ROUTES) {
    const r = await get(route, owner.cookie);
    if (r.ok || (route.startsWith("/mobile") && [200, 307, 308].includes(r.status))) {
      pass(`Route ${route}`, `status ${r.status}`);
    } else {
      fail(`Route ${route}`, `status ${r.status}`);
    }
  }

  // Lookup employees
  const lookup = await api("/api/lookup", owner.cookie);
  const employees = lookup.data?.employees || [];
  const ahmad = employees.find((e) => e.firstName?.includes("אחמד") || e.firstName?.includes("מןחמד") || e.lastName?.includes("אבוליל"));
  const assignee = ahmad || employees.find((e) => e.firstName) || employees[0];
  if (!assignee) {
    fail("Find employee");
    printResults(results);
    process.exit(1);
  }
  pass("Find employee", `${assignee.firstName} ${assignee.lastName} (${assignee.id})`);

  // Manager creates schedule
  const now = new Date();
  const workDate = now.toISOString().slice(0, 10);
  const create = await api("/api/tasks", owner.cookie, {
    method: "POST",
    body: JSON.stringify({
      workDate,
      workTime: "08:00",
      customerName: `בדיקת זרימה ${Date.now()}`,
      settlement: "אשקלון",
      workType: "ריסוס",
      assigneeId: assignee.id,
      notes: "בדיקה אוטומטית",
      plannedQuantity: 1,
    }),
  });
  if (!create.ok) {
    fail("Manager create schedule", JSON.stringify(create.data));
    printResults(results);
    process.exit(1);
  }
  const taskId = create.data.id;
  pass("Manager create schedule", taskId);

  // Employee login
  const employee = await login("0542222222", "1234");
  pass("Employee login");

  // Employee sees schedule
  const mine = await api(
    `/api/tasks?mine=1&year=${now.getFullYear()}&month=${now.getMonth() + 1}&statuses=ASSIGNED,IN_PROGRESS`,
    employee.cookie
  );
  const found = Array.isArray(mine.data) && mine.data.some((t) => t.id === taskId);
  if (!found) fail("Employee sees schedule", `task ${taskId} not in list`);
  else pass("Employee sees schedule");

  // Start work
  const start = await api("/api/tasks", employee.cookie, {
    method: "PATCH",
    body: JSON.stringify({ id: taskId, action: "start" }),
  });
  if (!start.ok || start.data.status !== "IN_PROGRESS") fail("Employee start work", JSON.stringify(start.data));
  else pass("Employee start work", start.data.startedAt || "IN_PROGRESS");

  // Complete work
  const complete = await api("/api/tasks", employee.cookie, {
    method: "PATCH",
    body: JSON.stringify({
      id: taskId,
      action: "complete",
      actualNotes: "בדיקה אוטומטית — עבודה הושלמה",
      photoUrls: [],
    }),
  });
  if (!complete.ok || complete.data.status !== "COMPLETED") fail("Employee complete work", JSON.stringify(complete.data));
  else pass("Employee complete work");

  // Manager sees update
  const all = await api(`/api/tasks?year=${now.getFullYear()}&month=${now.getMonth() + 1}`, owner.cookie);
  const updated = Array.isArray(all.data) && all.data.find((t) => t.id === taskId);
  if (!updated || updated.status !== "COMPLETED") {
    fail("Manager sees completion", updated ? updated.status : "not found");
  } else {
    pass("Manager sees completion", `status=${updated.status}, notes=${updated.employeeNotes || updated.session?.employeeNotes || "ok"}`);
  }

  if (updated?.startedAt) pass("Manager sees start time", updated.startedAt);
  else if (updated?.session?.startedAt) pass("Manager sees start time", updated.session.startedAt);

  printResults(results);
  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
}

function printResults(results) {
  console.log("\n--- Results ---");
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  const ok = results.filter((r) => r.ok).length;
  console.log(`\n${ok}/${results.length} passed\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
