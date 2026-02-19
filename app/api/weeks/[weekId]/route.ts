import { NextResponse } from "next/server";
import { getWeekBundle, getWeekMetrics, setWeekStatus } from "@/lib/db/queries";
import { requireAdminApiRequest } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ weekId: string }> },
) {
  const authError = await requireAdminApiRequest();
  if (authError) return authError;

  const { weekId } = await params;
  const bundle = await getWeekBundle(weekId);
  if (!bundle) {
    return NextResponse.json({ error: "Semana não encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    ...bundle,
    metrics: await getWeekMetrics(weekId),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ weekId: string }> },
) {
  const authError = await requireAdminApiRequest();
  if (authError) return authError;

  const { weekId } = await params;
  const body = (await req.json().catch(() => ({}))) as { status?: "open" | "reconciled" | "closed" };

  if (!body.status) {
    return NextResponse.json({ error: "status obrigatório" }, { status: 400 });
  }

  if (body.status === "closed") {
    return NextResponse.json(
      { error: "Use o endpoint de fechamento para validar pendências vermelhas." },
      { status: 400 },
    );
  }

  const week = await setWeekStatus(weekId, body.status);
  if (!week) {
    return NextResponse.json({ error: "Semana não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ week });
}
