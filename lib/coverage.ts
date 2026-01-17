import type { CoverageData, CoverageRecord, StudentClass } from "./types";
import { getDb } from "./db";

type CoverageRow = {
  id: number;
  phone: string;
  student_class: StudentClass;
  data: string;
  created_at: string;
  updated_at: string;
};

const BASE_SELECT = `
  SELECT id, phone, student_class, data, created_at, updated_at
  FROM coverage
`;

function ensureStringifiedData(data: CoverageData): string {
  try {
    return JSON.stringify(data);
  } catch (error) {
    throw new Error(
      `Unable to serialize coverage data: ${(error as Error).message}`,
    );
  }
}

function parseData(payload: string): CoverageData {
  try {
    return JSON.parse(payload) as CoverageData;
  } catch (error) {
    throw new Error(
      `Corrupted coverage data in database: ${(error as Error).message}`,
    );
  }
}

function mapRow(row: CoverageRow): CoverageRecord {
  return {
    id: row.id,
    phone: row.phone,
    studentClass: row.student_class,
    data: parseData(row.data),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Creates or updates a coverage record identified by phone + class.
 */
export function saveCoverage(
  phone: string,
  studentClass: StudentClass,
  data: CoverageData,
): CoverageRecord {
  const db = getDb();
  const payload = ensureStringifiedData(data);

  const stmt = db.prepare(
    `
      INSERT INTO coverage (phone, student_class, data)
      VALUES (@phone, @studentClass, @data)
      ON CONFLICT(phone, student_class) DO UPDATE SET
        data = excluded.data,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `,
  );

  const row = stmt.get({ phone, studentClass, data: payload }) as
    | CoverageRow
    | undefined;
  if (!row) {
    throw new Error("Failed to persist coverage record.");
  }

  return mapRow(row);
}

/**
 * Returns all coverage records linked to a phone number, newest first.
 */
export function findCoverageByPhone(phone: string): CoverageRecord[] {
  const db = getDb();
  const rows = db
    .prepare<[string], CoverageRow>(
      `${BASE_SELECT} WHERE phone = ? ORDER BY updated_at DESC`,
    )
    .all(phone);
  return rows.map(mapRow);
}

/**
 * Returns the latest coverage record for a specific phone/class pair.
 */
export function findCoverageByPhoneAndClass(
  phone: string,
  studentClass: StudentClass,
): CoverageRecord | null {
  const db = getDb();
  const row = db
    .prepare<[string, StudentClass], CoverageRow>(
      `${BASE_SELECT} WHERE phone = ? AND student_class = ? ORDER BY updated_at DESC LIMIT 1`,
    )
    .get(phone, studentClass);
  return row ? mapRow(row) : null;
}

/**
 * Fetches a single coverage record by its primary key.
 */
export function findCoverageById(id: number): CoverageRecord | null {
  const db = getDb();
  const row = db.prepare<[number], CoverageRow>(`${BASE_SELECT} WHERE id = ?`).get(id);
  return row ? mapRow(row) : null;
}

/**
 * Lists coverage entries for a specific class sorted by most recent update.
 */
export function listCoverageByClass(
  studentClass: StudentClass,
): CoverageRecord[] {
  const db = getDb();
  const rows = db
    .prepare<[StudentClass], CoverageRow>(
      `${BASE_SELECT} WHERE student_class = ? ORDER BY updated_at DESC, id DESC`,
    )
    .all(studentClass);
  return rows.map(mapRow);
}

/**
 * Lists every coverage entry sorted by most recently updated.
 */
export function listAllCoverage(): CoverageRecord[] {
  const db = getDb();
  const rows = db
    .prepare<[], CoverageRow>(`${BASE_SELECT} ORDER BY updated_at DESC, id DESC`)
    .all();
  return rows.map(mapRow);
}

/**
 * Removes a coverage record permanently.
 */
export function deleteCoverage(id: number): void {
  const db = getDb();
  db.prepare(`DELETE FROM coverage WHERE id = ?`).run(id);
}

/**
 * Removes the coverage mapped to a specific phone/class pair.
 */
export function deleteCoverageByPhoneAndClass(
  phone: string,
  studentClass: StudentClass,
): void {
  const db = getDb();
  db.prepare(`DELETE FROM coverage WHERE phone = ? AND student_class = ?`).run(
    phone,
    studentClass,
  );
}

export function getCoverageForPhoneAndClass(
  phone: string,
  studentClass: StudentClass,
): CoverageRecord {
  const record = findCoverageByPhoneAndClass(phone, studentClass);
  if (!record) {
    throw new Error(
      `No coverage found for phone ${phone} in class ${studentClass}.`,
    );
  }
  return record;
}
