import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function nowIso() {
  return new Date().toISOString();
}

export function toIsoDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function formatDateBr(isoDate?: string) {
  if (!isoDate) return "-";
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

export function formatCurrency(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function parseMoney(input: string | number | null | undefined) {
  if (typeof input === "number") return input;
  if (!input) return 0;

  const cleaned = String(input)
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/[^\d,.-]/g, "");

  if (!cleaned) return 0;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = cleaned.replace(/,/g, "");
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseFlexibleDate(input?: string | null) {
  if (!input) return "";
  const raw = input.trim();

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;

  const brDash = raw.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (brDash) return `${brDash[3]}-${brDash[2]}-${brDash[1]}`;

  const jsDate = new Date(raw);
  if (!Number.isNaN(jsDate.getTime())) {
    return toIsoDate(jsDate);
  }

  return "";
}

export function differenceInDays(left: string, right: string) {
  const leftDate = new Date(`${left}T00:00:00`).getTime();
  const rightDate = new Date(`${right}T00:00:00`).getTime();
  if (!leftDate || !rightDate) return 0;
  return Math.round((leftDate - rightDate) / 86_400_000);
}

export function approxEqual(a: number, b: number, tolerance = 0.01) {
  return Math.abs(a - b) <= tolerance;
}

export function percentDiff(base: number, target: number) {
  if (!base) return 0;
  return Math.abs((target - base) / base);
}

export function parseJsonSafe<T>(input: string | undefined, fallback: T): T {
  if (!input) return fallback;
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}
