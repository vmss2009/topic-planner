"use client";

import { useEffect, useMemo, useState } from "react";
import PlannerClient from "@/components/planner/PlannerClient";
import type { GradeSyllabus } from "@/lib/syllabus";
import type { CoverageData, CoverageRecord, StudentClass } from "@/lib/types";
import { formatPhone } from "@/lib/phone";

const ADMIN_USERNAME = "mohan@superadmin.com";
const ADMIN_PASSWORD = "supermohan@2009";

interface CoverageListResponse {
  records?: CoverageRecord[];
  error?: string;
  message?: string;
}

interface CoverageMutationResponse {
  record?: CoverageRecord;
  message?: string;
  error?: string;
}

interface AdminDashboardProps {
  heading?: string;
  subheading?: string;
  syllabusMap: Record<StudentClass, GradeSyllabus>;
}

type FilterClass = "all" | StudentClass;

interface PhoneGroup {
  phone: string;
  records: CoverageRecord[];
  lastUpdated: string;
}

export function AdminDashboard({
  heading = "Admin dashboard",
  subheading = "Review, edit, or delete any syllabus coverage entry.",
  syllabusMap,
}: AdminDashboardProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [records, setRecords] = useState<CoverageRecord[]>([]);
  const [filterClass, setFilterClass] = useState<FilterClass>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [editDraft, setEditDraft] = useState<CoverageData | null>(null);
  const [editDirty, setEditDirty] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFeedback, setEditFeedback] = useState<string | null>(null);

  const groupedRecords = useMemo(() => groupRecords(records), [records]);

  const filteredGroups = useMemo(
    () => filterGroups(groupedRecords, filterClass, searchTerm),
    [groupedRecords, filterClass, searchTerm],
  );

  const selectedGroup = useMemo(() => {
    if (!selectedPhone) return null;
    return (
      groupedRecords.find((group) => group.phone === selectedPhone) ?? null
    );
  }, [groupedRecords, selectedPhone]);

  const selectedRecord = useMemo(() => {
    if (!selectedGroup) return null;
    if (selectedRecordId != null) {
      const matching = selectedGroup.records.find(
        (record) => record.id === selectedRecordId,
      );
      if (matching) {
        return matching;
      }
    }
    return selectedGroup.records[0] ?? null;
  }, [selectedGroup, selectedRecordId]);

  const selectedSubjects = useMemo(() => {
    if (!selectedRecord) return [];
    return syllabusMap[selectedRecord.studentClass]?.subjects ?? [];
  }, [selectedRecord, syllabusMap]);

  function clearSelection() {
    setSelectedPhone(null);
    setSelectedRecordId(null);
    setEditDraft(null);
    setEditDirty(false);
    setEditError(null);
    setEditFeedback(null);
  }

  useEffect(() => {
    if (!selectedGroup) {
      if (selectedPhone) {
        clearSelection();
      }
      return;
    }

    if (
      selectedRecordId == null ||
      !selectedGroup.records.some((record) => record.id === selectedRecordId)
    ) {
      const fallbackId = selectedGroup.records[0]?.id ?? null;
      setSelectedRecordId(fallbackId);
    }
  }, [selectedGroup, selectedRecordId, selectedPhone]);

  useEffect(() => {
    if (!selectedRecord) {
      setEditDraft(null);
      setEditDirty(false);
      return;
    }

    setEditDraft(cloneCoverage(selectedRecord.data));
    setEditDirty(false);
    setEditError(null);
    setEditFeedback(null);
  }, [selectedRecord]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGlobalError(null);
    setSuccessMessage(null);

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      await refreshRecords();
    } else {
      setGlobalError("Invalid admin credentials. Try again.");
    }
  }

  async function refreshRecords() {
    setLoading(true);
    setGlobalError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch("/api/admin/coverage", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          await extractMessage(response, "Unable to fetch data."),
        );
      }

      const payload = (await response.json()) as CoverageListResponse;
      setRecords(payload.records ?? []);
      if (!payload.records?.length) {
        setSuccessMessage("No coverage entries found.");
      }
    } catch (error) {
      setGlobalError(
        error instanceof Error ? error.message : "Unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteGroup(group: PhoneGroup) {
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm(
            `Delete all coverage entries for ${formatPhone(group.phone) || group.phone}?`,
          );

    if (!confirmed) return;

    setLoading(true);
    setGlobalError(null);
    setSuccessMessage(null);

    try {
      for (const record of group.records) {
        const response = await fetch(`/api/admin/coverage/${record.id}`, {
          method: "DELETE",
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(
            await extractMessage(
              response,
              "Failed to delete one of the records.",
            ),
          );
        }
      }

      setRecords((prev) => prev.filter((entry) => entry.phone !== group.phone));
      if (selectedPhone === group.phone) {
        clearSelection();
      }
      setSuccessMessage(
        "All coverage entries for the phone number were deleted.",
      );
    } catch (error) {
      setGlobalError(
        error instanceof Error ? error.message : "Unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleInspect(group: PhoneGroup, recordId?: number) {
    if (editDirty) {
      const proceed =
        typeof window === "undefined"
          ? true
          : window.confirm(
              "You have unsaved changes. Viewing another record will discard them. Continue?",
            );
      if (!proceed) return;
    }
    setSelectedPhone(group.phone);
    setSelectedRecordId(recordId ?? group.records[0]?.id ?? null);
  }

  function handleSelectRecord(recordId: number) {
    if (editDirty) {
      const proceed =
        typeof window === "undefined"
          ? true
          : window.confirm(
              "Switching classes will discard unsaved changes. Continue?",
            );
      if (!proceed) return;
    }
    setSelectedRecordId(recordId);
  }

  function handleEditChange(next: CoverageData) {
    setEditDraft(next);
    setEditDirty(true);
    setEditFeedback(null);
    setEditError(null);
  }

  async function handleSaveEdit() {
    if (!selectedRecord || !editDraft) return;

    setEditSaving(true);
    setEditError(null);
    setEditFeedback(null);
    setGlobalError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/admin/coverage/${selectedRecord.id}`, {
        method: "PUT",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: editDraft }),
      });

      if (!response.ok) {
        throw new Error(
          await extractMessage(response, "Failed to save changes."),
        );
      }

      const payload = (await response.json()) as CoverageMutationResponse;

      const nextRecord: CoverageRecord = payload.record ?? {
        ...selectedRecord,
        data: editDraft,
        updatedAt: new Date().toISOString(),
      };

      setRecords((prev) =>
        prev.map((entry) => (entry.id === nextRecord.id ? nextRecord : entry)),
      );

      setEditDraft(cloneCoverage(nextRecord.data));
      setEditDirty(false);
      setEditFeedback(payload.message ?? "Changes saved successfully.");
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Unable to save changes.",
      );
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteRecord(record: CoverageRecord) {
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm(
            `Delete coverage for Class ${record.studentClass} (${formatPhone(record.phone) || record.phone})?`,
          );
    if (!confirmed) return;

    setEditSaving(true);
    setEditError(null);
    setEditFeedback(null);
    setGlobalError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/admin/coverage/${record.id}`, {
        method: "DELETE",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          await extractMessage(response, "Failed to delete the record."),
        );
      }

      setRecords((prev) => prev.filter((entry) => entry.id !== record.id));

      setSuccessMessage(
        `Deleted Class ${record.studentClass} coverage for ${formatPhone(record.phone) || record.phone}.`,
      );

      if (
        selectedPhone === record.phone &&
        selectedGroup?.records.length === 1
      ) {
        clearSelection();
      }
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Unable to delete the record.",
      );
    } finally {
      setEditSaving(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">{heading}</h1>
          <p className="text-sm text-gray-500">
            Enter the admin credentials to continue.
          </p>
        </header>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Email
            <input
              type="email"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="mohan@superadmin.com"
              required
              autoComplete="username"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            Sign in
          </button>

          {globalError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {globalError}
            </p>
          )}
        </form>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Administrator panel
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">{heading}</h1>
            <p className="text-sm text-gray-500">{subheading}</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <button
              type="button"
              onClick={refreshRecords}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh list"}
            </button>
            <p className="text-xs text-gray-500">
              Logged in as <span className="font-medium">{ADMIN_USERNAME}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-gray-700">
            Search by phone / ID / comments
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="98765, physics, organic, etc."
              className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <label className="flex w-full flex-col gap-1 text-sm font-medium text-gray-700 sm:w-48">
            Class filter
            <select
              value={filterClass}
              onChange={(event) =>
                setFilterClass(event.target.value as FilterClass)
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">All classes</option>
              <option value="11">Class 11</option>
              <option value="12">Class 12</option>
            </select>
          </label>
        </div>

        {globalError && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {globalError}
          </p>
        )}
        {successMessage && (
          <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {successMessage}
          </p>
        )}
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-0 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">S. No.</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Classes tracked</th>
                <th className="px-4 py-3">Last updated</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredGroups.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-gray-500"
                  >
                    {loading
                      ? "Loading coverage records..."
                      : "No coverage records match the current filters."}
                  </td>
                </tr>
              )}

              {filteredGroups.map((group, index) => (
                <tr key={group.phone} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {formatPhone(group.phone) || group.phone}
                    </p>
                    <p className="text-xs text-gray-500">{group.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {group.records.map((record) => (
                        <span
                          key={record.id}
                          className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-600"
                        >
                          Class {record.studentClass}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(group.lastUpdated).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleInspect(group)}
                        className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                      >
                        Inspect
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(group)}
                        className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700"
                        disabled={loading}
                      >
                        Delete phone
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedGroup && selectedRecord && editDraft && (
        <section className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-indigo-500">
                Coverage details
              </p>
              <h2 className="text-lg font-semibold text-gray-900">
                {formatPhone(selectedGroup.phone) || selectedGroup.phone} ·{" "}
                {selectedGroup.records.length} class
                {selectedGroup.records.length > 1 ? "es" : ""}
              </h2>
              <p className="text-xs text-gray-500">
                Last updated{" "}
                {new Date(selectedGroup.lastUpdated).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="mt-3 inline-flex items-center justify-center rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:border-gray-400 hover:text-gray-800 sm:mt-0"
            >
              Close
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {selectedGroup.records.map((record) => {
              const isActive = selectedRecord.id === record.id;
              return (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => handleSelectRecord(record.id)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-indigo-600 text-white shadow"
                      : "border border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  Class {record.studentClass}
                </button>
              );
            })}
          </div>

          {editError && (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {editError}
            </p>
          )}
          {editFeedback && (
            <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {editFeedback}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              {editDirty ? "Unsaved changes" : "All changes saved"}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleDeleteRecord(selectedRecord)}
                disabled={editSaving}
                className="inline-flex items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete this class
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editDirty || editSaving}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editSaving
                  ? "Saving..."
                  : editDirty
                    ? "Save changes"
                    : "Saved"}
              </button>
            </div>
          </div>

          {selectedSubjects.length > 0 ? (
            <div className="mt-4">
              <PlannerClient
                subjects={selectedSubjects}
                coverage={editDraft}
                onChange={handleEditChange}
              />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-gray-600">
                Syllabus data is unavailable for this class. Showing raw JSON
                instead.
              </p>
              <pre className="max-h-96 overflow-auto rounded-xl bg-gray-900 p-4 text-xs text-gray-100">
                {JSON.stringify(selectedRecord.data, null, 2)}
              </pre>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default AdminDashboard;

function groupRecords(records: CoverageRecord[]): PhoneGroup[] {
  const groups = new Map<string, PhoneGroup>();

  for (const record of records) {
    const key = record.phone;
    const existing = groups.get(key);
    if (existing) {
      existing.records.push(record);
      if (
        new Date(record.updatedAt).getTime() >
        new Date(existing.lastUpdated).getTime()
      ) {
        existing.lastUpdated = record.updatedAt;
      }
    } else {
      groups.set(key, {
        phone: key,
        records: [record],
        lastUpdated: record.updatedAt,
      });
    }
  }

  const grouped = Array.from(groups.values());

  grouped.forEach((group) => {
    group.records.sort((a, b) => {
      if (a.studentClass === b.studentClass) {
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }
      return a.studentClass.localeCompare(b.studentClass);
    });
  });

  grouped.sort((a, b) => compareDesc(a.lastUpdated, b.lastUpdated));

  return grouped;
}

function filterGroups(
  groups: PhoneGroup[],
  filterClass: FilterClass,
  searchTerm: string,
): PhoneGroup[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return groups.filter((group) => {
    const matchesClass =
      filterClass === "all"
        ? true
        : group.records.some((record) => record.studentClass === filterClass);

    if (!matchesClass) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const formatted = formatPhone(group.phone);

    const phoneMatch =
      group.phone.toLowerCase().includes(normalizedSearch) ||
      formatted.toLowerCase().includes(normalizedSearch);

    if (phoneMatch) {
      return true;
    }

    return group.records.some((record) => {
      const comments = JSON.stringify(record.data).toLowerCase();
      return (
        String(record.id).includes(normalizedSearch) ||
        record.studentClass.toLowerCase().includes(normalizedSearch) ||
        comments.includes(normalizedSearch)
      );
    });
  });
}

function compareDesc(a: string, b: string): number {
  return new Date(b).getTime() - new Date(a).getTime();
}

function cloneCoverage(data: CoverageData): CoverageData {
  return JSON.parse(JSON.stringify(data)) as CoverageData;
}

async function extractMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload = await response.json();
    if (payload && typeof payload === "object") {
      if (typeof payload.error === "string") {
        return payload.error;
      }
      if (typeof payload.message === "string") {
        return payload.message;
      }
    }
  } catch {
    // Ignore parsing issues and use fallback.
  }
  return fallback;
}
