import { prisma } from "./prisma";
import { getSessionUser } from "./auth";

type OrgCache = { org: Awaited<ReturnType<typeof fetchOrg>>; expiresAt: number };
let orgCache: OrgCache | null = null;
const ORG_CACHE_MS = 60_000;

async function fetchOrg() {
  const org = await prisma.organization.findFirst({ where: { isActive: true } });
  if (!org) throw new Error("לא נמצאה ארגון במערכת. הרץ: npm run db:setup");
  return org;
}

/** Cached active org — avoids repeated DB hits on every API call (60s TTL). */
export async function getDefaultOrg() {
  const now = Date.now();
  if (orgCache && orgCache.expiresAt > now) return orgCache.org;
  const org = await fetchOrg();
  orgCache = { org, expiresAt: now + ORG_CACHE_MS };
  return org;
}

export function invalidateOrgCache() {
  orgCache = null;
}

export async function getDefaultUser() {
  const user = await prisma.user.findFirst({ where: { isActive: true } });
  if (!user) throw new Error("לא נמצא משתמש במערכת");
  return user;
}

export async function getCurrentUser() {
  const sessionUser = await getSessionUser();
  if (sessionUser) return sessionUser;
  return getDefaultUser();
}
