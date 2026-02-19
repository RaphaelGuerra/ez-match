import { notFound } from "next/navigation";
import { getWeekBundle } from "@/lib/db/queries";
import { buildWeeklyReport } from "@/lib/report/generator";
import { ReportSummary } from "@/components/report-summary";
import { Card } from "@/components/ui/card";

export default async function DirectorReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ weekId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { weekId } = await params;
  const { token } = await searchParams;

  const bundle = await getWeekBundle(weekId);
  if (!bundle) {
    notFound();
  }

  if (!bundle.week.directorToken || bundle.week.directorToken !== token) {
    return (
      <main className="p-6">
        <p className="text-sm text-zinc-700">Token inválido para visualizar este relatório.</p>
      </main>
    );
  }

  const report = buildWeeklyReport(bundle);

  return (
    <main className="space-y-4 px-4 py-6">
      <h1 className="text-2xl font-semibold">Relatório da semana {bundle.week.name}</h1>

      <ReportSummary
        expectedTotal={report.summary.expectedTotal}
        receivedTotal={report.summary.receivedTotal}
        byStatus={report.summary.byStatus}
      />

      <Card>
        <h2 className="text-lg font-semibold">Pendências</h2>
        {report.actions.length === 0 ? (
          <p className="text-sm text-zinc-600">Sem pendências.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm text-zinc-700">
            {report.actions.map((item) => (
              <li key={item.id}>
                {item.status.toUpperCase()} - {item.notes || "Sem observação"}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
