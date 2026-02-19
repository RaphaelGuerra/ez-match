import type { MatchRecord, WeekBundle } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function escapeCsv(value: string | number | undefined) {
  if (value === undefined || value === null) return "";
  let text = String(value);
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/\"/g, '""')}"`;
  }
  return text;
}

function escapeHtml(value: string | undefined) {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function exportMatchesCsv(bundle: WeekBundle) {
  const header = [
    "status",
    "match_type",
    "entry_id",
    "bank_record_id",
    "exception_id",
    "confidence",
    "amount_diff",
    "date_diff_days",
    "notes",
    "admin_note",
  ];

  const rows = bundle.matches.map((match) =>
    [
      match.status,
      match.matchType,
      match.entryId,
      match.bankRecordId,
      match.exceptionId,
      match.confidence,
      match.amountDiff,
      match.dateDiffDays,
      match.notes,
      match.adminNote,
    ]
      .map(escapeCsv)
      .join(","),
  );

  return [header.join(","), ...rows].join("\n");
}

function statusLabel(status: MatchRecord["status"]) {
  const labels: Record<MatchRecord["status"], string> = {
    green: "Verde",
    yellow: "Amarelo",
    orange: "Laranja",
    red: "Vermelho",
    blue: "Azul",
  };
  return labels[status];
}

export function exportPrintHtml(bundle: WeekBundle) {
  const totals = {
    expected: bundle.entries.reduce((sum, item) => sum + item.amount, 0),
    received: bundle.bankRecords.reduce((sum, item) => sum + item.amount, 0),
  };

  const rows = bundle.matches
    .map(
      (match) => `
      <tr>
        <td>${statusLabel(match.status)}</td>
        <td>${escapeHtml(match.matchType)}</td>
        <td>${escapeHtml(match.notes ?? "")}</td>
        <td>${formatCurrency(match.amountDiff)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>Relatório ${escapeHtml(bundle.week.name)}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
        h1 { margin-bottom: 8px; }
        .summary { display: flex; gap: 24px; margin: 16px 0; }
        .card { border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
        @media print {
          body { margin: 8mm; }
        }
      </style>
    </head>
    <body>
      <h1>EZ-Match - ${escapeHtml(bundle.week.name)}</h1>
      <div class="summary">
        <div class="card"><strong>Esperado:</strong> ${formatCurrency(totals.expected)}</div>
        <div class="card"><strong>Recebido:</strong> ${formatCurrency(totals.received)}</div>
        <div class="card"><strong>Diferença:</strong> ${formatCurrency(totals.received - totals.expected)}</div>
      </div>
      <table>
        <thead>
          <tr><th>Status</th><th>Tipo</th><th>Notas</th><th>Diferença</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
  </html>`;
}
