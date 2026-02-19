import { NextResponse } from "next/server";
import { z } from "zod";
import {
  appendExceptions,
  deleteException,
  getWeekById,
  getWeekBundle,
  updateException,
} from "@/lib/db/queries";
import type { ExceptionRecord } from "@/lib/types";
import { parseCsvBuffer } from "@/lib/parsers/csv";
import { requireAdminApiRequest } from "@/lib/auth";

const exceptionSchema = z.object({
  weekId: z.string().min(1),
  type: z.enum(["discount", "cash", "cancellation", "noshow", "acquirer_fee"]),
  reservationId: z.string().optional(),
  guestName: z.string().optional(),
  originalAmount: z.number().optional(),
  finalAmount: z.number().optional(),
  discountAmount: z.number().optional(),
  discountPct: z.number().optional(),
  reason: z.string().optional(),
  source: z.enum(["whatsapp", "csv", "manual"]).default("manual"),
  sourceRaw: z.string().optional(),
});

const exceptionPatchSchema = z.object({
  type: z.enum(["discount", "cash", "cancellation", "noshow", "acquirer_fee"]).optional(),
  reservationId: z.string().optional(),
  guestName: z.string().optional(),
  originalAmount: z.number().optional(),
  finalAmount: z.number().optional(),
  discountAmount: z.number().optional(),
  discountPct: z.number().optional(),
  reason: z.string().optional(),
  source: z.enum(["whatsapp", "csv", "manual"]).optional(),
  sourceRaw: z.string().optional(),
});

export async function GET(req: Request) {
  const authError = await requireAdminApiRequest();
  if (authError) return authError;

  const url = new URL(req.url);
  const weekId = url.searchParams.get("weekId");

  if (!weekId) {
    return NextResponse.json({ error: "weekId obrigatório" }, { status: 400 });
  }

  const bundle = await getWeekBundle(weekId);
  if (!bundle) {
    return NextResponse.json({ error: "Semana não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ items: bundle.exceptions });
}

export async function POST(req: Request) {
  const authError = await requireAdminApiRequest();
  if (authError) return authError;

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const weekId = String(formData.get("weekId") || "").trim();
    const file = formData.get("file");

    if (!weekId || !(file instanceof File)) {
      return NextResponse.json({ error: "weekId e file são obrigatórios" }, { status: 400 });
    }

    const week = await getWeekById(weekId);
    if (!week) {
      return NextResponse.json({ error: "Semana não encontrada" }, { status: 404 });
    }

    const rows = parseCsvBuffer(await file.arrayBuffer());
    const records: Omit<ExceptionRecord, "id" | "createdAt">[] = rows.map((row) => {
      const originalAmount = Number.parseFloat(row.originalAmount || row.original_amount || "0");
      const finalAmount = Number.parseFloat(row.finalAmount || row.final_amount || "0");
      const discountAmount = originalAmount && finalAmount ? originalAmount - finalAmount : 0;
      const discountPct = originalAmount ? (discountAmount / originalAmount) * 100 : 0;

      return {
        weekId,
        type: (row.type || "discount") as ExceptionRecord["type"],
        reservationId: row.reservationId || row.reservation_id,
        guestName: row.guestName || row.guest_name,
        originalAmount: Number.isFinite(originalAmount) ? originalAmount : undefined,
        finalAmount: Number.isFinite(finalAmount) ? finalAmount : undefined,
        discountAmount: Number.isFinite(discountAmount) ? discountAmount : undefined,
        discountPct: Number.isFinite(discountPct) ? discountPct : undefined,
        reason: row.reason || "",
        source: "csv",
        sourceRaw: JSON.stringify(row),
      };
    });

    const inserted = await appendExceptions(records);
    return NextResponse.json({ items: inserted }, { status: 201 });
  }

  const parsed = exceptionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const discountAmount =
    typeof data.discountAmount === "number"
      ? data.discountAmount
      : typeof data.originalAmount === "number" && typeof data.finalAmount === "number"
        ? data.originalAmount - data.finalAmount
        : undefined;

  const discountPct =
    typeof data.discountPct === "number"
      ? data.discountPct
      : data.originalAmount && discountAmount
        ? (discountAmount / data.originalAmount) * 100
        : undefined;

  const week = await getWeekById(data.weekId);
  if (!week) {
    return NextResponse.json({ error: "Semana não encontrada" }, { status: 404 });
  }

  const [created] = await appendExceptions([
    {
      ...data,
      discountAmount,
      discountPct,
    },
  ]);

  return NextResponse.json({ item: created }, { status: 201 });
}

export async function PATCH(req: Request) {
  const authError = await requireAdminApiRequest();
  if (authError) return authError;

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    patch?: unknown;
  };

  if (!body.id || !body.patch) {
    return NextResponse.json({ error: "id e patch obrigatórios" }, { status: 400 });
  }

  const parsedPatch = exceptionPatchSchema.safeParse(body.patch);
  if (!parsedPatch.success) {
    return NextResponse.json({ error: parsedPatch.error.flatten() }, { status: 400 });
  }

  const updated = await updateException(body.id, parsedPatch.data);
  if (!updated) {
    return NextResponse.json({ error: "Exceção não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ item: updated });
}

export async function DELETE(req: Request) {
  const authError = await requireAdminApiRequest();
  if (authError) return authError;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  const removed = await deleteException(id);
  if (!removed) {
    return NextResponse.json({ error: "Exceção não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
