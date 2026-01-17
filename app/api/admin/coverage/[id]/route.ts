import { NextResponse, type NextRequest } from "next/server";
import {
  getCoverageById,
  mutateCoverageRecord,
  removeCoverageRecord,
} from "@/lib/coverage-service";
import type { CoverageData } from "@/lib/types";

type MethodResult = ReturnType<typeof NextResponse.json>;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _: NextRequest,
  { params }: RouteContext,
): Promise<MethodResult> {
  const id = await resolveRouteId(params);
  if (id == null) {
    return badRequest("A numeric coverage id is required.");
  }

  const record = getCoverageById(id);
  if (!record) {
    return notFound(id);
  }

  return NextResponse.json({ record });
}

export async function PUT(
  request: NextRequest,
  { params }: RouteContext,
): Promise<MethodResult> {
  const id = await resolveRouteId(params);
  if (id == null) {
    return badRequest("A numeric coverage id is required.");
  }

  const record = getCoverageById(id);
  if (!record) {
    return notFound(id);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const nextData = extractCoverageData(payload);
  if (!nextData) {
    return badRequest("A valid coverage data payload is required.");
  }

  const updatedRecord = mutateCoverageRecord({
    phone: record.phone,
    studentClass: record.studentClass,
    mutate: () => nextData,
  });

  return NextResponse.json({
    record: updatedRecord,
    message: "Coverage updated successfully.",
  });
}

export async function DELETE(
  _: NextRequest,
  { params }: RouteContext,
): Promise<MethodResult> {
  const id = await resolveRouteId(params);
  if (id == null) {
    return badRequest("A numeric coverage id is required.");
  }

  const record = getCoverageById(id);
  if (!record) {
    return notFound(id);
  }

  removeCoverageRecord(id);

  return NextResponse.json({
    message: "Coverage entry deleted successfully.",
    record,
  });
}

function parseId(rawId: string | undefined): number | null {
  if (!rawId) return null;
  const parsed = Number.parseInt(rawId, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function resolveRouteId(
  paramsPromise: RouteContext["params"],
): Promise<number | null> {
  const { id } = await paramsPromise;
  return parseId(id);
}

function extractCoverageData(payload: unknown): CoverageData | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = (payload as { data?: unknown }).data;
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  return candidate as CoverageData;
}

function badRequest(message: string): MethodResult {
  return NextResponse.json({ error: message }, { status: 400 });
}

function notFound(id: number): MethodResult {
  return NextResponse.json(
    { error: `Coverage entry with id ${id} was not found.` },
    { status: 404 },
  );
}
