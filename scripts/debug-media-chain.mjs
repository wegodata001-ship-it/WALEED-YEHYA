/**
 * Full media chain debug for manager viewing.
 * BASE_URL=http://localhost:3000 node scripts/debug-media-chain.mjs
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

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
  if (!res.ok) throw new Error(`login: ${data.error || res.status}`);
  return parseCookies(res);
}

async function main() {
  const cookie = await login("0500000000", "1234");
  const now = new Date();
  const tasksRes = await fetch(
    `${BASE}/api/tasks?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
    { headers: { Cookie: cookie } }
  );
  const tasks = await tasksRes.json();
  const withMedia = (Array.isArray(tasks) ? tasks : []).filter(
    (t) => Array.isArray(t.media) && t.media.length > 0
  );
  console.log("tasks with media:", withMedia.length);
  if (!withMedia.length) {
    console.log("No media tasks — create one via employee UI first");
    process.exit(1);
  }

  const task = withMedia[0];
  console.log("\n=== DB path (step 2) ===");
  console.log(
    JSON.stringify(
      {
        id: task.id,
        customer: task.customerName,
        media: task.media,
        photoUrls: task.photoUrls,
      },
      null,
      2
    )
  );

  const paths = task.media.map((m) => m.path);
  console.log("\n=== Signed URL API (step 3) ===");
  const signRes = await fetch(`${BASE}/api/storage/signed-urls`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ paths }),
  });
  const signData = await signRes.json();
  console.log("status", signRes.status);
  console.log("raw keys", Object.keys(signData));
  console.log("urls keys", Object.keys(signData.urls || {}));
  for (const p of paths) {
    const u = signData.urls?.[p];
    console.log("\npath:", p);
    console.log("  hasUrl:", Boolean(u));
    console.log("  urlPrefix:", u ? String(u).slice(0, 120) : "(missing)");
    if (u) {
      const imgRes = await fetch(u, { method: "GET", redirect: "follow" });
      console.log("  GET image status:", imgRes.status, imgRes.headers.get("content-type"));
      if (!imgRes.ok) {
        const body = await imgRes.text();
        console.log("  body:", body.slice(0, 200));
      } else {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        console.log("  bytes:", buf.length, "png/jpeg?", buf[0], buf[1]);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
