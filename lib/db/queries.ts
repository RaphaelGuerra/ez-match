import { v4 as uuid } from "uuid";
import { getDb } from "@/lib/db/client";
import type {
  BankRecord,
  Entry,
  ExceptionRecord,
  MatchRecord,
  Week,
  WeekBundle,
  WeekMetrics,
} from "@/lib/types";
import { nowIso } from "@/lib/utils";

type WeekRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: Week["status"];
  director_token: string | null;
  created_at: string;
  closed_at: string | null;
};

type EntryRow = {
  id: string;
  week_id: string;
  reservation_id: string | null;
  guest_name: string | null;
  description: string | null;
  amount: number;
  date: string;
  raw_row: string | null;
};

type BankRow = {
  id: string;
  week_id: string;
  bank_source: BankRecord["bankSource"];
  date: string;
  amount: number;
  description: string | null;
  raw_row: string | null;
};

type ExceptionRow = {
  id: string;
  week_id: string;
  type: ExceptionRecord["type"];
  reservation_id: string | null;
  guest_name: string | null;
  original_amount: number | null;
  final_amount: number | null;
  discount_amount: number | null;
  discount_pct: number | null;
  reason: string | null;
  source: ExceptionRecord["source"];
  source_raw: string | null;
  created_at: string;
};

type MatchRow = {
  id: string;
  week_id: string;
  entry_id: string | null;
  bank_record_id: string | null;
  exception_id: string | null;
  status: MatchRecord["status"];
  match_type: MatchRecord["matchType"];
  confidence: number | null;
  date_diff_days: number | null;
  amount_diff: number | null;
  notes: string | null;
  admin_note: string | null;
  created_at: string;
};

function mapWeek(row: WeekRow): Week {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    directorToken: row.director_token ?? undefined,
    createdAt: row.created_at,
    closedAt: row.closed_at ?? undefined,
  };
}

function mapEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    weekId: row.week_id,
    reservationId: row.reservation_id ?? undefined,
    guestName: row.guest_name ?? undefined,
    description: row.description ?? undefined,
    amount: row.amount,
    date: row.date,
    rawRow: row.raw_row ?? undefined,
  };
}

function mapBank(row: BankRow): BankRecord {
  return {
    id: row.id,
    weekId: row.week_id,
    bankSource: row.bank_source,
    date: row.date,
    amount: row.amount,
    description: row.description ?? undefined,
    rawRow: row.raw_row ?? undefined,
  };
}

function mapException(row: ExceptionRow): ExceptionRecord {
  return {
    id: row.id,
    weekId: row.week_id,
    type: row.type,
    reservationId: row.reservation_id ?? undefined,
    guestName: row.guest_name ?? undefined,
    originalAmount: row.original_amount ?? undefined,
    finalAmount: row.final_amount ?? undefined,
    discountAmount: row.discount_amount ?? undefined,
    discountPct: row.discount_pct ?? undefined,
    reason: row.reason ?? undefined,
    source: row.source,
    sourceRaw: row.source_raw ?? undefined,
    createdAt: row.created_at,
  };
}

function mapMatch(row: MatchRow): MatchRecord {
  return {
    id: row.id,
    weekId: row.week_id,
    entryId: row.entry_id ?? undefined,
    bankRecordId: row.bank_record_id ?? undefined,
    exceptionId: row.exception_id ?? undefined,
    status: row.status,
    matchType: row.match_type,
    confidence: row.confidence ?? undefined,
    dateDiffDays: row.date_diff_days ?? undefined,
    amountDiff: row.amount_diff ?? undefined,
    notes: row.notes ?? undefined,
    adminNote: row.admin_note ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getWeekById(weekId: string) {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM weeks WHERE id = ?").bind(weekId).first<WeekRow>();
  return row ? mapWeek(row) : undefined;
}

export async function listWeeks() {
  const db = await getDb();
  const result = await db.prepare("SELECT * FROM weeks ORDER BY start_date DESC").all<WeekRow>();
  const rows = result.results ?? [];

  const items = await Promise.all(
    rows.map(async (row) => {
      const week = mapWeek(row);
      const metrics = await getWeekMetrics(week.id);
      return { week, metrics };
    }),
  );

  return items;
}

export async function createWeek(input: { name: string; startDate: string; endDate: string }) {
  const db = await getDb();

  const week: Week = {
    id: uuid(),
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    status: "open",
    createdAt: nowIso(),
  };

  await db
    .prepare(
      `INSERT INTO weeks (id, name, start_date, end_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(week.id, week.name, week.startDate, week.endDate, week.status, week.createdAt)
    .run();

  return week;
}

export async function setWeekStatus(weekId: string, status: Exclude<Week["status"], "closed">) {
  const db = await getDb();
  await db.prepare("UPDATE weeks SET status = ? WHERE id = ?").bind(status, weekId).run();
  return getWeekById(weekId);
}

export async function replaceWeekEntries(weekId: string, entries: Omit<Entry, "id">[]) {
  const db = await getDb();

  await db.prepare("DELETE FROM entries WHERE week_id = ?").bind(weekId).run();

  if (entries.length === 0) return [];

  const inserted = entries.map((entry) => ({ ...entry, id: uuid() }));
  await db.batch(
    inserted.map((entry) =>
      db
        .prepare(
          `INSERT INTO entries (id, week_id, reservation_id, guest_name, description, amount, date, raw_row)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          entry.id,
          entry.weekId,
          entry.reservationId ?? null,
          entry.guestName ?? null,
          entry.description ?? null,
          entry.amount,
          entry.date,
          entry.rawRow ?? null,
        ),
    ),
  );

  return inserted;
}

