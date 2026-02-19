import { NextResponse } from "next/server";
import { closeWeek } from "@/lib/db/queries";
import { requireAdminApiRequest } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ weekId: string }> },
) {
  try {
    const authError = await requireAdminApiRequest();
    if (authError) return authError;

    const { weekId } = await params;
    const week = await closeWeek(weekId);
    return NextResponse.json({ week });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao fechar semana" },
      { status: 400 },
    );
  }
}
