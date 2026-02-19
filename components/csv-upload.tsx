"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { BankSource } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type UploadKind = "entries" | "bank";

type Props = {
  kind: UploadKind;
  weekId: string;
  onUploaded: () => void;
};

type UploadResult = {
  count: number;
  totalAmount: number;
  preview: Array<Record<string, unknown>>;
};

export function CsvUpload({ kind, weekId, onUploaded }: Props) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [bankSource, setBankSource] = useState<BankSource>("bradesco");
  const [entryDateColumn, setEntryDateColumn] = useState("");
  const [entryAmountColumn, setEntryAmountColumn] = useState("");
  const [entryGuestColumn, setEntryGuestColumn] = useState("");
  const [entryReservationColumn, setEntryReservationColumn] = useState("");
  const [entryDescriptionColumn, setEntryDescriptionColumn] = useState("");
  const [useEntryMapping, setUseEntryMapping] = useState(false);
  const [genericDateColumn, setGenericDateColumn] = useState("");
  const [genericAmountColumn, setGenericAmountColumn] = useState("");
  const [genericDescriptionColumn, setGenericDescriptionColumn] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const endpoint = useMemo(() => {
    return kind === "entries" ? "/api/import/entries" : "/api/import/bank";
  }, [kind]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!files || files.length === 0) {
      alert("Selecione ao menos um arquivo.");
      return;
    }

    const formData = new FormData();
    formData.set("weekId", weekId);

    if (kind === "entries") {
      formData.set("file", files[0]);

      if (useEntryMapping) {
        formData.set(
          "mapping",
          JSON.stringify({
            date: entryDateColumn || undefined,
            amount: entryAmountColumn || undefined,
            guestName: entryGuestColumn || undefined,
            reservationId: entryReservationColumn || undefined,
            description: entryDescriptionColumn || undefined,
          }),
        );
      }
    } else {
      formData.set("bankSource", bankSource);
      Array.from(files).forEach((file) => formData.append("files", file));

      if (bankSource === "generic") {
        if (!genericDateColumn || !genericAmountColumn) {
          alert("No parser genérico, informe as colunas de data e valor.");
          return;
        }

        formData.set(
          "mapping",
          JSON.stringify({
            date: genericDateColumn,
            amount: genericAmountColumn,
            description: genericDescriptionColumn || undefined,
          }),
        );
      }
    }

    setIsUploading(true);
    const response = await fetch(endpoint, { method: "POST", body: formData });
    setIsUploading(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      alert(data?.error || "Falha no upload");
      return;
    }

    const data = (await response.json()) as UploadResult;
    setResult(data);
    onUploaded();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-semibold text-zinc-800">
        {kind === "entries" ? "Upload de Entradas (PMS)" : "Upload de Extrato Bancário"}
      </p>

      {kind === "bank" ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700">Fonte bancária</label>
            <Select value={bankSource} onChange={(event) => setBankSource(event.target.value as BankSource)}>
              <option value="bradesco">Bradesco</option>
              <option value="caixa">Caixa</option>
              <option value="cielo">Cielo</option>
              <option value="pix">Pix</option>
              <option value="generic">Genérico</option>
            </Select>
          </div>

          {bankSource === "generic" ? (
            <div className="grid gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-semibold text-zinc-700">Mapeamento manual de colunas</p>
              <Input
                placeholder="Nome da coluna de data"
                value={genericDateColumn}
                onChange={(event) => setGenericDateColumn(event.target.value)}
              />
              <Input
                placeholder="Nome da coluna de valor"
                value={genericAmountColumn}
                onChange={(event) => setGenericAmountColumn(event.target.value)}
              />
              <Input
                placeholder="Nome da coluna descrição (opcional)"
                value={genericDescriptionColumn}
                onChange={(event) => setGenericDescriptionColumn(event.target.value)}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {kind === "entries" ? (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
            <input
              type="checkbox"
              checked={useEntryMapping}
              onChange={(event) => setUseEntryMapping(event.target.checked)}
            />
            Usar mapeamento manual de colunas (PMS)
          </label>

          {useEntryMapping ? (
            <div className="mt-3 grid gap-2">
              <Input
                placeholder="Coluna data"
                value={entryDateColumn}
                onChange={(event) => setEntryDateColumn(event.target.value)}
              />
              <Input
                placeholder="Coluna valor"
                value={entryAmountColumn}
                onChange={(event) => setEntryAmountColumn(event.target.value)}
              />
              <Input
                placeholder="Coluna hóspede"
                value={entryGuestColumn}
                onChange={(event) => setEntryGuestColumn(event.target.value)}
              />
              <Input
                placeholder="Coluna reserva (opcional)"
                value={entryReservationColumn}
                onChange={(event) => setEntryReservationColumn(event.target.value)}
              />
              <Input
                placeholder="Coluna descrição (opcional)"
                value={entryDescriptionColumn}
                onChange={(event) => setEntryDescriptionColumn(event.target.value)}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <Input
        type="file"
        accept=".csv,text/csv"
        multiple={kind === "bank"}
        onChange={(event) => setFiles(event.target.files)}
      />

      <Button type="submit" disabled={isUploading}>
        {isUploading ? "Enviando..." : "Enviar CSV"}
      </Button>

      {result ? (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
          <p>
            <strong>{result.count}</strong> linhas importadas | Total <strong>{formatCurrency(result.totalAmount)}</strong>
          </p>
          <pre className="mt-2 overflow-auto text-xs text-zinc-700">
            {JSON.stringify(result.preview, null, 2)}
          </pre>
        </div>
      ) : null}
    </form>
  );
}
