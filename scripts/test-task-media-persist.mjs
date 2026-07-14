/**
 * Upload images → complete task with media → manager must see paths in GET /api/tasks
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";
const GPS = { gpsLat: 31.6688, gpsLng: 34.5743 };

function parseCookies(res) {
  return (res.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
}

async function login(phone, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`login ${phone}: ${data.error}`);
  return { cookie: parseCookies(res), data };
}

async function api(path, cookie, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      ...options.headers,
    },
  });
  const data = res.headers.get("content-type")?.includes("json") ? await res.json() : await res.text();
  return { status: res.status, ok: res.ok, data };
}

function tinyPng() {
  const b64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  return Buffer.from(b64, "base64");
}

async function uploadImage(cookie, entityId, name) {
  const form = new FormData();
  form.append("file", new Blob([tinyPng()], { type: "image/png" }), name);
  form.append("module", "tasks");
  form.append("entityId", entityId);
  form.append("kind", "image");
  const res = await fetch(`${BASE}/api/storage/upload`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`upload: ${data.error}`);
  return { path: data.path, kind: "image", mimeType: data.mimeType || "image/png" };
}

async function main() {
  const owner = await login("0500000000", "1234");
  const emp = await login("0542222222", "1234");
  const me = await api("/api/auth/me", emp.cookie);
  const assigneeId = me.data.employeeId;
  const today = new Date().toISOString().slice(0, 10);

  // Ensure on shift
  const att = await api(
    `/api/attendance?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`,
    emp.cookie
  );
  if (!att.data.openToday) {
    await api("/api/attendance", emp.cookie, {
      method: "POST",
      body: JSON.stringify({ action: "check_in", ...GPS }),
    });
  }

  const created = await api("/api/tasks", owner.cookie, {
    method: "POST",
    body: JSON.stringify({
      customerName: "בדיקת מדיה מנהל",
      settlement: "אשקלון",
      plotName: "1",
      material: "בדיקה",
      plannedQuantity: 5,
      quantityUnitUi: "DUNAM",
      assigneeId,
      workDate: today,
      workTime: "10:00",
    }),
  });
  if (!created.ok) throw new Error(JSON.stringify(created.data));
  const taskId = created.data.id;
  console.log("task", taskId);

  const start = await api("/api/tasks", emp.cookie, {
    method: "PATCH",
    body: JSON.stringify({ id: taskId, action: "start" }),
  });
  if (!start.ok) throw new Error(`start: ${JSON.stringify(start.data)}`);

  const m1 = await uploadImage(emp.cookie, taskId, "a.png");
  const m2 = await uploadImage(emp.cookie, taskId, "b.png");
  console.log("uploaded", m1.path, m2.path);

  const complete = await api("/api/tasks", emp.cookie, {
    method: "PATCH",
    body: JSON.stringify({
      id: taskId,
      action: "complete",
      reportedQuantity: 5,
      actualNotes: "עם תמונות",
      media: [m1, m2],
    }),
  });
  console.log("complete status", complete.status);
  console.log("complete media", complete.data.media);
  console.log("complete actualNotes snippet", String(complete.data.actualNotes || "").slice(0, 300));

  const managerView = await api(
    `/api/tasks?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`,
    owner.cookie
  );
  const found = (managerView.data || []).find((t) => t.id === taskId);
  console.log("manager media", found?.media);
  console.log("manager photoUrls", found?.photoUrls);

  const sign = await api("/api/storage/signed-urls", owner.cookie, {
    method: "POST",
    body: JSON.stringify({ paths: [m1.path, m2.path] }),
  });
  console.log("manager signed keys", Object.keys(sign.data.urls || {}));
  console.log("manager signed ok", Boolean(sign.data.urls?.[m1.path] && sign.data.urls?.[m2.path]));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
