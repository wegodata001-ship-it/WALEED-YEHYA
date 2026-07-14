/**
 * Permission E2E: absolute separation manager ↔ employee
 * Run: BASE_URL=http://localhost:3001 node scripts/test-permissions.mjs
 */
const BASE = process.env.BASE_URL || "http://localhost:3001";

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

async function headRedirect(path, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  return {
    status: res.status,
    location: res.headers.get("location") || "",
  };
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

function isEmployeeRedirect(status, location) {
  if (status !== 307 && status !== 308) return false;
  try {
    const path = location.startsWith("http") ? new URL(location).pathname : location;
    return path === "/employee" || path.startsWith("/employee/");
  } catch {
    return location.includes("/employee");
  }
}

function isManagerHomeRedirect(status, location) {
  if (status !== 307 && status !== 308) return false;
  try {
    const path = location.startsWith("http") ? new URL(location).pathname : location;
    return path === "/";
  } catch {
    return location.endsWith("/") && !location.includes("/employee");
  }
}

async function main() {
  console.log(`\n=== Permissions E2E @ ${BASE} ===\n`);

  const emp = await login("0542222222", "1234");
  pass("Employee login");
  if (emp.user.redirectTo === "/employee") pass("Employee redirectTo /employee");
  else fail("Employee redirectTo /employee", String(emp.user.redirectTo));

  const mgr = await login("0500000000", "1234");
  pass("Manager login");
  if (mgr.user.redirectTo === "/") pass("Manager redirectTo /");
  else fail("Manager redirectTo /", String(mgr.user.redirectTo));

  for (const path of ["/employee", "/employee/schedule"]) {
    const r = await fetch(`${BASE}${path}`, { headers: { Cookie: emp.cookie }, redirect: "manual" });
    if (r.status === 200) pass(`Employee page ${path}`, "200");
    else fail(`Employee page ${path}`, String(r.status));
  }

  for (const path of ["/", "/finance", "/employees", "/customers", "/schedule", "/machinery", "/fleet", "/operations"]) {
    const r = await headRedirect(path, emp.cookie);
    if (isEmployeeRedirect(r.status, r.location)) pass(`Block employee→manager ${path}`, `${r.status} ${r.location}`);
    else fail(`Block employee→manager ${path}`, `${r.status} ${r.location}`);
  }

  for (const path of ["/employee", "/employee/schedule", "/employee/fuel", "/mobile", "/mobile/fuel"]) {
    const r = await headRedirect(path, mgr.cookie);
    if (isManagerHomeRedirect(r.status, r.location)) pass(`Block manager→employee ${path}`, `${r.status} ${r.location}`);
    else fail(`Block manager→employee ${path}`, `${r.status} ${r.location}`);
  }

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

  for (const [method, path] of [
    ["GET", "/api/dashboard"],
    ["GET", "/api/employees"],
    ["GET", `/api/tasks?year=${now.getFullYear()}&month=${now.getMonth() + 1}`],
  ]) {
    const r = await api(path, mgr.cookie, { method });
    if (r.ok || r.status === 200) pass(`Manager ${method} ${path.split("?")[0]}`, String(r.status));
    else fail(`Manager ${method} ${path.split("?")[0]}`, String(r.status));
  }

  const mgrHome = await fetch(`${BASE}/`, { headers: { Cookie: mgr.cookie }, redirect: "manual" });
  if (mgrHome.status === 200) pass("Manager GET /", "200");
  else fail("Manager GET /", String(mgrHome.status));

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
