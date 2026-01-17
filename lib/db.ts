import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_DIRECTORY = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIRECTORY, "planner.db");

let sharedConnection: Database.Database | null = null;

/**
 * Returns a singleton SQLite connection and ensures the schema exists.
 */
export function getDb(): Database.Database {
  if (!sharedConnection) {
    ensureDataDirectory();
    sharedConnection = new Database(DB_FILE);
    sharedConnection.pragma("journal_mode = WAL");
    ensureSchema(sharedConnection);
  }
  return sharedConnection;
}

/**
 * Closes the shared SQLite connection.
 */
export function closeDb(): void {
  if (sharedConnection) {
    sharedConnection.close();
    sharedConnection = null;
  }
}

function ensureDataDirectory() {
  if (!fs.existsSync(DB_DIRECTORY)) {
    fs.mkdirSync(DB_DIRECTORY, { recursive: true });
  }
}

function ensureSchema(conn: Database.Database) {
  conn
    .prepare(
      `
        CREATE TABLE IF NOT EXISTS coverage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone TEXT NOT NULL,
          student_class TEXT NOT NULL,
          data TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `,
    )
    .run();

  conn
    .prepare(
      `
        CREATE UNIQUE INDEX IF NOT EXISTS idx_coverage_phone_class
        ON coverage(phone, student_class)
      `,
    )
    .run();
}
