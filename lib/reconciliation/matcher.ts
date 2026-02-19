import type { BankRecord, Entry, ExceptionRecord, MatchRecord } from "@/lib/types";
import { confidenceForMatchType } from "@/lib/reconciliation/confidence";
import {
  acquirerFeeRule,
  amountApproxRule,
  cashOrCancellationRule,
  dateToleranceRule,
  directRule,
  discountRule,
} from "@/lib/reconciliation/rules";
import { differenceInDays } from "@/lib/utils";

type MatchResult = Omit<MatchRecord, "id" | "createdAt">;

type MatchInput = {
  weekId: string;
  entries: Entry[];
  bankRecords: BankRecord[];
  exceptions: ExceptionRecord[];
  cieloFeePct?: number;
};

function findExceptionForEntry(entry: Entry, exceptions: ExceptionRecord[]) {
  return exceptions.find(
    (exception) =>
      (entry.reservationId && exception.reservationId && exception.reservationId === entry.reservationId) ||
      (!!entry.guestName && !!exception.guestName && exception.guestName === entry.guestName),
  );
}

export function reconcileWeek({
  weekId,
  entries,
  bankRecords,
  exceptions,
  cieloFeePct = Number(process.env.CIELO_FEE_PCT || 0.04),
}: MatchInput): MatchResult[] {
  const matches: MatchResult[] = [];
  const usedEntries = new Set<string>();
  const usedBankRecords = new Set<string>();

  const sortedEntries = [...entries].sort((a, b) => b.amount - a.amount);

  for (const entry of sortedEntries) {
    if (usedEntries.has(entry.id)) continue;

    const exception = findExceptionForEntry(entry, exceptions);
    const availableBankRecords = bankRecords.filter((bank) => !usedBankRecords.has(bank.id));

    const direct = availableBankRecords.find((bank) => directRule(entry, bank));
    if (direct) {
      usedEntries.add(entry.id);
      usedBankRecords.add(direct.id);
      matches.push({
        weekId,
        entryId: entry.id,
        bankRecordId: direct.id,
        status: "green",
        matchType: "direct",
        confidence: confidenceForMatchType("direct"),
        dateDiffDays: 0,
        amountDiff: direct.amount - entry.amount,
        notes: "Matching direto",
      });
      continue;
    }

    const acquirer = availableBankRecords.find((bank) => acquirerFeeRule(entry, bank, cieloFeePct));
    if (acquirer) {
      usedEntries.add(entry.id);
      usedBankRecords.add(acquirer.id);
      const expected = entry.amount * (1 - cieloFeePct);
      matches.push({
        weekId,
        entryId: entry.id,
        bankRecordId: acquirer.id,
        status: "green",
        matchType: "acquirer_fee",
        confidence: confidenceForMatchType("acquirer_fee"),
        dateDiffDays: Math.abs(differenceInDays(entry.date, acquirer.date)),
        amountDiff: acquirer.amount - expected,
        notes: `Taxa adquirente Cielo ${(cieloFeePct * 100).toFixed(2)}%`,
      });
      continue;
    }

    const discount = availableBankRecords.find((bank) => discountRule(exception, bank));
    if (discount && exception) {
      usedEntries.add(entry.id);
      usedBankRecords.add(discount.id);
      matches.push({
        weekId,
        entryId: entry.id,
        bankRecordId: discount.id,
        exceptionId: exception.id,
        status: "yellow",
        matchType: "discount",
        confidence: confidenceForMatchType("discount"),
        dateDiffDays: Math.abs(differenceInDays(entry.date, discount.date)),
        amountDiff: discount.amount - entry.amount,
        notes: "Desconto registrado",
      });
      continue;
    }

    if (cashOrCancellationRule(exception)) {
      usedEntries.add(entry.id);
      matches.push({
        weekId,
        entryId: entry.id,
        exceptionId: exception?.id,
        status: "green",
        matchType: "exception",
        confidence: confidenceForMatchType("exception"),
        notes: `Exceção: ${exception?.type ?? "manual"}`,
      });
      continue;
    }

    const dateTolerance = availableBankRecords.find((bank) => dateToleranceRule(entry, bank));
    if (dateTolerance) {
      usedEntries.add(entry.id);
      usedBankRecords.add(dateTolerance.id);
      matches.push({
        weekId,
        entryId: entry.id,
        bankRecordId: dateTolerance.id,
        status: "orange",
        matchType: "inferred",
        confidence: 0.7,
        dateDiffDays: Math.abs(differenceInDays(entry.date, dateTolerance.date)),
        amountDiff: dateTolerance.amount - entry.amount,
        notes: "Valor igual com tolerância de data (<=2 dias)",
      });
      continue;
    }

    const approxAmount = availableBankRecords.find((bank) => amountApproxRule(entry, bank));
    if (approxAmount) {
      usedEntries.add(entry.id);
      usedBankRecords.add(approxAmount.id);
      matches.push({
        weekId,
        entryId: entry.id,
        bankRecordId: approxAmount.id,
        status: "orange",
        matchType: "inferred",
        confidence: 0.5,
        dateDiffDays: Math.abs(differenceInDays(entry.date, approxAmount.date)),
        amountDiff: approxAmount.amount - entry.amount,
        notes: "Valor aproximado (<=5%) e data <=2 dias",
      });
      continue;
    }

    usedEntries.add(entry.id);
    matches.push({
      weekId,
      entryId: entry.id,
      status: "red",
      matchType: "unmatched",
      confidence: 0,
      notes: "Entrada sem correspondência bancária",
    });
  }

  const unmatchedBank = bankRecords.filter((record) => !usedBankRecords.has(record.id));
  for (const bank of unmatchedBank) {
    matches.push({
      weekId,
      bankRecordId: bank.id,
      status: "blue",
      matchType: "unidentified",
      confidence: 0,
      notes: "Pagamento sem origem no PMS",
    });
  }

  return matches;
}
