import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listCoverage } from "@/lib/coverage-service";
import type { CoverageRecord, StudentClass } from "@/lib/types";

const ALLOWED_CLASSES: StudentClass[] = ["11", "12"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classParam = searchParams.get("studentClass");
    const phoneParam = searchParams.get("phone")?.trim() ?? "";

    const studentClass = parseStudentClass(classParam);
    if (classParam && !studentClass) {
      return NextResponse.json(
        { error: 'studentClass must be either "11" or "12".' },
        { status: 400 },
      );
    }

    const records = listCoverage(
      studentClass ? { studentClass } : undefined,
    );
    const filteredRecords = filterByPhone(records, phoneParam);

    return NextResponse.json({
      records: filteredRecords,
      total: filteredRecords.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load coverage records.";
    return NextResponse.json(
      { error: message },
      { status: message.includes("valid phone") ? 400 : 500 },
    );
  }
}

function parseStudentClass(value: string | null): StudentClass | null {
  if (!value) return null;
  return ALLOWED_CLASSES.includes(value as StudentClass)
    ? (value as StudentClass)
    : null;
}

function filterByPhone(
  records: CoverageRecord[],
  phoneQuery: string,
): CoverageRecord[] {
  if (!phoneQuery) return records;

  const normalizedQuery = normalizeDigits(phoneQuery);
  if (!normalizedQuery) {
    const lowered = phoneQuery.toLowerCase();
    return records.filter((record) =>
      record.phone.toLowerCase().includes(lowered),
    );
  }

  return records.filter((record) => {
    const normalizedRecordPhone = normalizeDigits(record.phone);
    return (
      normalizedRecordPhone.includes(normalizedQuery) ||
      record.phone.includes(phoneQuery)
    );
  });
}

function normalizeDigits(value: string): string {
  return value.replace(/\D+/g, "");
}
