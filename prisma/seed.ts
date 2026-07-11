/**
 * Full data reset — keeps only one manager + one employee.
 * Login:
 *   Manager:   0500000000 / 1234
 *   Employee:  0542222222 / 1234
 *   Warehouse: 0533333333 / 1234
 */
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEMO_PASSWORD = bcrypt.hashSync("1234", 10);

async function wipe() {
  await prisma.customerLedgerEntry.deleteMany();
  await prisma.serviceLineItem.deleteMany();
  await prisma.serviceRecord.deleteMany();
  await prisma.communicationLog.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.fieldTask.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.machineryWorkLog.deleteMany();
  await prisma.machineryUnit.deleteMany();
  await prisma.fuelTransaction.deleteMany();
  await prisma.fuelRecipient.deleteMany();
  await prisma.syncLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.invoiceTaxComponent.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.harvestAccountSummary.deleteMany();
  await prisma.falchaRate.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.tire.deleteMany();
  await prisma.vehicleCompliance.deleteMany();
  await prisma.systemAlert.deleteMany();
  await prisma.employeeLedgerEntry.deleteMany();
  await prisma.subcontractorLedgerEntry.deleteMany();
  await prisma.subcontractorJob.deleteMany();
  await prisma.subcontractorSettlement.deleteMany();
  await prisma.subcontractor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.fuelSource.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.plot.deleteMany();
  await prisma.farmer.deleteMany();
  await prisma.moshav.deleteMany();
  await prisma.organization.deleteMany();
}

async function main() {
  console.log("מנקה את כל הנתונים...");
  await wipe();

  const org = await prisma.organization.create({
    data: {
      name: "WALLED YEHYA GROUP",
      nameHe: "WALLED YEHYA GROUP",
      phone: null,
      email: null,
      managerPhone: null,
      vatRate: 18,
    },
  });

  await prisma.user.create({
    data: {
      organizationId: org.id,
      email: "owner@walledyehya.group",
      passwordHash: DEMO_PASSWORD,
      firstName: "מנהל",
      lastName: "מערכת",
      phone: "972500000000",
      role: UserRole.OWNER,
      isActive: true,
    },
  });

  const employee = await prisma.employee.create({
    data: {
      organizationId: org.id,
      employeeNumber: "001",
      firstName: "מןחמד",
      lastName: "אבוליל",
      phone: "972542222222",
      position: "מפעיל שטח",
      salaryType: "HOURLY",
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      organizationId: org.id,
      email: "employee@walledyehya.group",
      passwordHash: DEMO_PASSWORD,
      firstName: employee.firstName,
      lastName: employee.lastName,
      phone: "972542222222",
      role: UserRole.FIELD_OPERATOR,
      employeeId: employee.id,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      organizationId: org.id,
      email: "warehouse@walledyehya.group",
      passwordHash: DEMO_PASSWORD,
      firstName: "מחסנאי",
      lastName: "מערכת",
      phone: "972533333333",
      role: UserRole.WAREHOUSE_MANAGER,
      isActive: true,
    },
  });

  console.log("✓ המערכת נוקתה — נשארו מנהל, עובד ומחסנאי");
  console.log("  מנהל:   0500000000 / 1234");
  console.log("  עובד:   0542222222 / 1234");
  console.log("  מחסנאי: 0533333333 / 1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
