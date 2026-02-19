"use client";

import type { MatchRecord } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  matches: MatchRecord[];
  statusFilter: "all" | MatchRecord["status"];
  onConfirmOrange: (matchId: string) => void;
  onReclassifyRed: (matchId: string) => void;
  onSaveRedNote: (matchId: string, note: string) => void;
};

const rowColor: Record<MatchRecord["status"], string> = {
  green: "bg-emerald-50",
  yellow: "bg-yellow-50",
  orange: "bg-orange-50",
  red: "bg-rose-50",
  blue: "bg-sky-50",
};

const statusEmoji: Record<MatchRecord["status"], string> = {
  green: "🟢",
  yellow: "🟡",
  orange: "🟠",
  red: "🔴",
  blue: "🔵",
};

export function MatchTable({
  matches,
  statusFilter,
  onConfirmOrange,
  onReclassifyRed,
  onSaveRedNote,
}: Props) {
  const items =
    statusFilter === "all" ? matches : matches.filter((match) => match.status === statusFilter);

  if (items.length === 0) {
    return <p className="text-sm text-zinc-600">Sem itens para o filtro selecionado.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-zinc-100 text-left text-zinc-700">
          <tr>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Confiança</th>
            <th className="px-3 py-2">Diferença</th>
            <th className="px-3 py-2">Notas</th>
            <th className="px-3 py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((match) => (
            <tr key={match.id} className={cn("border-t border-zinc-200 align-top", rowColor[match.status])}>
              <td className="px-3 py-2 font-medium">{statusEmoji[match.status]} {match.status}</td>
              <td className="px-3 py-2">{match.matchType}</td>
              <td className="px-3 py-2">{match.confidence?.toFixed(2) ?? "0.00"}</td>
              <td className="px-3 py-2">{formatCurrency(match.amountDiff)}</td>
              <td className="px-3 py-2">
                <div className="space-y-2">
                  <p>{match.notes || "-"}</p>
                  {match.status === "red" ? (
                    <Textarea
                      defaultValue={match.adminNote || ""}
                      placeholder="Nota obrigatória para itens vermelhos"
                      onBlur={(event) => onSaveRedNote(match.id, event.target.value)}
                    />
                  ) : null}
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-2">
                  {match.status === "orange" ? (
                    <>
                      <Button size="sm" onClick={() => onConfirmOrange(match.id)}>
                        Confirmar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onReclassifyRed(match.id)}>
                        Reclassificar
                      </Button>
                    </>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
