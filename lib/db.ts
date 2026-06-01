import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// ── Database path ──
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'transum.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── Singleton connection ──
let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(DB_PATH);

  // Performance pragmas
  _db.pragma('journal_mode = WAL');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('cache_size = -64000'); // 64MB cache
  _db.pragma('foreign_keys = ON');

  // ── Create table ──
  _db.exec(`
    CREATE TABLE IF NOT EXISTS passenger_records (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      halte_id        TEXT    NOT NULL,
      timestamp       TEXT    NOT NULL,
      masuk           INTEGER NOT NULL,
      keluar          INTEGER NOT NULL,
      total_saat_ini  INTEGER NOT NULL,
      hour            INTEGER NOT NULL,
      day_of_week     INTEGER NOT NULL,
      source          TEXT    NOT NULL DEFAULT 'mqtt',
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── Indexes for fast queries ──
  _db.exec(`
    CREATE INDEX IF NOT EXISTS idx_records_halte_time
      ON passenger_records (halte_id, timestamp);
  `);
  _db.exec(`
    CREATE INDEX IF NOT EXISTS idx_records_halte_hour_dow
      ON passenger_records (halte_id, hour, day_of_week);
  `);

  // ── Auto-cleanup: remove records older than 30 days ──
  _db.exec(`
    DELETE FROM passenger_records
    WHERE timestamp < datetime('now', '-30 days');
  `);

  return _db;
}

// ── Types ──
export interface RecordInsert {
  halte_id: string;
  timestamp: string;
  masuk: number;
  keluar: number;
  total_saat_ini: number;
  source?: string;
}

// ── Prepared Statements (lazy-initialized) ──

let _insertStmt: Database.Statement | null = null;

function getInsertStmt() {
  if (!_insertStmt) {
    _insertStmt = getDb().prepare(`
      INSERT INTO passenger_records (halte_id, timestamp, masuk, keluar, total_saat_ini, hour, day_of_week, source)
      VALUES (@halte_id, @timestamp, @masuk, @keluar, @total_saat_ini, @hour, @day_of_week, @source)
    `);
  }
  return _insertStmt;
}

// ── Public API ──

/**
 * Batch-insert passenger records in a single transaction.
 */
export function insertRecords(records: RecordInsert[]): number {
  const db = getDb();
  const stmt = getInsertStmt();

  const insertMany = db.transaction((items: RecordInsert[]) => {
    let count = 0;
    for (const record of items) {
      const dt = new Date(record.timestamp);
      stmt.run({
        halte_id: record.halte_id,
        timestamp: record.timestamp,
        masuk: record.masuk,
        keluar: record.keluar,
        total_saat_ini: record.total_saat_ini,
        hour: dt.getHours(),
        day_of_week: dt.getDay(),
        source: record.source ?? 'mqtt',
      });
      count++;
    }
    return count;
  });

  return insertMany(records);
}

/**
 * Query historical records for a halte within a lookback window.
 */
export function getHistory(halteId: string | null, hours: number = 24) {
  const db = getDb();

  if (halteId && halteId !== 'all') {
    return db.prepare(`
      SELECT halte_id, timestamp, masuk, keluar, total_saat_ini, hour, day_of_week, source
      FROM passenger_records
      WHERE halte_id = ? AND timestamp >= datetime('now', '-' || ? || ' hours')
      ORDER BY timestamp ASC
    `).all(halteId, hours);
  }

  return db.prepare(`
    SELECT halte_id, timestamp, masuk, keluar, total_saat_ini, hour, day_of_week, source
    FROM passenger_records
    WHERE timestamp >= datetime('now', '-' || ? || ' hours')
    ORDER BY timestamp ASC
  `).all(hours);
}

/**
 * Get hourly averages grouped by hour and day_of_week for prediction.
 */
export function getHourlyStats(halteId: string | null) {
  const db = getDb();

  if (halteId && halteId !== 'all') {
    return db.prepare(`
      SELECT
        halte_id,
        hour,
        day_of_week,
        ROUND(AVG(total_saat_ini), 2) AS avg_total,
        ROUND(AVG(masuk), 2)          AS avg_masuk,
        ROUND(AVG(keluar), 2)         AS avg_keluar,
        COUNT(*)                      AS sample_count
      FROM passenger_records
      WHERE halte_id = ?
      GROUP BY halte_id, hour, day_of_week
      ORDER BY day_of_week, hour
    `).all(halteId);
  }

  return db.prepare(`
    SELECT
      halte_id,
      hour,
      day_of_week,
      ROUND(AVG(total_saat_ini), 2) AS avg_total,
      ROUND(AVG(masuk), 2)          AS avg_masuk,
      ROUND(AVG(keluar), 2)         AS avg_keluar,
      COUNT(*)                      AS sample_count
    FROM passenger_records
    GROUP BY halte_id, hour, day_of_week
    ORDER BY halte_id, day_of_week, hour
  `).all();
}

/**
 * Get total record count (for monitoring).
 */
export function getRecordCount(): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) AS count FROM passenger_records').get() as { count: number };
  return row.count;
}
