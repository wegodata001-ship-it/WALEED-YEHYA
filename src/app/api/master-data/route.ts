import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { ApiAuthError, handleApiAuth, requireManager } from "@/lib/api-auth";
import {
  FIELD_MATERIAL_CATEGORY,
  farmerDisplayName,
  materialSkuFromName,
  normalizeLabel,
  splitPersonName,
} from "@/lib/master-data";
import { SCHEDULE_MATERIAL_SUGGESTIONS } from "@/lib/constants";
import { parseMaterialFromDescription } from "@/lib/field-task-utils";

/** GET — reusable master lists (managers). */
export async function GET() {
  try {
    await requireManager();
    const org = await getDefaultOrg();

    const [farmers, moshavim, plots, inventoryMaterials, tasks] = await Promise.all([
      prisma.farmer.findMany({
        where: { organizationId: org.id, isActive: true },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          moshav: { select: { id: true, name: true, nameHe: true } },
        },
      }),
      prisma.moshav.findMany({
        where: { organizationId: org.id, isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, nameHe: true },
      }),
      prisma.plot.findMany({
        where: { organizationId: org.id, isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, nameHe: true },
      }),
      prisma.inventoryItem.findMany({
        where: { organizationId: org.id, isActive: true, category: FIELD_MATERIAL_CATEGORY },
        orderBy: { name: "asc" },
        select: { id: true, name: true, nameHe: true, sku: true },
      }),
      // Limited scan for legacy free-text values only — avoid loading full history
      prisma.fieldTask.findMany({
        where: { organizationId: org.id },
        select: { settlement: true, plotName: true, taskDescription: true },
        take: 80,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const materialNames = new Map<string, { id: string | null; name: string }>();
    for (const s of SCHEDULE_MATERIAL_SUGGESTIONS) {
      const n = normalizeLabel(s);
      materialNames.set(n.toLowerCase(), { id: null, name: n });
    }
    for (const m of inventoryMaterials) {
      const n = normalizeLabel(m.nameHe || m.name);
      materialNames.set(n.toLowerCase(), { id: m.id, name: n });
    }
    for (const t of tasks) {
      const mat = parseMaterialFromDescription(t.taskDescription);
      if (mat) {
        const n = normalizeLabel(mat);
        if (!materialNames.has(n.toLowerCase())) materialNames.set(n.toLowerCase(), { id: null, name: n });
      }
    }

    const settlements = moshavim.map((m) => ({
      id: m.id,
      name: normalizeLabel(m.nameHe || m.name),
    }));

    // Also surface historical settlements not yet in moshav
    for (const t of tasks) {
      const s = t.settlement ? normalizeLabel(t.settlement) : "";
      if (s && !settlements.some((x) => x.name.toLowerCase() === s.toLowerCase())) {
        settlements.push({ id: `legacy:${s}`, name: s });
      }
    }
    settlements.sort((a, b) => a.name.localeCompare(b.name, "he"));

    const plotOptions = plots.map((p) => ({
      id: p.id,
      name: normalizeLabel(p.nameHe || p.name),
    }));
    for (const t of tasks) {
      const p = t.plotName ? normalizeLabel(t.plotName) : "";
      // skip legacy workType in plotName if it looks like material tag era - still include
      if (p && !plotOptions.some((x) => x.name.toLowerCase() === p.toLowerCase())) {
        plotOptions.push({ id: `legacy:${p}`, name: p });
      }
    }
    plotOptions.sort((a, b) => a.name.localeCompare(b.name, "he"));

    return NextResponse.json({
      customers: farmers.map((f) => ({
        id: f.id,
        name: farmerDisplayName(f),
        phone: f.phone,
        settlement: f.moshav ? normalizeLabel(f.moshav.nameHe || f.moshav.name) : null,
      })),
      settlements,
      plots: plotOptions,
      materials: Array.from(materialNames.values()).sort((a, b) => a.name.localeCompare(b.name, "he")),
    });
  } catch (e) {
    return handleApiAuth(e);
  }
}

type EnsureKind = "customer" | "settlement" | "plot" | "material";

/**
 * POST — create-or-get master row (no duplicates).
 * Body: { kind, name, settlementName? }
 */
export async function POST(req: NextRequest) {
  try {
    await requireManager();
    const org = await getDefaultOrg();
    const body = await req.json();
    const kind = body.kind as EnsureKind;
    const name = normalizeLabel(String(body.name || ""));
    if (!name) {
      return NextResponse.json({ error: "חסר שם" }, { status: 400 });
    }

    if (kind === "settlement") {
      const existing = await prisma.moshav.findFirst({
        where: {
          organizationId: org.id,
          OR: [
            { name: { equals: name, mode: "insensitive" } },
            { nameHe: { equals: name, mode: "insensitive" } },
          ],
        },
      });
      if (existing) {
        return NextResponse.json({
          id: existing.id,
          name: normalizeLabel(existing.nameHe || existing.name),
          created: false,
        });
      }
      const created = await prisma.moshav.create({
        data: {
          organizationId: org.id,
          name,
          nameHe: name,
          isActive: true,
        },
      });
      return NextResponse.json({ id: created.id, name, created: true }, { status: 201 });
    }

    if (kind === "plot") {
      const existing = await prisma.plot.findFirst({
        where: {
          organizationId: org.id,
          OR: [
            { name: { equals: name, mode: "insensitive" } },
            { nameHe: { equals: name, mode: "insensitive" } },
          ],
        },
      });
      if (existing) {
        return NextResponse.json({
          id: existing.id,
          name: normalizeLabel(existing.nameHe || existing.name),
          created: false,
        });
      }

      let moshavId: string | null = null;
      const settlementName = normalizeLabel(String(body.settlementName || ""));
      if (settlementName) {
        const moshav = await prisma.moshav.upsert({
          where: { organizationId_name: { organizationId: org.id, name: settlementName } },
          create: { organizationId: org.id, name: settlementName, nameHe: settlementName },
          update: { isActive: true },
        });
        moshavId = moshav.id;
      }

      const created = await prisma.plot.create({
        data: {
          organizationId: org.id,
          name,
          nameHe: name,
          moshavId,
          isActive: true,
        },
      });
      return NextResponse.json({ id: created.id, name, created: true }, { status: 201 });
    }

    if (kind === "material") {
      const sku = materialSkuFromName(name);
      const existing = await prisma.inventoryItem.findFirst({
        where: {
          organizationId: org.id,
          category: FIELD_MATERIAL_CATEGORY,
          OR: [
            { sku },
            { name: { equals: name, mode: "insensitive" } },
            { nameHe: { equals: name, mode: "insensitive" } },
          ],
        },
      });
      if (existing) {
        return NextResponse.json({
          id: existing.id,
          name: normalizeLabel(existing.nameHe || existing.name),
          created: false,
        });
      }
      const created = await prisma.inventoryItem.create({
        data: {
          organizationId: org.id,
          sku,
          name,
          nameHe: name,
          category: FIELD_MATERIAL_CATEGORY,
          unit: "UNIT",
          isActive: true,
        },
      });
      return NextResponse.json({ id: created.id, name, created: true }, { status: 201 });
    }

    if (kind === "customer") {
      const { firstName, lastName } = splitPersonName(name);
      const all = await prisma.farmer.findMany({
        where: { organizationId: org.id },
        select: { id: true, firstName: true, lastName: true, isActive: true },
      });
      const match = all.find(
        (f) => farmerDisplayName(f).toLowerCase() === name.toLowerCase()
      );
      if (match) {
        if (!match.isActive) {
          await prisma.farmer.update({ where: { id: match.id }, data: { isActive: true } });
        }
        return NextResponse.json({ id: match.id, name, created: false });
      }

      let moshavId: string | null = null;
      const settlementName = normalizeLabel(String(body.settlementName || ""));
      if (settlementName) {
        const moshav = await prisma.moshav.upsert({
          where: { organizationId_name: { organizationId: org.id, name: settlementName } },
          create: { organizationId: org.id, name: settlementName, nameHe: settlementName },
          update: { isActive: true },
        });
        moshavId = moshav.id;
      }

      const created = await prisma.farmer.create({
        data: {
          organizationId: org.id,
          firstName,
          lastName,
          moshavId,
          isActive: true,
        },
      });
      return NextResponse.json(
        { id: created.id, name: farmerDisplayName(created), created: true },
        { status: 201 }
      );
    }

    return NextResponse.json({ error: "סוג לא נתמך" }, { status: 400 });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בשמירת נתון אב" }, { status: 500 });
  }
}
