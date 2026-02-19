"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WeekStatusBadge } from "@/components/week-status-badge";
import { formatCurrency, formatDateBr } from "@/lib/utils";
import type { Week, WeekMetrics } from "@/lib/types";

type WeekListItem = {
  week: Week;
  metrics: WeekMetrics;
};

export default function DashboardPage() {
  const [items, setItems] = useState<WeekListItem[]>([]);

  const load = useCallback(async () => {
    const response = await fetch("/api/weeks", { cache: "no-store" });
    const data = (await response.json()) as { items?: WeekListItem[] };
    setItems(data.items || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current = items[0];

  const quick = useMemo(() => {
    if (!current) {
      return {
        reconciledPct: 0,
        pending: 0,
        expectedTotal: 0,
      };
    }

    return {
      reconciledPct: current.metrics.reconciledPct,
      pending: current.metrics.pendingCount,
      expectedTotal: current.metrics.expectedTotal,
    };
  }, [current]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
          <p className="text-sm text-zinc-600">Histórico de semanas e status da conciliação.</p>
        </div>
        <Link href="/weeks/new">
          <Button>Nova semana</Button>
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Semana atual</p>
          <p className="mt-1 text-lg font-semibold">{current?.week.name || "-"}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-zinc-500">% conciliado</p>
          <p className="mt-1 text-lg font-semibold">{quick.reconciledPct.toFixed(1)}%</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Pendências</p>
          <p className="mt-1 text-lg font-semibold">{quick.pending}</p>
        </Card>
      </div>

      <Card>
        <p className="mb-3 text-sm text-zinc-600">Total esperado da semana atual: {formatCurrency(quick.expectedTotal)}</p>

        {items.length === 0 ? (
          <p className="text-sm text-zinc-600">Nenhuma semana criada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-600">
                  <th className="px-2 py-2">Semana</th>
                  <th className="px-2 py-2">Período</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Conciliado</th>
                  <th className="px-2 py-2">Pendências</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.week.id} className="border-b border-zinc-100">
                    <td className="px-2 py-2 font-medium">{item.week.name}</td>
                    <td className="px-2 py-2 text-zinc-600">
                      {formatDateBr(item.week.startDate)} - {formatDateBr(item.week.endDate)}
                    </td>
                    <td className="px-2 py-2">
                      <WeekStatusBadge status={item.week.status} />
                    </td>
                    <td className="px-2 py-2">{item.metrics.reconciledPct.toFixed(1)}%</td>
                    <td className="px-2 py-2">{item.metrics.pendingCount}</td>
                    <td className="px-2 py-2">
                      <Link href={`/weeks/${item.week.id}`}>Abrir</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}
