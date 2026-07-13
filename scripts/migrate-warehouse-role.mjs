/** Migrates legacy WAREHOUSE_MANAGER users to FIELD_OPERATOR (no separate warehouse role). */
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.user.updateMany({
    where: { role: UserRole.WAREHOUSE_MANAGER, isActive: true },
    data: { role: UserRole.FIELD_OPERATOR },
  });
  console.log(`Migrated ${updated.count} warehouse user(s) to FIELD_OPERATOR`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
