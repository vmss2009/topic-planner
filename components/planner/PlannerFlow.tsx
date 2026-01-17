"use client";

import { useMemo, useState } from "react";
import PlannerClient from "./PlannerClient";
import type { GradeSyllabus } from "@/lib/syllabus";
import type { CoverageData, StudentClass } from "@/lib/types";
import { formatPhone, isValidPhone, normalizePhone } from "@/lib/phone";

interface CoverageMeta {
  id?: number;
  phone?: string;
  studentClass?: StudentClass;
  createdAt?: string;
  updatedAt?: string;
  justCreated?: boolean;
}

interface CoveragePayload {
  data: CoverageData;
  meta?: CoverageMeta;
  isNew?: boolean;
  message?: string;
}

interface PlannerFlowProps {
  syllabusMap: Record<StudentClass, GradeSyllabus>;
  initialPhone?: string;
  initialClass?: StudentClass;
  ctaLabel?: string;
}

const CLASS_OPTIONS: { value: StudentClass; label: string }[] = [
  { value: "11", label: "Class 11" },
  { value: "12", label: "Class 12" },
];

export function PlannerFlow({
  syllabusMap,
  initialPhone = "",
  initialClass = "11",
  ctaLabel = "Load / Create coverage",
}: PlannerFlowProps) {
  const [phoneInput, setPhoneInput] = useState(initialPhone);
  const [studentClass, setStudentClass] = useState<StudentClass>(initialClass);
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [baseCoverage, setBaseCoverage] = useState<CoverageData | null>(null);
  const [meta, setMeta] = useState<CoverageMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subjects = useMemo(() => {
    return syllabusMap[studentClass]?.subjects ?? [];
  }, [syllabusMap, studentClass]);

  const disableActions = isLoading || isSaving;

  const formattedPhone = useMemo(() => {
    return activePhone ? formatPhone(activePhone) : "";
  }, [activePhone]);

  const lastSavedLabel = useMemo(() => {
    if (!meta?.updatedAt) return null;
    try {
      return new Date(meta.updatedAt).toLocaleString();
    } catch {
      return meta.updatedAt;
    }
  }, [meta]);

  async function handleLoad(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setFeedback(null);
    setError(null);

    const normalized = normalizePhone(phoneInput);
    if (!isValidPhone(normalized)) {
      setError("Please enter a valid phone number (10–15 digits).");
      return;
    }

    if (!syllabusMap[studentClass]) {
      setError("Syllabus data missing for the selected class.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = await loadCoverageFromApi(normalized, studentClass);
      const nextCoverage = cloneCoverageData(payload.data);
      setCoverage(nextCoverage);
      setBaseCoverage(cloneCoverageData(payload.data));
      setMeta(payload.meta ?? null);
      const autoEdit = Boolean(payload.isNew || payload.meta?.justCreated);
      setIsEditing(autoEdit);
      setActivePhone(normalized);
      setDirty(false);
      setFeedback(
        autoEdit
          ? "New coverage created. Start marking topics as completed."
          : "Coverage loaded. Review your progress or tap Edit to make updates.",
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load coverage. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!coverage || !activePhone || !isEditing) return;
    setFeedback(null);
    setError(null);
    setIsSaving(true);
    try {
      const payload = await saveCoverageToApi(
        activePhone,
        studentClass,
        coverage,
      );
      const savedCoverage = payload.data
        ? cloneCoverageData(payload.data)
        : cloneCoverageData(coverage);
      setCoverage(savedCoverage);
      setBaseCoverage(cloneCoverageData(savedCoverage));
      const fallbackMeta: CoverageMeta = {
        ...(meta ?? {}),
        phone: activePhone,
        studentClass,
        updatedAt: new Date().toISOString(),
        justCreated: false,
      };
      setMeta(payload.meta ?? fallbackMeta);
      setDirty(false);
      setIsEditing(false);
      setFeedback(
        payload.message ??
          "Progress saved. You're now viewing the latest data in read-only mode.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save progress right now.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleCoverageChange(next: CoverageData) {
    if (!isEditing) return;
    setCoverage(next);
    setDirty(true);
    setFeedback(null);
  }

  function handlePhoneChange(value: string) {
    setPhoneInput(value);
    setFeedback(null);
    setError(null);
    resetCoverageState();
  }

  function handleClassChange(value: StudentClass) {
    setStudentClass(value);
    setFeedback(null);
    setError(null);
    resetCoverageState();
  }

  function handleEnableEditing() {
    if (!baseCoverage) return;
    setCoverage(cloneCoverageData(baseCoverage));
    setDirty(false);
    setIsEditing(true);
    setFeedback(
      "Edit mode enabled. Make your updates and save when you're done.",
    );
    setError(null);
  }

  function handleCancelEditing() {
    if (!baseCoverage) return;
    const hadChanges = dirty;
    setCoverage(cloneCoverageData(baseCoverage));
    setDirty(false);
    setIsEditing(false);
    setError(null);
    if (hadChanges) {
      setFeedback("Discarded unsaved changes.");
    }
  }

  function resetCoverageState() {
    setCoverage(null);
    setBaseCoverage(null);
    setMeta(null);
    setActivePhone(null);
    setIsEditing(false);
    setDirty(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <header className="mb-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Student Details
          </p>
          <h1 className="text-xl font-semibold text-gray-900">
            Syllabus tracker
          </h1>
          <p className="text-sm text-gray-500">
            Enter the phone number and class to create or resume a coverage
            plan. You can edit progress anytime.
          </p>
        </header>

        <form onSubmit={handleLoad} className="flex flex-col gap-4 sm:flex-row">
          <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-gray-700">
            Phone Number
            <input
              type="tel"
              value={phoneInput}
              onChange={(event) => handlePhoneChange(event.target.value)}
              placeholder="e.g. 9876543210"
              className="rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <label className="flex w-full flex-col gap-2 text-sm font-medium text-gray-700 sm:w-44">
            Class
            <select
              value={studentClass}
              onChange={(event) =>
                handleClassChange(event.target.value as StudentClass)
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {CLASS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={disableActions}
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-auto"
          >
            {isLoading ? "Loading..." : ctaLabel}
          </button>
        </form>

        {error && (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {feedback && (
          <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {feedback}
          </p>
        )}
      </section>

      {coverage && subjects.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Tracking coverage for
              </p>
              <h2 className="text-lg font-semibold text-gray-900">
                {formattedPhone || activePhone} · Class {studentClass}
              </h2>
              {lastSavedLabel && (
                <p className="text-xs text-gray-500">
                  Last saved {lastSavedLabel}
                </p>
              )}
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={handleEnableEditing}
                  disabled={disableActions}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Edit coverage
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {dirty && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                      Unsaved changes
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={disableActions || !dirty}
                    onClick={handleSave}
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : dirty ? "Save progress" : "Saved"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    disabled={disableActions}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </header>

          <PlannerClient
            subjects={subjects}
            coverage={coverage}
            onChange={handleCoverageChange}
            readOnly={!isEditing}
          />
        </section>
      )}
    </div>
  );
}

function cloneCoverageData(data: CoverageData): CoverageData {
  return JSON.parse(JSON.stringify(data)) as CoverageData;
}

async function loadCoverageFromApi(
  phone: string,
  studentClass: StudentClass,
): Promise<CoveragePayload> {
  const response = await fetch(
    `/api/coverage?phone=${encodeURIComponent(phone)}&studentClass=${studentClass}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, "Unable to load coverage."),
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const typedPayload = payload as CoveragePayload | null;
  if (!typedPayload?.data) {
    throw new Error("Server returned an empty coverage payload.");
  }

  return typedPayload;
}

async function saveCoverageToApi(
  phone: string,
  studentClass: StudentClass,
  data: CoverageData,
): Promise<CoveragePayload> {
  const response = await fetch("/api/coverage", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone, studentClass, data }),
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, "Unable to save progress right now."),
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const typedPayload = payload as CoveragePayload | null;
  if (!typedPayload || !typedPayload.data) {
    return {
      data,
      meta: typedPayload?.meta,
      message: typedPayload?.message,
      isNew: typedPayload?.isNew,
    };
  }

  return typedPayload;
}

async function extractErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = await response.json();
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      if (typeof record.error === "string") {
        return record.error;
      }
      if (typeof record.message === "string") {
        return record.message;
      }
    }
  } catch {
    // Ignore JSON parsing issues and fall back to default.
  }
  return fallback;
}

export default PlannerFlow;
