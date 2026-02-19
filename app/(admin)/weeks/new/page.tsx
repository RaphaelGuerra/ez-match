"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function NewWeekPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function createWeek(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const response = await fetch("/api/weeks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, startDate, endDate }),
    });

    setSaving(false);

    if (!response.ok) {
      alert("Falha ao criar semana");
      return;
    }

    const data = (await response.json()) as { week: { id: string } };
    router.replace(`/weeks/${data.week.id}`);
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Nova semana</h1>
      <Card>
        <form className="grid gap-3" onSubmit={createWeek}>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700">Nome da semana</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Semana 12 - 17 a 23/Mar"
              required
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">Início</label>
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">Fim</label>
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
            </div>
          </div>

          <div>
            <Button type="submit" disabled={saving}>
              {saving ? "Criando..." : "Criar semana"}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
