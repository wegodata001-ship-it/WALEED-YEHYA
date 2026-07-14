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
  if (!res.ok) throw new Error(data.error || res.status);
  return parseCookies(res);
}

async function main() {
  const cookie = await login("0500000000", "1234");
  const now = new Date();
  const tasks = await (
    await fetch(`${BASE}/api/tasks?year=${now.getFullYear()}&month=${now.getMonth() + 1}`, {
      headers: { Cookie: cookie },
    })
  ).json();
  const task = (tasks || []).find((t) => t.media?.length);
  if (!task) throw new Error("no media task");
  const path = task.media[0].path;
  console.log("DB path:", path);

  const proxyUrl = `${BASE}/api/storage/media?path=${encodeURIComponent(path)}`;
  console.log("proxy:", proxyUrl);
  const res = await fetch(proxyUrl, { headers: { Cookie: cookie } });
  console.log("proxy status", res.status, res.headers.get("content-type"));
  const buf = Buffer.from(await res.arrayBuffer());
  console.log("bytes", buf.length, "png?", buf[0] === 0x89 && buf[1] === 0x50);
  if (!res.ok) console.log("body", buf.toString("utf8").slice(0, 200));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
