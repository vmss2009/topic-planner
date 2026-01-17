"use client";

import { useEffect, useMemo, useState } from "react";
import type { SubjectSyllabus } from "@/lib/syllabus";
import type {
  CoverageData,
  SubjectKey,
  SubjectState,
  TopicState,
} from "@/lib/types";

interface PlannerClientProps {
  subjects: SubjectSyllabus[];
  coverage: CoverageData;
  onChange?: (next: CoverageData) => void;
  readOnly?: boolean;
}

export function PlannerClient({
  subjects,
  coverage,
  onChange,
  readOnly = false,
}: PlannerClientProps) {
  const normalizedCoverage = useMemo(
    () => ensureCoverageShape(subjects, coverage),
    [subjects, coverage],
  );

  const [draft, setDraft] = useState<CoverageData>(normalizedCoverage);
  const [activeSubject, setActiveSubject] = useState<SubjectKey | null>(
    subjects[0]?.subject ?? null,
  );
  const isReadOnly = readOnly;

  useEffect(() => {
    setDraft(normalizedCoverage);
  }, [normalizedCoverage]);

  useEffect(() => {
    if (!activeSubject && subjects.length > 0) {
      setActiveSubject(subjects[0].subject);
    }
  }, [activeSubject, subjects]);

  if (subjects.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
        No syllabus data available for this class.
      </div>
    );
  }

  if (!activeSubject) {
    return null;
  }

  const selectedSubject = subjects.find(
    (subject) => subject.subject === activeSubject,
  );

  if (!selectedSubject) {
    return (
      <div className="rounded-md border border-dashed border-red-300 bg-red-50 p-4 text-sm text-red-700">
        Unable to load the selected subject. Please choose another subject tab.
      </div>
    );
  }

  const subjectCoverages = draft[activeSubject] ?? {};

  return (
    <div className="flex flex-col gap-6">
      <SubjectTabs
        subjects={subjects}
        activeSubject={activeSubject}
        onSelect={setActiveSubject}
      />

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <header className="mb-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Subject
          </p>
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedSubject.title}
          </h2>
        </header>

        <div className="flex flex-col gap-4">
          {selectedSubject.chapters.map((chapter) => {
            const chapterState =
              subjectCoverages[chapter.title] ?? createChapterState();

            return (
              <article
                key={chapter.id}
                className="rounded-lg border border-gray-100 bg-gray-50 p-4 shadow-inner"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={chapterState.completed}
                      disabled={isReadOnly}
                      onChange={(event) =>
                        handleChapterToggle(
                          selectedSubject.subject,
                          chapter.title,
                          event.target.checked,
                        )
                      }
                    />
                    {chapter.title}
                  </label>

                  <textarea
                    value={chapterState.comment}
                    readOnly={isReadOnly}
                    onChange={(event) =>
                      handleChapterCommentChange(
                        selectedSubject.subject,
                        chapter.title,
                        event.target.value,
                      )
                    }
                    placeholder="Comments"
                    rows={1}
                    className={`w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-64 ${
                      isReadOnly
                        ? "bg-gray-100 text-black select-text"
                        : "bg-white text-black"
                    }`}
                  />
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Completed?
                  </p>

                  {chapter.topics.map((topic) => {
                    const topicState =
                      chapterState.topics[topic.title] ?? createTopicState();

                    return (
                      <div
                        key={topic.id}
                        className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <label className="flex items-center gap-2 text-sm text-gray-800">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              checked={topicState.completed}
                              disabled={isReadOnly}
                              onChange={(event) =>
                                handleTopicToggle(
                                  selectedSubject.subject,
                                  chapter.title,
                                  topic.title,
                                  event.target.checked,
                                )
                              }
                            />
                            {topic.title}
                          </label>

                          <textarea
                            value={topicState.comment}
                            readOnly={isReadOnly}
                            onChange={(event) =>
                              handleTopicCommentChange(
                                selectedSubject.subject,
                                chapter.title,
                                topic.title,
                                event.target.value,
                              )
                            }
                            placeholder="Comments"
                            rows={1}
                            className={`w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-64 ${
                              isReadOnly
                                ? "bg-gray-100 text-black select-text"
                                : "bg-gray-50 text-black"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );

  function handleChapterToggle(
    subjectKey: SubjectKey,
    chapterTitle: string,
    completed: boolean,
  ) {
    updateDraft((next) => {
      ensureSubjectExists(next, subjectKey);
      ensureChapterExists(next[subjectKey], chapterTitle);

      const chapterState = next[subjectKey][chapterTitle];
      chapterState.completed = completed;

      Object.values(chapterState.topics).forEach((topic) => {
        topic.completed = completed;
      });
    });
  }

  function handleChapterCommentChange(
    subjectKey: SubjectKey,
    chapterTitle: string,
    comment: string,
  ) {
    updateDraft((next) => {
      ensureSubjectExists(next, subjectKey);
      ensureChapterExists(next[subjectKey], chapterTitle);
      next[subjectKey][chapterTitle].comment = comment;
    });
  }

  function handleTopicToggle(
    subjectKey: SubjectKey,
    chapterTitle: string,
    topicTitle: string,
    completed: boolean,
  ) {
    updateDraft((next) => {
      ensureSubjectExists(next, subjectKey);
      ensureChapterExists(next[subjectKey], chapterTitle);
      ensureTopicExists(next[subjectKey][chapterTitle], topicTitle);

      const chapterState = next[subjectKey][chapterTitle];
      chapterState.topics[topicTitle].completed = completed;

      const allCompleted = Object.values(chapterState.topics).every(
        (topic) => topic.completed,
      );
      chapterState.completed = allCompleted;
    });
  }

  function handleTopicCommentChange(
    subjectKey: SubjectKey,
    chapterTitle: string,
    topicTitle: string,
    comment: string,
  ) {
    updateDraft((next) => {
      ensureSubjectExists(next, subjectKey);
      ensureChapterExists(next[subjectKey], chapterTitle);
      ensureTopicExists(next[subjectKey][chapterTitle], topicTitle);

      next[subjectKey][chapterTitle].topics[topicTitle].comment = comment;
    });
  }

  function updateDraft(mutator: (draft: CoverageData) => void) {
    if (isReadOnly) {
      return;
    }
    setDraft((previous) => {
      const cloned = cloneCoverage(previous);
      mutator(cloned);
      onChange?.(cloned);
      return cloned;
    });
  }
}

function SubjectTabs({
  subjects,
  activeSubject,
  onSelect,
}: {
  subjects: SubjectSyllabus[];
  activeSubject: SubjectKey;
  onSelect: (key: SubjectKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {subjects.map((subject) => {
        const isActive = subject.subject === activeSubject;

        return (
          <button
            key={subject.subject}
            type="button"
            onClick={() => onSelect(subject.subject)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "border-indigo-600 bg-indigo-600 text-white shadow"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            {subject.title}
          </button>
        );
      })}
    </div>
  );
}

function ensureCoverageShape(
  subjects: SubjectSyllabus[],
  coverage: CoverageData,
): CoverageData {
  const draft = cloneCoverage(coverage);

  subjects.forEach((subject) => {
    ensureSubjectExists(draft, subject.subject);

    subject.chapters.forEach((chapter) => {
      ensureChapterExists(draft[subject.subject], chapter.title);

      const chapterState = draft[subject.subject][chapter.title];

      chapter.topics.forEach((topic) => {
        ensureTopicExists(chapterState, topic.title);
      });
    });
  });

  return draft;
}

function ensureSubjectExists(state: CoverageData, subjectKey: SubjectKey) {
  if (!state[subjectKey]) {
    state[subjectKey] = {};
  }
}

function ensureChapterExists(subjectState: SubjectState, chapterTitle: string) {
  if (!subjectState[chapterTitle]) {
    subjectState[chapterTitle] = createChapterState();
  }
}

function ensureTopicExists(
  chapterState: ReturnType<typeof createChapterState>,
  topicTitle: string,
) {
  if (!chapterState.topics[topicTitle]) {
    chapterState.topics[topicTitle] = createTopicState();
  }
}

function createChapterState(): {
  completed: boolean;
  comment: string;
  topics: Record<string, TopicState>;
} {
  return {
    completed: false,
    comment: "",
    topics: {},
  };
}

function createTopicState(): TopicState {
  return {
    completed: false,
    comment: "",
  };
}

function cloneCoverage(data: CoverageData): CoverageData {
  return JSON.parse(JSON.stringify(data)) as CoverageData;
}

export default PlannerClient;