export async function appendBankRecords(records: Omit<BankRecord, "id">[]) {
  const db = await getDb();

  if (records.length === 0) return [];

  const inserted = records.map((record) => ({ ...record, id: uuid() }));
  await db.batch(
    inserted.map((record) =>
      db
        .prepare(
          `INSERT INTO bank_records (id, week_id, bank_source, date, amount, description, raw_row)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          record.id,
          record.weekId,
          record.bankSource,
          record.date,
          record.amount,
          record.description ?? null,
          record.rawRow ?? null,
        ),
    ),
  );

  return inserted;
}

export async function appendExceptions(records: Omit<ExceptionRecord, "id" | "createdAt">[]) {
  const db = await getDb();

  if (records.length === 0) return [];

  const inserted = records.map((record) => ({
    ...record,
    id: uuid(),
    createdAt: nowIso(),
  }));

  await db.batch(
    inserted.map((record) =>
      db
        .prepare(
          `INSERT INTO exceptions (
            id, week_id, type, reservation_id, guest_name, original_amount, final_amount,
            discount_amount, discount_pct, reason, source, source_raw, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          record.id,
          record.weekId,
          record.type,
          record.reservationId ?? null,
          record.guestName ?? null,
          record.originalAmount ?? null,
          record.finalAmount ?? null,
          record.discountAmount ?? null,
          record.discountPct ?? null,
          record.reason ?? null,
          record.source,
          record.sourceRaw ?? null,
          record.createdAt,
        ),
    ),
  );

  return inserted;
}

export async function updateException(
  id: string,
  patch: Partial<Omit<ExceptionRecord, "id" | "weekId" | "createdAt">>,
) {
  const db = await getDb();

  const allowed = {
    type: patch.type,
    reservation_id: patch.reservationId,
    guest_name: patch.guestName,
    original_amount: patch.originalAmount,
    final_amount: patch.finalAmount,
    discount_amount: patch.discountAmount,
    discount_pct: patch.discountPct,
    reason: patch.reason,
    source: patch.source,
    source_raw: patch.sourceRaw,
  };

  const entries = Object.entries(allowed).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    const row = await db.prepare("SELECT * FROM exceptions WHERE id = ?").bind(id).first<ExceptionRow>();
    return row ? mapException(row) : undefined;
  }

  const setSql = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value ?? null);

  await db
    .prepare(`UPDATE exceptions SET ${setSql} WHERE id = ?`)
    .bind(...values, id)
    .run();

  const row = await db.prepare("SELECT * FROM exceptions WHERE id = ?").bind(id).first<ExceptionRow>();
  return row ? mapException(row) : undefined;
}

export async function deleteException(id: string) {
  const db = await getDb();
  const result = await db.prepare("DELETE FROM exceptions WHERE id = ?").bind(id).run();
  return Number(result.meta.changes || 0) > 0;
}

