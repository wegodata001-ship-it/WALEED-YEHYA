/**
 * Storage API smoke test — login, upload image, signed URL, delete.
 * Usage: node scripts/test-storage-flow.mjs [baseUrl]
 */
const BASE = process.argv[2] || "http://localhost:3000";

async function login(phone, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  const data = await res.json();
  const cookie = res.headers.getSetCookie?.()?.map((c) => c.split(";")[0]).join("; ")
    || res.headers.get("set-cookie")?.split(";")[0];
  if (!res.ok || !cookie) throw new Error(`Login failed: ${data.error || res.status}`);
  return cookie;
}

function tinyPngBuffer() {
  // 1x1 red PNG
  const b64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  return Buffer.from(b64, "base64");
}

async function main() {
  const results = [];
  const ok = (name) => results.push({ name, pass: true });
  const fail = (name, err) => results.push({ name, pass: false, err: String(err) });

  try {
    const cookie = await login("0542222222", "1234");
    ok("employee login");

    const png = tinyPngBuffer();
    const form = new FormData();
    form.append("file", new Blob([png], { type: "image/png" }), "test.png");
    form.append("module", "tasks");
    form.append("entityId", "test-task-" + Date.now());
    form.append("kind", "image");

    const uploadRes = await fetch(`${BASE}/api/storage/upload`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: form,
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.path) {
      throw new Error(uploadData.error || "upload failed");
    }
    ok("image upload to photo-buc");
    console.log("  path:", uploadData.path);

    const signRes = await fetch(`${BASE}/api/storage/signed-urls`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ paths: [uploadData.path] }),
    });
    const signData = await signRes.json();
    if (!signRes.ok || !signData.urls?.[uploadData.path]) {
      throw new Error(signData.error || "signed url failed");
    }
    ok("signed URL generation");

    const delRes = await fetch(`${BASE}/api/storage/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ paths: [uploadData.path] }),
    });
    const delData = await delRes.json();
    if (!delRes.ok) throw new Error(delData.error || "delete failed");
    ok("delete uploaded file");
  } catch (e) {
    fail("storage flow", e);
  }

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  console.log("\n--- Storage test results ---");
  for (const r of results) {
    console.log(r.pass ? `✓ ${r.name}` : `✗ ${r.name}: ${r.err}`);
  }
  console.log(`\n${passed}/${total} passed`);
  process.exit(passed === total ? 0 : 1);
}

main();
