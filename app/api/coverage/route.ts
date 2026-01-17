import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ensureCoverageRecordWithStatus,
  mutateCoverageRecord,
} from "@/lib/coverage-service";
import type { CoverageData, StudentClass } from "@/lib/types";

type MethodResult = ReturnType<typeof NextResponse.json>;

const ALLOWED_CLASSES: StudentClass[] = ["11", "12"];

export async function GET(request: NextRequest): Promise<MethodResult> {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone") ?? "";
    const studentClass = parseStudentClass(searchParams.get("studentClass"));

    if (!phone) {
      return badRequest("Missing phone query parameter.");
    }
    if (!studentClass) {
      return badRequest("Missing or invalid studentClass query parameter.");
    }

    const { record, isNew } = ensureCoverageRecordWithStatus(
      phone,
      studentClass,
    );

    return NextResponse.json({
      data: record.data,
      meta: buildMeta(record, { justCreated: isNew }),
      isNew,
    });
  } catch (error) {
    return handleError(error, "Unable to load coverage.");
  }
}

export async function POST(request: NextRequest): Promise<MethodResult> {
  try {
    const body = await request.json();
    const phone = typeof body?.phone === "string" ? body.phone : "";
    const studentClass = parseStudentClass(body?.studentClass);
    const data = body?.data as CoverageData | undefined;

    if (!phone) {
      return badRequest("Phone is required.");
    }
    if (!studentClass) {
      return badRequest('studentClass must be either "11" or "12".');
    }
    if (!data || typeof data !== "object") {
      return badRequest("A valid coverage data payload is required.");
    }

    const record = mutateCoverageRecord({
      phone,
      studentClass,
      mutate: () => data,
    });

    return NextResponse.json({
      data: record.data,
      meta: buildMeta(record),
      message: "Coverage saved successfully.",
    });
  } catch (error) {
    return handleError(error, "Unable to save coverage right now.");
  }
}

function parseStudentClass(value: unknown): StudentClass | null {
  if (typeof value !== "string") return null;
  return ALLOWED_CLASSES.includes(value as StudentClass)
    ? (value as StudentClass)
    : null;
}

function buildMeta(
  record: {
    id: number;
    phone: string;
    studentClass: StudentClass;
    createdAt: string;
    updatedAt: string;
  },
  options: { justCreated?: boolean } = {},
) {
  return {
    id: record.id,
    phone: record.phone,
    studentClass: record.studentClass,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    justCreated: options.justCreated ?? false,
  };
}

function badRequest(message: string): MethodResult {
  return NextResponse.json({ error: message }, { status: 400 });
}

function handleError(error: unknown, fallback: string): MethodResult {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("valid phone") ? 400 : 500;
  return NextResponse.json(
    { error: status === 500 ? fallback : message },
    { status },
  );
}
