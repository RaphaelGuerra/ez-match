"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ExceptionRecord } from "@/lib/types";

type Props = {
  weekId: string;
  initial?: Partial<ExceptionRecord>;
  onSaved: () => void;
};

export function ExceptionForm({ weekId, initial, onSaved }: Props) {
  const [type, setType] = useState(initial?.type || "discount");
  const [guestName, setGuestName] = useState(initial?.guestName || "");
  const [reservationId, setReservationId] = useState(initial?.reservationId || "");
  const [originalAmount, setOriginalAmount] = useState(String(initial?.originalAmount || ""));
  const [finalAmount, setFinalAmount] = useState(String(initial?.finalAmount || ""));
  const [reason, setReason] = useState(initial?.reason || "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      weekId,
      type,
      guestName,
      reservationId,
      originalAmount: originalAmount ? Number.parseFloat(originalAmount) : undefined,
      finalAmount: finalAmount ? Number.parseFloat(finalAmount) : undefined,
      reason,
      source: initial?.source || "manual",
      sourceRaw: initial?.sourceRaw,
    };

    const response = await fetch("/api/exceptions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!response.ok) {
      alert("Falha ao salvar exceção.");
      return;
    }

    onSaved();

    if (!initial) {
      setGuestName("");
      setReservationId("");
      setOriginalAmount("");
      setFinalAmount("");
      setReason("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700">Tipo</label>
          <Select
            value={type}
            onChange={(event) =>
              setType(event.target.value as "discount" | "cash" | "cancellation" | "noshow" | "acquirer_fee")
            }
          >
            <option value="discount">discount</option>
            <option value="cash">cash</option>
            <option value="cancellation">cancellation</option>
            <option value="noshow">noshow</option>
            <option value="acquirer_fee">acquirer_fee</option>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700">Reserva</label>
          <Input value={reservationId} onChange={(event) => setReservationId(event.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700">Hóspede</label>
          <Input value={guestName} onChange={(event) => setGuestName(event.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700">Valor original</label>
          <Input
            value={originalAmount}
            onChange={(event) => setOriginalAmount(event.target.value)}
            inputMode="decimal"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700">Valor final</label>
          <Input
            value={finalAmount}
            onChange={(event) => setFinalAmount(event.target.value)}
            inputMode="decimal"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-zinc-700">Motivo</label>
        <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
      </div>

      <div>
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar exceção"}
        </Button>
      </div>
    </form>
  );
}
