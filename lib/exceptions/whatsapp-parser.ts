import type { ExceptionRecord, ExceptionType } from "@/lib/types";
import { parseMoney } from "@/lib/utils";

const ORIGINAL_PATTERNS = [
  /(?:de\s*R\$|era\s*R\$|original\s*R\$|valor\s*original\s*R\$)\s*([\d.,]+)/i,
  /R\$\s*([\d.,]+)\s*(?:original|antes)/i,
];

const FINAL_PATTERNS = [
  /(?:para\s*R\$|pagou\s*R\$|recebeu\s*R\$|ficou\s*R\$|valor\s*final\s*R\$)\s*([\d.,]+)/i,
];

const REASON_PATTERN = /(?:motivo\s*:\s*|porque\s+|por conta de\s+)(.+)$/i;

export type ParsedWhatsappException = Partial<ExceptionRecord> & {
  confidence: number;
};

function guessType(text: string): ExceptionType {
  const lower = text.toLowerCase();
  if (lower.includes("cash") || lower.includes("dinheiro")) return "cash";
  if (lower.includes("cancel")) return "cancellation";
  if (lower.includes("no-show") || lower.includes("noshow") || lower.includes("não veio")) {
    return "noshow";
  }
  return "discount";
}

export function parseWhatsappExceptionText(input: string): ParsedWhatsappException {
  const text = input.trim();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const guestName = lines[0] || "";

  const originalMatch = ORIGINAL_PATTERNS.map((pattern) => text.match(pattern)).find(Boolean);
  const finalMatch = FINAL_PATTERNS.map((pattern) => text.match(pattern)).find(Boolean);

  const originalAmount = parseMoney(originalMatch?.[1]);
  const finalAmount = parseMoney(finalMatch?.[1]);
  const discountAmount = originalAmount > finalAmount ? originalAmount - finalAmount : 0;
  const discountPct = originalAmount ? (discountAmount / originalAmount) * 100 : 0;

  const reason = text.match(REASON_PATTERN)?.[1]?.trim() || "";

  const confidence = [guestName, originalAmount, finalAmount].filter(Boolean).length / 3;

  return {
    type: guessType(text),
    guestName,
    originalAmount: originalAmount || undefined,
    finalAmount: finalAmount || undefined,
    discountAmount: discountAmount || undefined,
    discountPct: discountPct || undefined,
    reason,
    source: "whatsapp",
    sourceRaw: text,
    confidence,
  };
}
