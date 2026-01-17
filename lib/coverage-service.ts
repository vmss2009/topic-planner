import {
  deleteCoverage,
  deleteCoverageByPhoneAndClass,
  findCoverageById,
  findCoverageByPhone,
  findCoverageByPhoneAndClass,
  listAllCoverage,
  listCoverageByClass,
  saveCoverage,
} from "./coverage";
import { normalizePhone, isValidPhone } from "./phone";
import { createBlankCoverageData } from "./syllabus";
import type { CoverageData, CoverageRecord, StudentClass } from "./types";

export interface CoverageMutationInput {
  phone: string;
  studentClass: StudentClass;
  mutate: (draft: CoverageData) => CoverageData | void;
}

export interface CoverageListFilters {
  studentClass?: StudentClass;
}

export interface EnsureCoverageResult {
  record: CoverageRecord;
  isNew: boolean;
}

export function ensureCoverageRecord(
  phone: string,
  studentClass: StudentClass,
): CoverageRecord {
  return ensureCoverageRecordWithStatus(phone, studentClass).record;
}

export function ensureCoverageRecordWithStatus(
  phone: string,
  studentClass: StudentClass,
): EnsureCoverageResult {
  const normalizedPhone = normalizeAndValidatePhone(phone);
  const existing = findCoverageByPhoneAndClass(normalizedPhone, studentClass);
  if (existing) {
    return { record: existing, isNew: false };
  }

  const blank = createBlankCoverageData(studentClass);
  const record = saveCoverage(normalizedPhone, studentClass, blank);
  return { record, isNew: true };
}

export function mutateCoverageRecord({
  phone,
  studentClass,
  mutate,
}: CoverageMutationInput): CoverageRecord {
  const normalizedPhone = normalizeAndValidatePhone(phone);
  const baseRecord =
    findCoverageByPhoneAndClass(normalizedPhone, studentClass) ??
    saveCoverage(
      normalizedPhone,
      studentClass,
      createBlankCoverageData(studentClass),
    );

  const draft = cloneCoverageData(baseRecord.data);
  const result = mutate(draft) ?? draft;

  return saveCoverage(normalizedPhone, studentClass, result);
}

export function removeCoverageRecord(id: number): void {
  deleteCoverage(id);
}

export function removeCoverageForPhone(
  phone: string,
  studentClass: StudentClass,
): void {
  const normalizedPhone = normalizeAndValidatePhone(phone);
  deleteCoverageByPhoneAndClass(normalizedPhone, studentClass);
}

export function getCoverageHistory(phone: string): CoverageRecord[] {
  const normalizedPhone = normalizeAndValidatePhone(phone);
  return findCoverageByPhone(normalizedPhone);
}

export function getCoverageById(id: number): CoverageRecord | null {
  return findCoverageById(id);
}

export function listCoverage(
  filters: CoverageListFilters = {},
): CoverageRecord[] {
  if (filters.studentClass) {
    return listCoverageByClass(filters.studentClass);
  }
  return listAllCoverage();
}

function normalizeAndValidatePhone(rawPhone: string): string {
  const normalized = normalizePhone(rawPhone);
  if (!normalized || !isValidPhone(normalized)) {
    throw new Error("Please provide a valid phone number (10-15 digits).");
  }
  return normalized;
}

function cloneCoverageData(data: CoverageData): CoverageData {
  return JSON.parse(JSON.stringify(data)) as CoverageData;
}
