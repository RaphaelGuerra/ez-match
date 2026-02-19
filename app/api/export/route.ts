import { NextResponse } from "next/server";
import { getWeekBundle } from "@/lib/db/queries";
import { exportMatchesCsv, exportPrintHtml } from "@/lib/report/export";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const weekId = url.searchParams.get("weekId");
  const format = url.searchParams.get("format") || "csv";
  const token = url.searchParams.get("token");

  if (!weekId) {
    return NextResponse.json({ error: "weekId obrigatório" }, { status: 400 });
  }

  const bundle = await getWeekBundle(weekId);
  if (!bundle) {
    return NextResponse.json({ error: "Semana não encontrada" }, { status: 404 });
  }

  const isAdmin = await isAdminAuthenticated();
  const tokenMatchesDirector =
    !!token && !!bundle.week.directorToken && token === bundle.week.directorToken;
  if (!isAdmin && !tokenMatchesDirector) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  if (format === "pdf") {
    return new NextResponse(exportPrintHtml(bundle), {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  }

  const csv = exportMatchesCsv(bundle);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=ez-match-${bundle.week.id}.csv`,
    },
  });
}
