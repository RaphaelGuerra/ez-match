"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ExceptionForm } from "@/components/exception-form";
import type { ExceptionRecord } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function ExceptionsPage() {
  const params = useParams<{ weekId: string }>();
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<Partial<ExceptionRecord> | null>(null);
  const [items, setItems] = useState<ExceptionRecord[]>([]);

  const loadExceptions = useCallback(async () => {
    const response = await fetch(`/api/exceptions?weekId=${params.weekId}`, { cache: "no-store" });
    const data = (await response.json()) as { items?: ExceptionRecord[] };
    setItems(data.items || []);
  }, [params.weekId]);

  useEffect(() => {
    void loadExceptions();
  }, [loadExceptions]);

  async function parseWhatsapp() {
    const response = await fetch("/api/exceptions/parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: input }),
    });

    if (!response.ok) {
      alert("Falha ao parsear texto");
      return;
    }

    const data = (await response.json()) as { parsed?: Partial<ExceptionRecord> };
    setParsed(data.parsed || null);
  }

  async function uploadCsv(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("weekId", params.weekId);
    formData.set("file", file);

    const response = await fetch("/api/exceptions", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      alert("Falha no upload de exceções");
      return;
    }

    await loadExceptions();
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Exceções</h1>

      <Card className="space-y-3">
        <p className="text-sm font-semibold">Parser de WhatsApp</p>
        <Textarea
          placeholder="Cole aqui o texto do WhatsApp"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <Button onClick={parseWhatsapp}>Parsear texto</Button>
      </Card>

      {parsed ? (
        <ExceptionForm
          weekId={params.weekId}
          initial={parsed as ExceptionRecord}
          onSaved={async () => {
            await loadExceptions();
            setParsed(null);
          }}
        />
      ) : null}

      <Card className="space-y-2">
        <p className="text-sm font-semibold">Upload CSV de exceções</p>
        <input type="file" accept=".csv,text/csv" onChange={uploadCsv} />
      </Card>

      <ExceptionForm weekId={params.weekId} onSaved={loadExceptions} />

      <Card>
        <p className="mb-2 text-sm font-semibold">Exceções da semana</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left">
                <th className="px-2 py-2">Tipo</th>
                <th className="px-2 py-2">Hóspede</th>
                <th className="px-2 py-2">Original</th>
                <th className="px-2 py-2">Final</th>
                <th className="px-2 py-2">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-zinc-100">
                  <td className="px-2 py-2">{item.type}</td>
                  <td className="px-2 py-2">{item.guestName || "-"}</td>
                  <td className="px-2 py-2">{formatCurrency(item.originalAmount)}</td>
                  <td className="px-2 py-2">{formatCurrency(item.finalAmount)}</td>
                  <td className="px-2 py-2">{item.reason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
