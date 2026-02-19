CREATE TABLE weeks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  director_token TEXT,
  created_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  week_id TEXT NOT NULL REFERENCES weeks(id),
  reservation_id TEXT,
  guest_name TEXT,
  description TEXT,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  raw_row TEXT
);

CREATE TABLE bank_records (
  id TEXT PRIMARY KEY,
  week_id TEXT NOT NULL REFERENCES weeks(id),
  bank_source TEXT NOT NULL,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  raw_row TEXT
);

CREATE TABLE exceptions (
  id TEXT PRIMARY KEY,
  week_id TEXT NOT NULL REFERENCES weeks(id),
  type TEXT NOT NULL,
  reservation_id TEXT,
  guest_name TEXT,
  original_amount REAL,
  final_amount REAL,
  discount_amount REAL,
  discount_pct REAL,
  reason TEXT,
  source TEXT NOT NULL,
  source_raw TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  week_id TEXT NOT NULL REFERENCES weeks(id),
  entry_id TEXT REFERENCES entries(id),
  bank_record_id TEXT REFERENCES bank_records(id),
  exception_id TEXT REFERENCES exceptions(id),
  status TEXT NOT NULL,
  match_type TEXT NOT NULL,
  confidence REAL,
  date_diff_days INTEGER,
  amount_diff REAL,
  notes TEXT,
  admin_note TEXT,
  created_at TEXT NOT NULL
);
