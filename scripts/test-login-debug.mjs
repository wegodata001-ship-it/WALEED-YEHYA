/**
 * Login + CSS smoke test after rollback
 */
const BASE = process.env.BASE_URL || "http://localhost:3004";

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
  const setCookie = res.headers.get("set-cookie") || parseCookies(res);
  return { status: res.status, ok: res.ok, data, cookie: parseCookies(res), setCookie };
}

async function main() {
  console.log(`\n=== Login Debug @ ${BASE} ===\n`);

  // 1. Login page CSS
  const loginPage = await fetch(`${BASE}/login`);
  const html = await loginPage.text();
  const hasCss = html.includes("_next/static") && html.includes("stylesheet");
  const hasTailwindVars = html.includes("primary") || html.includes("field-input");
  console.log(`GET /login → ${loginPage.status}`);
  console.log(`  CSS chunks in HTML: ${hasCss ? "YES" : "NO"}`);
  console.log(`  Styled classes present: ${hasTailwindVars ? "YES" : "NO"}`);

  // 2. Login API public (no cookie)
  const mgr = await login("0500000000", "1234");
  console.log(`\nManager POST /api/auth/login → ${mgr.status}`);
  console.log(`  redirectTo: ${mgr.data?.redirectTo}`);
  console.log(`  Cookie set: ${mgr.cookie ? "YES (" + mgr.cookie.slice(0, 40) + "...)" : "NO"}`);
  if (!mgr.ok) console.log(`  ERROR: ${JSON.stringify(mgr.data)}`);

  if (mgr.ok && mgr.cookie) {
    const home = await fetch(`${BASE}/`, { headers: { Cookie: mgr.cookie }, redirect: "manual" });
    const homeHtml = await home.text();
    console.log(`\nManager GET / after login → ${home.status}`);
    console.log(`  app-toolbar in page: ${homeHtml.includes("app-toolbar") ? "YES" : "NO"}`);
    console.log(`  CSS in page: ${homeHtml.includes("stylesheet") ? "YES" : "NO"}`);

    const dash = await fetch(`${BASE}/api/dashboard`, { headers: { Cookie: mgr.cookie } });
    console.log(`Manager GET /api/dashboard → ${dash.status}`);
  }

  const emp = await login("0542222222", "1234");
  console.log(`\nEmployee POST /api/auth/login → ${emp.status}`);
  console.log(`  redirectTo: ${emp.data?.redirectTo}`);
  console.log(`  Cookie set: ${emp.cookie ? "YES" : "NO"}`);
  if (!emp.ok) console.log(`  ERROR: ${JSON.stringify(emp.data)}`);

  if (emp.ok && emp.cookie) {
    const ep = await fetch(`${BASE}/employee`, { headers: { Cookie: emp.cookie } });
    const epHtml = await ep.text();
    console.log(`\nEmployee GET /employee → ${ep.status}`);
    console.log(`  CSS in page: ${epHtml.includes("stylesheet") ? "YES" : "NO"}`);

    const tasks = await fetch(`${BASE}/api/tasks?mine=1&year=2026&month=7`, { headers: { Cookie: emp.cookie } });
    console.log(`Employee GET /api/tasks?mine=1 → ${tasks.status}`);
  }

  const ok = mgr.ok && emp.ok && hasCss;
  console.log(ok ? "\n✓ Login + CSS checks PASSED\n" : "\n✗ Some checks FAILED\n");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
