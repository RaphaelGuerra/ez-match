import type { MatchRecord } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Props = {
  expectedTotal: number;
  receivedTotal: number;
  byStatus: Record<MatchRecord["status"], number>;
};

export function ReportSummary({ expectedTotal, receivedTotal, byStatus }: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Esperado</p>
        <p className="text-2xl font-semibold text-zinc-900">{formatCurrency(expectedTotal)}</p>
      </Card>
      <Card>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Recebido</p>
        <p className="text-2xl font-semibold text-zinc-900">{formatCurrency(receivedTotal)}</p>
      </Card>
      <Card>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Diferença</p>
        <p className="text-2xl font-semibold text-zinc-900">
          {formatCurrency(receivedTotal - expectedTotal)}
        </p>
      </Card>

      <Card className="md:col-span-3">
        <div className="grid gap-2 md:grid-cols-5 text-sm">
          <p>🟢 {byStatus.green}</p>
          <p>🟡 {byStatus.yellow}</p>
          <p>🟠 {byStatus.orange}</p>
          <p>🔴 {byStatus.red}</p>
          <p>🔵 {byStatus.blue}</p>
        </div>
      </Card>
    </div>
  );
}
