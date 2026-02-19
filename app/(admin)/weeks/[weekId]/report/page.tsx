"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReportSummary } from "@/components/report-summary";
import { buildWeeklyReport } from "@/lib/report/generator";
import { formatCurrency } from "@/lib/utils";
import type { WeekBundle } from "@/lib/types";

export default function ReportPage() {
  const params = useParams<{ weekId: string }>();
  const [bundle, setBundle] = useState<WeekBundle | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/weeks/${params.weekId}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as WeekBundle;
    setBundle(data);
  }, [params.weekId]);

  useEffect(() => {
    void load();
  }, [load]);

  const report = useMemo(() => {
    if (!bundle) return null;
    return buildWeeklyReport(bundle);
  }, [bundle]);

  if (!bundle || !report) {
    return <p>Carregando...</p>;
  }

  return (
    <section className="space-y-4 print:space-y-3">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Relatório final</h1>
        <div className="flex gap-2">
          <a href={`/api/export?weekId=${params.weekId}&format=csv`}>
            <Button variant="outline">Exportar CSV</Button>
          </a>
          <a href={`/api/export?weekId=${params.weekId}&format=pdf`} target="_blank" rel="noreferrer">
            <Button variant="outline">Exportar PDF</Button>
          </a>
          <Button onClick={() => window.print()}>Imprimir</Button>
        </div>
      </div>

      <ReportSummary
        expectedTotal={report.summary.expectedTotal}
        receivedTotal={report.summary.receivedTotal}
        byStatus={report.summary.byStatus}
      />

      <Card className="print-card space-y-2">
        <h2 className="text-lg font-semibold">Descontos</h2>
        <p className="text-sm text-zinc-600">Total de descontos: {formatCurrency(report.discounts.total)}</p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left">
                <th className="px-2 py-2">Hóspede</th>
                <th className="px-2 py-2">Original</th>
                <th className="px-2 py-2">Final</th>
                <th className="px-2 py-2">Desconto</th>
                <th className="px-2 py-2">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {report.discounts.rows.map((item) => (
                <tr key={item.id} className="border-b border-zinc-100">
                  <td className="px-2 py-2">{item.guestName || "-"}</td>
                  <td className="px-2 py-2">{formatCurrency(item.originalAmount)}</td>
                  <td className="px-2 py-2">{formatCurrency(item.finalAmount)}</td>
                  <td className="px-2 py-2">{formatCurrency(item.discountAmount)}</td>
                  <td className="px-2 py-2">{item.reason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <p className="mb-1 text-sm font-semibold">Top motivos</p>
          <ul className="list-disc pl-5 text-sm text-zinc-700">
            {report.discounts.topReasons.map((reason) => (
              <li key={reason.reason}>
                {reason.reason} ({reason.count})
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card className="print-card space-y-2">
        <h2 className="text-lg font-semibold">Ações necessárias (🔴 e 🔵)</h2>
        {report.actions.length === 0 ? (
          <p className="text-sm text-zinc-600">Nenhuma ação pendente.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {report.actions.map((action) => (
              <div key={action.id} className="rounded-md border border-zinc-200 p-2">
                <p className="font-medium">{action.status.toUpperCase()} - {action.matchType}</p>
                <p className="text-zinc-700">{action.notes || "Sem nota automática"}</p>
                <p className="text-zinc-700">{action.adminNote || "Sem nota do admin"}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="no-print">
        <p className="text-sm">
          Link do diretor: 
          {bundle.week.directorToken ? (
            <Link
              className="underline"
              href={`/report/${bundle.week.id}?token=${bundle.week.directorToken}`}
              target="_blank"
            >
              abrir relatório read-only
            </Link>
          ) : (
            " será gerado ao fechar a semana"
          )}
        </p>
      </Card>
    </section>
  );
}
