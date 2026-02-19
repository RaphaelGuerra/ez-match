import { NextResponse } from "next/server";
import { parseCsvBuffer } from "@/lib/parsers/csv";
import { parsePmsRows } from "@/lib/parsers/pms";
import { getWeekById, replaceWeekEntries } from "@/lib/db/queries";
import { parseJsonSafe } from "@/lib/utils";
import { requireAdminApiRequest } from "@/lib/auth";

export async function POST(req: Request) {
  const authError = await requireAdminApiRequest();
  if (authError) return authError;

  const formData = await req.formData();
  const weekId = String(formData.get("weekId") || "").trim();
  const file = formData.get("file");

  if (!weekId) {
    return NextResponse.json({ error: "weekId obrigatório" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo CSV obrigatório" }, { status: 400 });
  }

  const mapping = parseJsonSafe<Record<string, string> | undefined>(
    String(formData.get("mapping") || ""),
    undefined,
  );

  const week = await getWeekById(weekId);
  if (!week) {
    return NextResponse.json({ error: "Semana não encontrada" }, { status: 404 });
  }

  const rows = parseCsvBuffer(await file.arrayBuffer());
  const parsed = parsePmsRows(weekId, rows, mapping);
  if (rows.length > 0 && parsed.length === 0) {
    return NextResponse.json(
      {
        error:
          "Nenhuma linha válida encontrada. Campos mínimos obrigatórios: date, amount, guest_name.",
      },
      { status: 400 },
    );
  }
  const inserted = await replaceWeekEntries(weekId, parsed);

  return NextResponse.json({
    count: inserted.length,
    totalAmount: inserted.reduce((sum, item) => sum + item.amount, 0),
    preview: inserted.slice(0, 5),
  });
}
