"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { WeekStatusBadge } from "@/components/week-status-badge";
import { formatCurrency, formatDateBr } from "@/lib/utils";
import type { Week, WeekMetrics } from "@/lib/types";

type Data = {
  week: Week;
  metrics: WeekMetrics;
};

export default function WeekOverviewPage() {
  const params = useParams<{ weekId: string }>();
  const [data, setData] = useState<Data | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/weeks/${params.weekId}`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as Data;
    setData(payload);
  }, [params.weekId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) {
    return <p>Carregando...</p>;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{data.week.name}</h1>
          <p className="text-sm text-zinc-600">
            {formatDateBr(data.week.startDate)} - {formatDateBr(data.week.endDate)}
          </p>
        </div>
        <WeekStatusBadge status={data.week.status} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <p className="text-xs text-zinc-500">Esperado</p>
          <p className="text-xl font-semibold">{formatCurrency(data.metrics.expectedTotal)}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Recebido</p>
          <p className="text-xl font-semibold">{formatCurrency(data.metrics.receivedTotal)}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Diferença</p>
          <p className="text-xl font-semibold">{formatCurrency(data.metrics.diffTotal)}</p>
        </Card>
      </div>

      <Card className="grid gap-2 md:grid-cols-4">
        <Link href={`/weeks/${params.weekId}/import`} className="underline">1. Importar CSVs</Link>
        <Link href={`/weeks/${params.weekId}/exceptions`} className="underline">2. Exceções</Link>
        <Link href={`/weeks/${params.weekId}/reconcile`} className="underline">3. Conciliar</Link>
        <Link href={`/weeks/${params.weekId}/report`} className="underline">4. Relatório</Link>
      </Card>
    </section>
  );
}
