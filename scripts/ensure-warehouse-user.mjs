import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const WAREHOUSE_PHONE = "972533333333"; // 0533333333
const WAREHOUSE_EMAIL = "warehouse@walledyehya.group";

async function main() {
  const existing = await prisma.user.findFirst({
    where: { role: UserRole.WAREHOUSE_MANAGER, isActive: true },
    select: { id: true, firstName: true, lastName: true, phone: true, email: true },
  });

  if (existing) {
    console.log("מחסנאי כבר קיים — לא נוצר כפילות");
    console.log(JSON.stringify(existing, null, 2));
    return;
  }

  const org = await prisma.organization.findFirst();
  if (!org) {
    throw new Error("אין ארגון במערכת — הרץ קודם npm run db:seed");
  }

  const passwordHash = bcrypt.hashSync("1234", 10);
  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: WAREHOUSE_EMAIL,
      passwordHash,
      firstName: "מחסנאי",
      lastName: "מערכת",
      phone: WAREHOUSE_PHONE,
      role: UserRole.WAREHOUSE_MANAGER,
      isActive: true,
    },
    select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true },
  });

  console.log("נוצר משתמש מחסנאי חדש:");
  console.log(JSON.stringify(user, null, 2));
  console.log("התחברות: 0533333333 / 1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
