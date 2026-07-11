/**
 * Clean bootstrap seed — empty system ready for the owner to enter real data.
 * Login: 0500000000 / 1234
 */
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEMO_PASSWORD = bcrypt.hashSync("1234", 10);

async function wipe() {
  // Child tables first
  await prisma.customerLedgerEntry.deleteMany();
  await prisma.serviceLineItem.deleteMany();
  await prisma.serviceRecord.deleteMany();
  await prisma.fieldTask.deleteMany();
  await prisma.communicationLog.deleteMany();
  await prisma.timeEntry.deleteMany();
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

  console.log("✓ System reset — empty data ready for your details");
  console.log("  Login: 0500000000 / 1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
