"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { MatchRecord, Week } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { MatchTable } from "@/components/match-table";

type Data = {
  week: Week;
  matches: MatchRecord[];
};

export default function ReconcilePage() {
  const params = useParams<{ weekId: string }>();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [filter, setFilter] = useState<"all" | MatchRecord["status"]>("all");

  const load = useCallback(async () => {
    const response = await fetch(`/api/weeks/${params.weekId}`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as { week: Week; matches?: MatchRecord[] };
    setData({ week: payload.week, matches: payload.matches || [] });
  }, [params.weekId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runReconcile() {
    setLoading(true);
    const response = await fetch("/api/reconcile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ weekId: params.weekId }),
    });
    setLoading(false);

    if (!response.ok) {
      alert("Falha ao rodar conciliação");
      return;
    }

    await load();
  }

  async function patchMatch(id: string, patch: Partial<MatchRecord>) {
    await fetch("/api/reconcile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, patch }),
    });
    await load();
  }

  async function closeWeek() {
    const response = await fetch(`/api/weeks/${params.weekId}/close`, { method: "POST" });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      alert(body.error || "Falha ao fechar semana");
      return;
    }

    await load();
    alert("Semana fechada.");
  }

  const canCloseWeek = useMemo(() => {
    if (!data) return false;
    return !data.matches.some((match) => match.status === "red" && !match.adminNote?.trim());
  }, [data]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">Conciliação</h1>
        <Button onClick={runReconcile} disabled={loading}>
          {loading ? "Rodando..." : "Rodar conciliação"}
        </Button>
        <Button variant="secondary" onClick={closeWeek} disabled={!canCloseWeek || data?.week.status === "closed"}>
          Fechar semana
        </Button>
      </div>

      <Card className="space-y-2">
        <p className="text-sm text-zinc-600">Filtro por cor</p>
        <Select value={filter} onChange={(event) => setFilter(event.target.value as "all" | MatchRecord["status"])}>
          <option value="all">Todos</option>
          <option value="green">🟢 Verde</option>
          <option value="yellow">🟡 Amarelo</option>
          <option value="orange">🟠 Laranja</option>
          <option value="red">🔴 Vermelho</option>
          <option value="blue">🔵 Azul</option>
        </Select>
      </Card>

      <MatchTable
        matches={data?.matches || []}
        statusFilter={filter}
        onConfirmOrange={(id) => patchMatch(id, { status: "green", notes: "Confirmado manualmente" })}
        onReclassifyRed={(id) => patchMatch(id, { status: "red", notes: "Reclassificado para vermelho" })}
        onSaveRedNote={(id, note) => patchMatch(id, { adminNote: note })}
      />
    </section>
  );
}
