import Papa from "papaparse";
import { parseFlexibleDate, parseMoney } from "@/lib/utils";

export type RawCsvRow = Record<string, string>;

export function decodeCsvBuffer(buffer: ArrayBuffer) {
  const utf8 = new TextDecoder("utf-8", { fatal: true });

  try {
    return utf8.decode(buffer);
  } catch {
    return new TextDecoder("iso-8859-1").decode(buffer);
  }
}

export function stripBom(text: string) {
  return text.replace(/^\uFEFF/, "");
}

export function parseCsvText(text: string): RawCsvRow[] {
  const cleaned = stripBom(text);

  const parsed = Papa.parse<RawCsvRow>(cleaned, {
    header: true,
    delimiter: "",
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    const first = parsed.errors[0];
    throw new Error(`Erro ao processar CSV: ${first.message}`);
  }

  return parsed.data.map((row) => {
    const normalized: RawCsvRow = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key.trim()] = (value ?? "").trim();
    }
    return normalized;
  });
}

export function parseCsvBuffer(buffer: ArrayBuffer) {
  return parseCsvText(decodeCsvBuffer(buffer));
}

export function pickByAlias(row: RawCsvRow, aliases: string[]) {
  const map = Object.fromEntries(
    Object.keys(row).map((key) => [key.toLowerCase().trim(), row[key]]),
  );

  for (const alias of aliases) {
    const value = map[alias.toLowerCase().trim()];
    if (typeof value === "string" && value.length > 0) return value;
  }

  return "";
}

export function normalizeDate(input: string) {
  return parseFlexibleDate(input);
}

export function normalizeAmount(input: string) {
  return parseMoney(input);
}
