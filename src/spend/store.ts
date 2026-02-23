export interface TrySpendResult {
  allowed: boolean;
  previousTotal: number;
  newTotal: number;
  capUsd: number;
}

export interface SpendStore {
  /** Atomically check session cap and record spend if within budget. */
  trySpend(policyId: string, amountUsd: number, capUsd: number): TrySpendResult;
  /** Read current total spend for a policy (informational). */
  totalSpend(policyId: string): number;
}

class MemorySpendStore implements SpendStore {
  private readonly totals = new Map<string, number>();

  trySpend(policyId: string, amountUsd: number, capUsd: number): TrySpendResult {
    const previousTotal = this.totals.get(policyId) ?? 0;
    const newTotal = previousTotal + amountUsd;

    if (newTotal > capUsd) {
      return { allowed: false, previousTotal, newTotal, capUsd };
    }

    this.totals.set(policyId, newTotal);
    return { allowed: true, previousTotal, newTotal, capUsd };
  }

  totalSpend(policyId: string): number {
    return this.totals.get(policyId) ?? 0;
  }
}

type DatabaseSyncLike = {
  exec(sql: string): void;
  prepare(sql: string): {
    get: (...args: unknown[]) => unknown;
    run: (...args: unknown[]) => void;
  };
};

function loadDatabaseSync(): new (path: string) => DatabaseSyncLike {
  // node:sqlite exists on newer Node versions only (22.6+).
  // Keep sqlite backend optional so CI on older Node still works.
  const sqlite = require("node:sqlite") as {
    DatabaseSync?: new (path: string) => DatabaseSyncLike;
  };
  if (!sqlite.DatabaseSync) {
    throw new Error("sqlite backend unavailable on this Node version");
  }
  return sqlite.DatabaseSync;
}

class SqliteSpendStore implements SpendStore {
  private readonly db: DatabaseSyncLike;

  constructor(filePath: string) {
    const DatabaseSync = loadDatabaseSync();
    this.db = new DatabaseSync(filePath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS spend_totals (
        policy_id TEXT PRIMARY KEY,
        total_usd REAL NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      )
    `);
  }

  trySpend(policyId: string, amountUsd: number, capUsd: number): TrySpendResult {
    // BEGIN IMMEDIATE acquires a reserved lock up-front, preventing
    // concurrent writers from interleaving between the SELECT and UPDATE.
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db
        .prepare("SELECT total_usd FROM spend_totals WHERE policy_id = ?")
        .get(policyId) as { total_usd: number } | undefined;

      const previousTotal = row?.total_usd ?? 0;
      const newTotal = previousTotal + amountUsd;

      if (newTotal > capUsd) {
        this.db.exec("ROLLBACK");
        return { allowed: false, previousTotal, newTotal, capUsd };
      }

      const now = new Date().toISOString();
      this.db
        .prepare(
          `INSERT OR REPLACE INTO spend_totals (policy_id, total_usd, updated_at)
           VALUES (?, ?, ?)`
        )
        .run(policyId, newTotal, now);

      this.db.exec("COMMIT");
      return { allowed: true, previousTotal, newTotal, capUsd };
    } catch (err) {
      try {
        this.db.exec("ROLLBACK");
      } catch {
        /* already rolled back */
      }
      throw err;
    }
  }

  totalSpend(policyId: string): number {
    const row = this.db
      .prepare("SELECT total_usd FROM spend_totals WHERE policy_id = ?")
      .get(policyId) as { total_usd: number } | undefined;
    return row?.total_usd ?? 0;
  }
}

let store: SpendStore | undefined;

export function sqliteSpendBackendAvailable(): boolean {
  try {
    loadDatabaseSync();
    return true;
  } catch {
    return false;
  }
}

export function getSpendStore(): SpendStore {
  if (store) {
    return store;
  }

  const backend = (process.env.SPEND_STORE ?? "memory").toLowerCase();

  if (backend === "sqlite") {
    const sqlitePath = process.env.SPEND_STORE_SQLITE_PATH ?? ":memory:";
    store = new SqliteSpendStore(sqlitePath);
    return store;
  }

  store = new MemorySpendStore();
  return store;
}

export function resetSpendStoreForTests(): void {
  store = undefined;
}
