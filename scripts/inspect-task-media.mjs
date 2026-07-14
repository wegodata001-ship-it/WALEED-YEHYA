const BASE = process.env.BASE_URL || "http://localhost:3000";

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
  return { cookie: parseCookies(res), data: await res.json(), ok: res.ok };
}

async function main() {
  const owner = await login("0500000000", "1234");
  if (!owner.ok) throw new Error("login failed");
  const now = new Date();
  const res = await fetch(
    `${BASE}/api/tasks?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
    { headers: { Cookie: owner.cookie } }
  );
  const tasks = await res.json();
  const completed = (Array.isArray(tasks) ? tasks : []).filter((t) => t.status === "COMPLETED");
  console.log("completed count", completed.length);
  for (const t of completed.slice(0, 8)) {
    console.log("---");
    console.log({
      id: t.id,
      customer: t.customerName,
      mediaLen: t.media?.length ?? 0,
      media: t.media,
      photoUrls: t.photoUrls,
      notesSnippet: String(t.actualNotes || "").slice(0, 250),
    });
  }

  const withMedia = completed.find((t) => (t.media && t.media.length) || (t.photoUrls && t.photoUrls.length));
  if (withMedia) {
    const paths = (withMedia.media || []).map((m) => m.path);
    console.log("\nSigning paths:", paths);
    const sign = await fetch(`${BASE}/api/storage/signed-urls`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: owner.cookie },
      body: JSON.stringify({ paths }),
    });
    const signData = await sign.json();
    console.log("signed status", sign.status, signData);
  } else {
    console.log("\nNo completed task with media this month");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
