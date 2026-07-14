/**
 * Business rule: start task requires open shift; checkout blocked while IN_PROGRESS.
 * Run: node scripts/test-shift-gate.mjs
 * BASE_URL=http://localhost:3000 node scripts/test-shift-gate.mjs
 */
const BASE = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const GPS = { gpsLat: 31.6688, gpsLng: 34.5743 };

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

async function ensureNoOpenShift(empCookie) {
  const now = new Date();
  const att = await api(
    `/api/attendance?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
    empCookie
  );
  if (!att.data?.openToday) return;

  // Complete any IN_PROGRESS tasks first
  const tasks = await api(
    `/api/tasks?mine=1&year=${now.getFullYear()}&month=${now.getMonth() + 1}&statuses=IN_PROGRESS`,
    empCookie
  );
  for (const t of Array.isArray(tasks.data) ? tasks.data : []) {
    await api("/api/tasks", empCookie, {
      method: "PATCH",
      body: JSON.stringify({
        id: t.id,
        action: "complete",
        reportedQuantity: Number(t.plannedQuantity || 1),
        actualNotes: "cleanup shift-gate test",
      }),
    });
  }

  await api("/api/attendance", empCookie, {
    method: "POST",
    body: JSON.stringify({ action: "check_out", ...GPS }),
  });
}

async function main() {
  const results = [];
  const pass = (name, detail = "") => results.push({ name, ok: true, detail });
  const fail = (name, detail = "") => results.push({ name, ok: false, detail });

  console.log(`\n=== Shift Gate E2E @ ${BASE} ===\n`);

  try {
    const h = await api("/api/health");
    if (!h.ok) throw new Error(`health ${h.status}`);
  } catch (e) {
    console.error("Server not reachable:", e.message);
    process.exit(1);
  }

  const owner = await login("0500000000", "1234");
  const emp = await login("0542222222", "1234");
  pass("Logins");

  // Clean slate: no open shift
  await ensureNoOpenShift(emp.cookie);
  pass("Cleanup: closed any open shift");

  // Lookup for creating a task
  const lookup = await api("/api/lookup", owner.cookie);
  const employeeId =
    lookup.data?.employees?.find((e) => e.firstName)?.id || lookup.data?.employees?.[0]?.id;
  if (!employeeId) {
    fail("Lookup employee", "no employees");
    printResults(results);
    process.exit(1);
  }

  // Resolve employee record id from auth me if present
  const me = await api("/api/auth/me", emp.cookie);
  const assigneeId = me.data?.employeeId || me.data?.user?.employeeId || employeeId;

  const createTask = async () => {
    const today = new Date().toISOString().slice(0, 10);
    return api("/api/tasks", owner.cookie, {
      method: "POST",
      body: JSON.stringify({
        customerName: "בדיקת שער משמרת",
        settlement: "אשקלון",
        plotName: "חלקה-בדיקה",
        material: "בדיקה",
        plannedQuantity: 10,
        quantityUnitUi: "DUNAM",
        assigneeId,
        workDate: today,
        workTime: "09:00",
        notes: "shift-gate test",
      }),
    });
  };

  // --- Scenario 1: no check-in → start blocked ---
  const t1 = await createTask();
  if (!t1.ok) {
    fail("Create task (s1)", JSON.stringify(t1.data));
  } else {
    const startBlocked = await api("/api/tasks", emp.cookie, {
      method: "PATCH",
      body: JSON.stringify({ id: t1.data.id, action: "start" }),
    });
    if (startBlocked.status === 409 && /משמרת/.test(startBlocked.data?.error || "")) {
      pass("Scenario 1: start without shift → 409", startBlocked.data.error);
    } else {
      fail(
        "Scenario 1: start without shift → 409",
        `got ${startBlocked.status} ${JSON.stringify(startBlocked.data)}`
      );
    }
  }

  // --- Scenario 2: check-in → start works ---
  const cin = await api("/api/attendance", emp.cookie, {
    method: "POST",
    body: JSON.stringify({ action: "check_in", ...GPS }),
  });
  if (!cin.ok && !/כבר|קיימת|פתוח/.test(cin.data?.error || "")) {
    // may already be open from race; try once more after ensure
    fail("Check-in", JSON.stringify(cin.data));
  } else {
    pass("Check-in for scenario 2");
  }

  const t2 = await createTask();
  const startOk = await api("/api/tasks", emp.cookie, {
    method: "PATCH",
    body: JSON.stringify({ id: t2.data.id, action: "start" }),
  });
  if (startOk.ok && startOk.data?.status === "IN_PROGRESS") {
    pass("Scenario 2: start with open shift → OK");
  } else {
    fail("Scenario 2: start with open shift → OK", JSON.stringify(startOk.data));
  }

  // --- Scenario 3: active task → checkout blocked ---
  const coutBlocked = await api("/api/attendance", emp.cookie, {
    method: "POST",
    body: JSON.stringify({ action: "check_out", ...GPS }),
  });
  if (coutBlocked.status === 409 && /משימה פעילה/.test(coutBlocked.data?.error || "")) {
    pass("Scenario 3: checkout with active task → 409", coutBlocked.data.error);
  } else {
    fail(
      "Scenario 3: checkout with active task → 409",
      `got ${coutBlocked.status} ${JSON.stringify(coutBlocked.data)}`
    );
  }

  // --- Scenario 4: complete task → checkout works ---
  const done = await api("/api/tasks", emp.cookie, {
    method: "PATCH",
    body: JSON.stringify({
      id: t2.data.id,
      action: "complete",
      reportedQuantity: 10,
      actualNotes: "shift-gate done",
    }),
  });
  if (!done.ok) {
    fail("Complete task before checkout", JSON.stringify(done.data));
  } else {
    pass("Complete active task");
  }

  const coutOk = await api("/api/attendance", emp.cookie, {
    method: "POST",
    body: JSON.stringify({ action: "check_out", ...GPS }),
  });
  if (coutOk.ok && coutOk.data?.checkOut) {
    pass("Scenario 4: checkout after task complete → OK");
  } else {
    fail("Scenario 4: checkout after task complete → OK", JSON.stringify(coutOk.data));
  }

  printResults(results);
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function printResults(results) {
  console.log("\n--- Results ---");
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
