export interface IdempotencyRecord {
  key: string;
  requestHash: string;
  statusCode: number;
  responseBody: unknown;
  createdAt: string;
}

export interface IdempotencyStore {
  get(key: string): IdempotencyRecord | undefined;
  set(record: IdempotencyRecord): void;
}

class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();

  get(key: string): IdempotencyRecord | undefined {
    return this.records.get(key);
  }

  set(record: IdempotencyRecord): void {
    this.records.set(record.key, record);
  }
}

type DatabaseSyncLike = {
  exec(sql: string): void;
  prepare(sql: string): { get: (key: string) => unknown; run: (...args: unknown[]) => void };
};

function loadDatabaseSync(): new (path: string) => DatabaseSyncLike {
  // node:sqlite exists on newer Node versions only.
  // Keep sqlite backend optional so CI on Node 20 still works.
  const sqlite = require("node:sqlite") as { DatabaseSync?: new (path: string) => DatabaseSyncLike };
  if (!sqlite.DatabaseSync) {
    throw new Error("sqlite backend unavailable on this Node version");
  }
  return sqlite.DatabaseSync;
}

class SqliteIdempotencyStore implements IdempotencyStore {
  private readonly db: DatabaseSyncLike;

  constructor(filePath: string) {
    const DatabaseSync = loadDatabaseSync();
    this.db = new DatabaseSync(filePath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS idempotency_records (
        key TEXT PRIMARY KEY,
        request_hash TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        response_body TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
  }

  get(key: string): IdempotencyRecord | undefined {
    const row = this.db
      .prepare(
        `SELECT key, request_hash, status_code, response_body, created_at
         FROM idempotency_records
         WHERE key = ?`
      )
      .get(key) as
      | {
          key: string;
          request_hash: string;
          status_code: number;
          response_body: string;
          created_at: string;
        }
      | undefined;

    if (!row) {
      return undefined;
    }

    return {
      key: row.key,
      requestHash: row.request_hash,
      statusCode: row.status_code,
      responseBody: JSON.parse(row.response_body),
      createdAt: row.created_at
    };
  }

  set(record: IdempotencyRecord): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO idempotency_records
         (key, request_hash, status_code, response_body, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        record.key,
        record.requestHash,
        record.statusCode,
        JSON.stringify(record.responseBody),
        record.createdAt
      );
  }
}

let store: IdempotencyStore | undefined;

export function sqliteBackendAvailable(): boolean {
  try {
    loadDatabaseSync();
    return true;
  } catch {
    return false;
  }
}

export function getIdempotencyStore(): IdempotencyStore {
  if (store) {
    return store;
  }

  const backend = (process.env.IDEMPOTENCY_STORE ?? "memory").toLowerCase();

  if (backend === "sqlite") {
    const sqlitePath = process.env.IDEMPOTENCY_SQLITE_PATH ?? ":memory:";
    store = new SqliteIdempotencyStore(sqlitePath);
    return store;
  }

  store = new MemoryIdempotencyStore();
  return store;
}

export function resetIdempotencyStoreForTests(): void {
  store = undefined;
}