export async function replaceMatches(weekId: string, matches: Omit<MatchRecord, "id" | "createdAt">[]) {
  const db = await getDb();

  await db.prepare("DELETE FROM matches WHERE week_id = ?").bind(weekId).run();

  if (matches.length === 0) return [];

  const inserted = matches.map((match) => ({
    ...match,
    id: uuid(),
    createdAt: nowIso(),
  }));

  await db.batch(
    inserted.map((match) =>
      db
        .prepare(
          `INSERT INTO matches (
             id, week_id, entry_id, bank_record_id, exception_id,
             status, match_type, confidence, date_diff_days, amount_diff,
             notes, admin_note, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          match.id,
          match.weekId,
          match.entryId ?? null,
          match.bankRecordId ?? null,
          match.exceptionId ?? null,
          match.status,
          match.matchType,
          match.confidence ?? null,
          match.dateDiffDays ?? null,
          match.amountDiff ?? null,
          match.notes ?? null,
          match.adminNote ?? null,
          match.createdAt,
        ),
    ),
  );

  return inserted;
}

export async function updateMatch(
  id: string,
  patch: Partial<Pick<MatchRecord, "status" | "notes" | "adminNote">>,
) {
  const db = await getDb();

  const allowed = {
    status: patch.status,
    notes: patch.notes,
    admin_note: patch.adminNote,
  };

  const entries = Object.entries(allowed).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    const row = await db.prepare("SELECT * FROM matches WHERE id = ?").bind(id).first<MatchRow>();
    return row ? mapMatch(row) : undefined;
  }

  const setSql = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value ?? null);

  await db
    .prepare(`UPDATE matches SET ${setSql} WHERE id = ?`)
    .bind(...values, id)
    .run();

  const row = await db.prepare("SELECT * FROM matches WHERE id = ?").bind(id).first<MatchRow>();
  return row ? mapMatch(row) : undefined;
}

async function listEntriesByWeek(weekId: string) {
  const db = await getDb();
  const result = await db
    .prepare("SELECT * FROM entries WHERE week_id = ? ORDER BY amount DESC")
    .bind(weekId)
    .all<EntryRow>();

  return (result.results ?? []).map(mapEntry);
}

async function listBankRecordsByWeek(weekId: string) {
  const db = await getDb();
  const result = await db
    .prepare("SELECT * FROM bank_records WHERE week_id = ? ORDER BY amount DESC")
    .bind(weekId)
    .all<BankRow>();

  return (result.results ?? []).map(mapBank);
}

async function listExceptionsByWeek(weekId: string) {
  const db = await getDb();
  const result = await db
    .prepare("SELECT * FROM exceptions WHERE week_id = ? ORDER BY created_at DESC")
    .bind(weekId)
    .all<ExceptionRow>();

  return (result.results ?? []).map(mapException);
}

async function listMatchesByWeek(weekId: string) {
  const db = await getDb();
  const result = await db
    .prepare("SELECT * FROM matches WHERE week_id = ? ORDER BY created_at DESC")
    .bind(weekId)
    .all<MatchRow>();

  return (result.results ?? []).map(mapMatch);
}

export async function getWeekBundle(weekId: string): Promise<WeekBundle | undefined> {
  const week = await getWeekById(weekId);
  if (!week) return undefined;

  const [entries, bankRecords, exceptions, matches] = await Promise.all([
    listEntriesByWeek(weekId),
    listBankRecordsByWeek(weekId),
    listExceptionsByWeek(weekId),
    listMatchesByWeek(weekId),
  ]);

  return {
    week,
    entries,
    bankRecords,
    exceptions,
    matches,
  };
}

export async function getWeekMetrics(weekId: string): Promise<WeekMetrics> {
  const bundle = await getWeekBundle(weekId);
  if (!bundle) {
    return {
      totalEntries: 0,
      totalBankRecords: 0,
      totalMatches: 0,
      pendingCount: 0,
      reconciledPct: 0,
      byStatus: { green: 0, yellow: 0, orange: 0, red: 0, blue: 0 },
      expectedTotal: 0,
      receivedTotal: 0,
      diffTotal: 0,
    };
  }

  const byStatus = bundle.matches.reduce<WeekMetrics["byStatus"]>(
    (acc, match) => {
      acc[match.status] += 1;
      return acc;
    },
    { green: 0, yellow: 0, orange: 0, red: 0, blue: 0 },
  );

  const expectedTotal = bundle.entries.reduce((sum, entry) => sum + entry.amount, 0);
  const receivedTotal = bundle.bankRecords.reduce((sum, record) => sum + record.amount, 0);
  const totalEntries = bundle.entries.length;
  const reconciled = byStatus.green + byStatus.yellow;

  return {
    totalEntries,
    totalBankRecords: bundle.bankRecords.length,
    totalMatches: bundle.matches.length,
    pendingCount: byStatus.red + byStatus.orange + byStatus.blue,
    reconciledPct: totalEntries ? (reconciled / totalEntries) * 100 : 0,
    byStatus,
    expectedTotal,
    receivedTotal,
    diffTotal: receivedTotal - expectedTotal,
  };
}

export async function closeWeek(weekId: string) {
  const db = await getDb();
  const bundle = await getWeekBundle(weekId);
  if (!bundle) {
    throw new Error("Semana não encontrada.");
  }

  const missingNote = bundle.matches.some(
    (match) => match.status === "red" && !match.adminNote?.trim(),
  );
  if (missingNote) {
    throw new Error("Todos os itens vermelhos precisam de nota antes de fechar.");
  }

  const token = bundle.week.directorToken || uuid();
  const closedAt = nowIso();

  await db
    .prepare("UPDATE weeks SET status = 'closed', closed_at = ?, director_token = ? WHERE id = ?")
    .bind(closedAt, token, weekId)
    .run();

  const updated = await getWeekById(weekId);
  if (!updated) {
    throw new Error("Falha ao fechar semana.");
  }

  return updated;
}
