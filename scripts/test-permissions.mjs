/**
 * Permission E2E: employee blocked from manager routes/APIs, manager full access
 * Run: node scripts/test-permissions.mjs
 */
const BASE = process.env.BASE_URL || "http://localhost:3003";

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
  if (!res.ok) throw new Error(`Login ${phone}: ${data.error}`);
  return { cookie: parseCookies(res), user: data };
}

async function get(path, cookie, redirect = "manual") {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookie }, redirect });
  return { status: res.status, ok: res.ok, url: res.url };
}

async function api(path, cookie, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Cookie: cookie, ...options.headers },
    redirect: "manual",
  });
  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("json")) data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

const results = [];
const pass = (n, d = "") => results.push({ n, ok: true, d });
const fail = (n, d = "") => results.push({ n, ok: false, d });

async function main() {
  console.log(`\n=== Permissions E2E @ ${BASE} ===\n`);

  const emp = await login("0542222222", "1234");
  pass("Employee login");

  const mgr = await login("0500000000", "1234");
  pass("Manager login");

  // Employee pages
  for (const [path, expect] of [
    ["/employee", 200],
    ["/employee/schedule", 200],
  ]) {
    const r = await get(path, emp.cookie);
    if (r.status === expect) pass(`Employee page ${path}`, String(expect));
    else fail(`Employee page ${path}`, `got ${r.status}`);
  }

  // Employee blocked from manager pages (redirect to /employee)
  for (const path of ["/", "/finance", "/employees", "/customers", "/schedule", "/machinery", "/fleet"]) {
    const r = await get(path, emp.cookie);
    if (r.status === 307 || r.status === 308 || r.url.includes("/employee")) pass(`Block page ${path}`, `redirect ${r.status}`);
    else fail(`Block page ${path}`, `status ${r.status} url ${r.url}`);
  }

  // Employee blocked APIs
  const blocked = [
    ["GET", "/api/dashboard"],
    ["GET", "/api/employees"],
    ["GET", "/api/farmers"],
    ["POST", "/api/farmers", { firstName: "x", lastName: "y" }],
    ["GET", "/api/tasks?year=2026&month=7"],
    ["POST", "/api/tasks", { assigneeId: "x", customerName: "test" }],
    ["GET", "/api/reports/employees?year=2026&month=7"],
    ["GET", "/api/export"],
  ];

  for (const [method, path, body] of blocked) {
    const r = await api(path, emp.cookie, { method, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 403) pass(`Block API ${method} ${path.split("?")[0]}`, "403");
    else fail(`Block API ${method} ${path.split("?")[0]}`, String(r.status));
  }

  // Employee allowed APIs
  const now = new Date();
  const allowed = [
    ["GET", `/api/auth/me`],
    ["GET", `/api/tasks?mine=1&year=${now.getFullYear()}&month=${now.getMonth() + 1}`],
    ["GET", `/api/attendance?year=${now.getFullYear()}&month=${now.getMonth() + 1}`],
    ["GET", "/api/lookup"],
  ];
  for (const [method, path] of allowed) {
    const r = await api(path, emp.cookie, { method });
    if (r.ok) pass(`Allow API ${method} ${path.split("?")[0]}`, String(r.status));
    else fail(`Allow API ${method} ${path.split("?")[0]}`, String(r.status));
  }

  // Manager full access
  for (const [method, path] of [
    ["GET", "/api/dashboard"],
    ["GET", "/api/employees"],
    ["GET", `/api/tasks?year=${now.getFullYear()}&month=${now.getMonth() + 1}`],
    ["GET", "/"],
  ]) {
    const r = method === "GET" && path === "/"
      ? await get(path, mgr.cookie)
      : await api(path, mgr.cookie, { method });
    const ok = path === "/" ? r.status === 200 : r.ok || r.status === 200;
    if (ok) pass(`Manager ${method} ${path.split("?")[0]}`, String(r.status));
    else fail(`Manager ${method} ${path.split("?")[0]}`, String(r.status));
  }

  console.log("\n--- Results ---");
  for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.n}${r.d ? ` — ${r.d}` : ""}`);
  const ok = results.filter((r) => r.ok).length;
  console.log(`\n${ok}/${results.length} passed\n`);
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
