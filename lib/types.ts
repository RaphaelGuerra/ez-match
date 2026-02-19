export type WeekStatus = "open" | "reconciled" | "closed";

export type BankSource = "bradesco" | "caixa" | "cielo" | "pix" | "generic";

export type ExceptionType =
  | "discount"
  | "cash"
  | "cancellation"
  | "noshow"
  | "acquirer_fee";

export type ExceptionSource = "whatsapp" | "csv" | "manual";

export type MatchStatus = "green" | "yellow" | "orange" | "red" | "blue";

export type MatchType =
  | "direct"
  | "acquirer_fee"
  | "discount"
  | "exception"
  | "inferred"
  | "unmatched"
  | "unidentified";

export type Entry = {
  id: string;
  weekId: string;
  reservationId?: string;
  guestName?: string;
  description?: string;
  amount: number;
  date: string;
  rawRow?: string;
};

export type BankRecord = {
  id: string;
  weekId: string;
  bankSource: BankSource;
  date: string;
  amount: number;
  description?: string;
  rawRow?: string;
};

export type ExceptionRecord = {
  id: string;
  weekId: string;
  type: ExceptionType;
  reservationId?: string;
  guestName?: string;
  originalAmount?: number;
  finalAmount?: number;
  discountAmount?: number;
  discountPct?: number;
  reason?: string;
  source: ExceptionSource;
  sourceRaw?: string;
  createdAt: string;
};

export type MatchRecord = {
  id: string;
  weekId: string;
  entryId?: string;
  bankRecordId?: string;
  exceptionId?: string;
  status: MatchStatus;
  matchType: MatchType;
  confidence?: number;
  dateDiffDays?: number;
  amountDiff?: number;
  notes?: string;
  adminNote?: string;
  createdAt: string;
};

export type Week = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: WeekStatus;
  createdAt: string;
  closedAt?: string;
  directorToken?: string;
};

export type WeekBundle = {
  week: Week;
  entries: Entry[];
  bankRecords: BankRecord[];
  exceptions: ExceptionRecord[];
  matches: MatchRecord[];
};

export type WeekMetrics = {
  totalEntries: number;
  totalBankRecords: number;
  totalMatches: number;
  pendingCount: number;
  reconciledPct: number;
  byStatus: Record<MatchStatus, number>;
  expectedTotal: number;
  receivedTotal: number;
  diffTotal: number;
};
