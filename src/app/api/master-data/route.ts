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
import { NO_MATERIAL_LABEL, SCHEDULE_MATERIAL_SUGGESTIONS } from "@/lib/constants";
import { parseMaterialFromDescription } from "@/lib/field-task-utils";
import { parseMoshavIdsFromNotes, upsertFarmerMetaInNotes } from "@/lib/farmer-meta";

/** GET — reusable master lists (managers). Supports hierarchy via customerId / settlementId. */
export async function GET(req: NextRequest) {
  try {
    await requireManager();
    const org = await getDefaultOrg();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const settlementId = searchParams.get("settlementId");

    const [farmers, moshavim, plots, inventoryMaterials, tasks, customUnits] = await Promise.all([
      prisma.farmer.findMany({
        where: { organizationId: org.id, isActive: true },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          notes: true,
          moshavId: true,
          moshav: { select: { id: true, name: true, nameHe: true } },
          plots: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              nameHe: true,
              moshavId: true,
              moshav: { select: { id: true, name: true, nameHe: true } },
            },
          },
        },
      }),
      prisma.moshav.findMany({
        where: { organizationId: org.id, isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, nameHe: true },
      }),
      prisma.plot.findMany({
        where: {
          organizationId: org.id,
          isActive: true,
          ...(customerId ? { farmerId: customerId } : {}),
          ...(settlementId && !settlementId.startsWith("legacy:") ? { moshavId: settlementId } : {}),
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          nameHe: true,
          farmerId: true,
          moshavId: true,
          notes: true,
        },
      }),
      prisma.inventoryItem.findMany({
        where: { organizationId: org.id, isActive: true, category: FIELD_MATERIAL_CATEGORY },
        orderBy: { name: "asc" },
        select: { id: true, name: true, nameHe: true, sku: true },
      }),
      prisma.fieldTask.findMany({
        where: { organizationId: org.id },
        select: { settlement: true, plotName: true, taskDescription: true },
        take: 80,
        orderBy: { createdAt: "desc" },
      }),
      prisma.inventoryItem.findMany({
        where: { organizationId: org.id, isActive: true, category: "CUSTOM_QUANTITY_UNIT" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, nameHe: true },
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

    // Build per-customer settlement sets from primary moshav + linked notes + plots
    const moshavById = new Map(moshavim.map((m) => [m.id, m]));
    const customers = farmers.map((f) => {
      const settlementMap = new Map<string, { id: string; name: string }>();
      if (f.moshav) {
        settlementMap.set(f.moshav.id, {
          id: f.moshav.id,
          name: normalizeLabel(f.moshav.nameHe || f.moshav.name),
        });
      }
      for (const mid of parseMoshavIdsFromNotes(f.notes)) {
        const m = moshavById.get(mid);
        if (m) {
          settlementMap.set(m.id, { id: m.id, name: normalizeLabel(m.nameHe || m.name) });
        }
      }
      for (const p of f.plots) {
        if (p.moshav) {
          settlementMap.set(p.moshav.id, {
            id: p.moshav.id,
            name: normalizeLabel(p.moshav.nameHe || p.moshav.name),
          });
        }
      }
      return {
        id: f.id,
        name: farmerDisplayName(f),
        phone: f.phone,
        settlement: f.moshav ? normalizeLabel(f.moshav.nameHe || f.moshav.name) : null,
        settlements: Array.from(settlementMap.values()).sort((a, b) => a.name.localeCompare(b.name, "he")),
      };
    });

    let settlements = moshavim.map((m) => ({
      id: m.id,
      name: normalizeLabel(m.nameHe || m.name),
    }));

    if (customerId) {
      const c = customers.find((x) => x.id === customerId);
      settlements = c?.settlements || [];
    } else {
      for (const t of tasks) {
        const s = t.settlement ? normalizeLabel(t.settlement) : "";
        if (s && !settlements.some((x) => x.name.toLowerCase() === s.toLowerCase())) {
          settlements.push({ id: `legacy:${s}`, name: s });
        }
      }
      settlements.sort((a, b) => a.name.localeCompare(b.name, "he"));
    }

    const plotOptions = plots.map((p) => ({
      id: p.id,
      name: normalizeLabel(p.nameHe || p.name),
      farmerId: p.farmerId,
      moshavId: p.moshavId,
    }));

    if (!customerId) {
      for (const t of tasks) {
        const p = t.plotName ? normalizeLabel(t.plotName) : "";
        if (p && !plotOptions.some((x) => x.name.toLowerCase() === p.toLowerCase())) {
          plotOptions.push({ id: `legacy:${p}`, name: p, farmerId: null, moshavId: null });
        }
      }
    }
    plotOptions.sort((a, b) => a.name.localeCompare(b.name, "he"));

    return NextResponse.json({
      customers,
      settlements,
      plots: plotOptions,
      materials: Array.from(materialNames.values()).sort((a, b) => a.name.localeCompare(b.name, "he")),
      customQuantityUnits: customUnits.map((u) => ({
        id: u.id,
        name: normalizeLabel(u.nameHe || u.name),
      })),
      noMaterialLabel: NO_MATERIAL_LABEL,
    });
  } catch (e) {
    return handleApiAuth(e);
  }
}

type EnsureKind = "customer" | "settlement" | "plot" | "material" | "quantity_unit" | "vehicle_type";

/**
 * POST — create-or-get master row (no duplicates).
 * Body: { kind, name, settlementName?, customerId?, customerName?, notes? }
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
      let moshavId = existing?.id;
      if (!existing) {
        const created = await prisma.moshav.create({
          data: {
            organizationId: org.id,
            name,
            nameHe: name,
            isActive: true,
          },
        });
        moshavId = created.id;
      } else if (!existing.isActive) {
        await prisma.moshav.update({ where: { id: existing.id }, data: { isActive: true } });
      }

      // Link settlement to customer when provided (multi-moshav via notes, no junction table)
      const customerId = body.customerId ? String(body.customerId) : null;
      if (customerId && moshavId) {
        const farmer = await prisma.farmer.findFirst({
          where: { id: customerId, organizationId: org.id },
        });
        if (farmer) {
          const linked = parseMoshavIdsFromNotes(farmer.notes);
          if (!linked.includes(moshavId) && farmer.moshavId !== moshavId) {
            const nextIds = Array.from(new Set([...linked, moshavId]));
            await prisma.farmer.update({
              where: { id: farmer.id },
              data: {
                notes: upsertFarmerMetaInNotes(farmer.notes, {
                  moshavIds: nextIds,
                }),
                ...(farmer.moshavId ? {} : { moshavId }),
              },
            });
          }
        }
      }

      return NextResponse.json(
        { id: moshavId, name, created: !existing },
        { status: existing ? 200 : 201 }
      );
    }

    if (kind === "plot") {
      let farmerId: string | null = body.customerId ? String(body.customerId) : null;
      const customerName = normalizeLabel(String(body.customerName || ""));
      if (!farmerId && customerName) {
        const all = await prisma.farmer.findMany({
          where: { organizationId: org.id },
          select: { id: true, firstName: true, lastName: true },
        });
        const match = all.find((f) => farmerDisplayName(f).toLowerCase() === customerName.toLowerCase());
        farmerId = match?.id || null;
      }

      const existing = await prisma.plot.findFirst({
        where: {
          organizationId: org.id,
          OR: [
            { name: { equals: name, mode: "insensitive" } },
            { nameHe: { equals: name, mode: "insensitive" } },
          ],
          ...(farmerId ? { farmerId } : {}),
        },
      });
      if (existing) {
        const data: { isActive?: boolean; farmerId?: string | null; moshavId?: string | null; notes?: string | null } =
          {};
        if (!existing.isActive) data.isActive = true;
        if (farmerId && existing.farmerId !== farmerId) data.farmerId = farmerId;
        const settlementName = normalizeLabel(String(body.settlementName || ""));
        if (settlementName) {
          const moshav = await prisma.moshav.upsert({
            where: { organizationId_name: { organizationId: org.id, name: settlementName } },
            create: { organizationId: org.id, name: settlementName, nameHe: settlementName },
            update: { isActive: true },
          });
          if (existing.moshavId !== moshav.id) data.moshavId = moshav.id;
        }
        if (body.notes !== undefined) data.notes = body.notes ? String(body.notes) : null;
        if (Object.keys(data).length) {
          await prisma.plot.update({ where: { id: existing.id }, data });
        }
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
          farmerId,
          notes: body.notes ? String(body.notes) : null,
          isActive: true,
        },
      });
      return NextResponse.json({ id: created.id, name, created: true }, { status: 201 });
    }

    if (kind === "material") {
      if (name === NO_MATERIAL_LABEL || name.toLowerCase() === "ללא חומר") {
        return NextResponse.json({ id: "none", name: NO_MATERIAL_LABEL, created: false });
      }
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

    if (kind === "quantity_unit" || kind === "vehicle_type") {
      const category = kind === "quantity_unit" ? "CUSTOM_QUANTITY_UNIT" : "CUSTOM_VEHICLE_TYPE";
      const sku = `${category}:${name}`.slice(0, 64);
      const existing = await prisma.inventoryItem.findFirst({
        where: {
          organizationId: org.id,
          category,
          OR: [
            { sku },
            { name: { equals: name, mode: "insensitive" } },
            { nameHe: { equals: name, mode: "insensitive" } },
          ],
        },
      });
      if (existing) {
        if (!existing.isActive) {
          await prisma.inventoryItem.update({ where: { id: existing.id }, data: { isActive: true } });
        }
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
          category,
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
      const match = all.find((f) => farmerDisplayName(f).toLowerCase() === name.toLowerCase());
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
