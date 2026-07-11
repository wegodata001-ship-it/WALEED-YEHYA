import { prisma } from "./prisma";
import { getSessionUser } from "./auth";

export async function getDefaultOrg() {
  const org = await prisma.organization.findFirst({ where: { isActive: true } });
  if (!org) throw new Error("לא נמצאה ארגון במערכת. הרץ: npm run db:setup");
  return org;
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
