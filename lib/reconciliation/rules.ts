import type { BankRecord, Entry, ExceptionRecord } from "@/lib/types";
import { approxEqual, differenceInDays, percentDiff } from "@/lib/utils";

export function directRule(entry: Entry, bank: BankRecord) {
  const dateDiff = Math.abs(differenceInDays(entry.date, bank.date));
  return approxEqual(entry.amount, bank.amount, 0.01) && dateDiff === 0;
}

export function acquirerFeeRule(entry: Entry, bank: BankRecord, cieloFeePct: number) {
  if (bank.bankSource !== "cielo") return false;
  const netExpected = entry.amount * (1 - cieloFeePct);
  return approxEqual(netExpected, bank.amount, 0.1);
}

export function discountRule(exception: ExceptionRecord | undefined, bank: BankRecord) {
  if (!exception || exception.type !== "discount") return false;
  if (typeof exception.finalAmount !== "number") return false;
  return approxEqual(exception.finalAmount, bank.amount, 0.01);
}

export function cashOrCancellationRule(exception: ExceptionRecord | undefined) {
  if (!exception) return false;
  return ["cash", "cancellation", "noshow"].includes(exception.type);
}

export function dateToleranceRule(entry: Entry, bank: BankRecord) {
  const dateDiff = Math.abs(differenceInDays(entry.date, bank.date));
  return approxEqual(entry.amount, bank.amount, 0.01) && dateDiff <= 2;
}

export function amountApproxRule(entry: Entry, bank: BankRecord) {
  const dateDiff = Math.abs(differenceInDays(entry.date, bank.date));
  return percentDiff(entry.amount, bank.amount) <= 0.05 && dateDiff <= 2;
}
