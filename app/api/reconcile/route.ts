import { NextResponse } from "next/server";
import { getWeekBundle, replaceMatches, setWeekStatus, updateMatch } from "@/lib/db/queries";
import { reconcileWeek } from "@/lib/reconciliation/matcher";
import { requireAdminApiRequest } from "@/lib/auth";

export async function POST(req: Request) {
  const authError = await requireAdminApiRequest();
  if (authError) return authError;

  const body = (await req.json().catch(() => ({}))) as { weekId?: string; cieloFeePct?: number };

  if (!body.weekId) {
    return NextResponse.json({ error: "weekId obrigatório" }, { status: 400 });
  }

  const bundle = await getWeekBundle(body.weekId);
  if (!bundle) {
    return NextResponse.json({ error: "Semana não encontrada" }, { status: 404 });
  }

  const matches = reconcileWeek({
    weekId: body.weekId,
    entries: bundle.entries,
    bankRecords: bundle.bankRecords,
    exceptions: bundle.exceptions,
    cieloFeePct: body.cieloFeePct,
  });

  const inserted = await replaceMatches(body.weekId, matches);
  await setWeekStatus(body.weekId, "reconciled");

  return NextResponse.json({ items: inserted });
}

export async function PATCH(req: Request) {
  const authError = await requireAdminApiRequest();
  if (authError) return authError;

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    patch?: {
      status?: "green" | "yellow" | "orange" | "red" | "blue";
      adminNote?: string;
      notes?: string;
    };
  };

  if (!body.id || !body.patch) {
    return NextResponse.json({ error: "id e patch obrigatórios" }, { status: 400 });
  }

  const updated = await updateMatch(body.id, body.patch);
  if (!updated) {
    return NextResponse.json({ error: "Match não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ item: updated });
}
