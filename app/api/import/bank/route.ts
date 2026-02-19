import { NextResponse } from "next/server";
import type { BankSource } from "@/lib/types";
import { appendBankRecords, getWeekById } from "@/lib/db/queries";
import { parseCsvBuffer } from "@/lib/parsers/csv";
import { parseBradescoRows } from "@/lib/parsers/bank/bradesco";
import { parseCaixaRows } from "@/lib/parsers/bank/caixa";
import { parseCieloRows } from "@/lib/parsers/bank/cielo";
import { parsePixRows } from "@/lib/parsers/bank/pix";
import { parseGenericRows } from "@/lib/parsers/bank/generic";
import { parseJsonSafe } from "@/lib/utils";
import { requireAdminApiRequest } from "@/lib/auth";

function parseBySource(
  weekId: string,
  source: BankSource,
  rows: Record<string, string>[],
  mapping?: { date: string; amount: string; description?: string },
) {
  switch (source) {
    case "bradesco":
      return parseBradescoRows(weekId, rows);
    case "caixa":
      return parseCaixaRows(weekId, rows);
    case "cielo":
      return parseCieloRows(weekId, rows);
    case "pix":
      return parsePixRows(weekId, rows);
    case "generic":
      if (!mapping?.date || !mapping?.amount) {
        throw new Error("Para parser genérico, informe mapping.date e mapping.amount");
      }
      return parseGenericRows(weekId, rows, mapping);
    default:
      return [];
  }
}

export async function POST(req: Request) {
  try {
    const authError = await requireAdminApiRequest();
    if (authError) return authError;

    const formData = await req.formData();
    const weekId = String(formData.get("weekId") || "").trim();
    const bankSource = String(formData.get("bankSource") || "") as BankSource;

    if (!weekId) {
      return NextResponse.json({ error: "weekId obrigatório" }, { status: 400 });
    }

    if (!bankSource) {
      return NextResponse.json({ error: "bankSource obrigatório" }, { status: 400 });
    }

    const week = await getWeekById(weekId);
    if (!week) {
      return NextResponse.json({ error: "Semana não encontrada" }, { status: 404 });
    }

    const mapping = parseJsonSafe<{ date: string; amount: string; description?: string } | undefined>(
      String(formData.get("mapping") || ""),
      undefined,
    );

    const fileEntries = formData.getAll("files");
    const singleFile = formData.get("file");
    if (singleFile) {
      fileEntries.push(singleFile);
    }

    const files = fileEntries.filter((item): item is File => item instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "Envie ao menos um arquivo CSV" }, { status: 400 });
    }

    const parsedRecords = [];
    for (const file of files) {
      const rows = parseCsvBuffer(await file.arrayBuffer());
      parsedRecords.push(...parseBySource(weekId, bankSource, rows, mapping));
    }

    const inserted = await appendBankRecords(parsedRecords);

    return NextResponse.json({
      count: inserted.length,
      totalAmount: inserted.reduce((sum, item) => sum + item.amount, 0),
      preview: inserted.slice(0, 5),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao importar" },
      { status: 400 },
    );
  }
}
