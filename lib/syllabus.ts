import class11InorganicChemistry from "../planner/11/inorganic_chem.json";
import class11Maths from "../planner/11/maths.json";
import class11OrganicChemistry from "../planner/11/organic_chem.json";
import class11PhysicalChemistry from "../planner/11/physical_chem.json";
import class11Physics from "../planner/11/physics.json";
import class12InorganicChemistry from "../planner/12/inorganic_chem.json";
import class12Maths from "../planner/12/maths.json";
import class12OrganicChemistry from "../planner/12/organic_chem.json";
import class12PhysicalChemistry from "../planner/12/physical_chem.json";
import class12Physics from "../planner/12/physics.json";
import {
  SUBJECTS,
  type SubjectKey,
  type StudentClass,
  type CoverageData,
  type SubjectState,
  type TopicState,
} from "./types";

type RawSubjectJSON = Record<string, string[]>;

export interface TopicDefinition {
  id: string;
  title: string;
}

export interface ChapterDefinition {
  id: string;
  title: string;
  topics: TopicDefinition[];
}

export interface SubjectSyllabus {
  grade: StudentClass;
  subject: SubjectKey;
  title: string;
  chapters: ChapterDefinition[];
}

export interface GradeSyllabus {
  grade: StudentClass;
  subjects: SubjectSyllabus[];
}

type RawSyllabusMap = Record<StudentClass, Record<SubjectKey, RawSubjectJSON>>;

const RAW_SYLLABUS: RawSyllabusMap = {
  "11": {
    physics: class11Physics,
    maths: class11Maths,
    physical_chem: class11PhysicalChemistry,
    organic_chem: class11OrganicChemistry,
    inorganic_chem: class11InorganicChemistry,
  },
  "12": {
    physics: class12Physics,
    maths: class12Maths,
    physical_chem: class12PhysicalChemistry,
    organic_chem: class12OrganicChemistry,
    inorganic_chem: class12InorganicChemistry,
  },
};

const SUBJECT_SYLLABUS: Record<
  StudentClass,
  Record<SubjectKey, SubjectSyllabus>
> = buildSubjectSyllabus();

const GRADE_SYLLABUS: Record<StudentClass, GradeSyllabus> = {
  "11": {
    grade: "11",
    subjects: Object.values(SUBJECT_SYLLABUS["11"]),
  },
  "12": {
    grade: "12",
    subjects: Object.values(SUBJECT_SYLLABUS["12"]),
  },
};

export function getSubjectLabel(subject: SubjectKey): string {
  return SUBJECTS.find((entry) => entry.key === subject)?.label ?? subject;
}

export function getSubjectSyllabus(
  grade: StudentClass,
  subject: SubjectKey,
): SubjectSyllabus {
  const data = SUBJECT_SYLLABUS[grade]?.[subject];
  if (!data) {
    throw new Error(`Unknown syllabus for class ${grade}, subject ${subject}`);
  }
  return data;
}

export function getGradeSyllabus(grade: StudentClass): GradeSyllabus {
  const data = GRADE_SYLLABUS[grade];
  if (!data) {
    throw new Error(`Unknown syllabus for class ${grade}`);
  }
  return data;
}

export function getAllSyllabus(): Record<StudentClass, GradeSyllabus> {
  return GRADE_SYLLABUS;
}

function buildSubjectSyllabus(): Record<
  StudentClass,
  Record<SubjectKey, SubjectSyllabus>
> {
  return {
    "11": convertGrade("11"),
    "12": convertGrade("12"),
  };
}

function convertGrade(
  grade: StudentClass,
): Record<SubjectKey, SubjectSyllabus> {
  const rawSubjects = RAW_SYLLABUS[grade];
  return Object.entries(rawSubjects).reduce(
    (acc, [subjectKey, rawSubject]) => {
      const subject = subjectKey as SubjectKey;
      acc[subject] = normalizeSubject(grade, subject, rawSubject);
      return acc;
    },
    {} as Record<SubjectKey, SubjectSyllabus>,
  );
}

function normalizeSubject(
  grade: StudentClass,
  subject: SubjectKey,
  raw: RawSubjectJSON,
): SubjectSyllabus {
  const chapterCounter = new Map<string, number>();
  const chapters: ChapterDefinition[] = Object.entries(raw).map(
    ([chapterTitle, topics]) => {
      const chapterId = buildStableId(
        `${grade}-${subject}`,
        chapterTitle,
        chapterCounter,
      );
      const topicCounter = new Map<string, number>();
      const normalizedTopics: TopicDefinition[] = topics.map((title) => ({
        id: buildStableId(chapterId, title, topicCounter),
        title,
      }));
      return {
        id: chapterId,
        title: chapterTitle,
        topics: normalizedTopics,
      };
    },
  );

  const meta = SUBJECTS.find((entry) => entry.key === subject);

  return {
    grade,
    subject,
    title: meta?.label ?? subject,
    chapters,
  };
}

export function createBlankCoverageData(grade: StudentClass): CoverageData {
  const subjectMap = SUBJECT_SYLLABUS[grade];
  if (!subjectMap) {
    throw new Error(`Unknown syllabus for class ${grade}`);
  }

  return Object.entries(subjectMap).reduce<CoverageData>(
    (subjectAcc, [subjectKey, subject]) => {
      const typedSubjectKey = subjectKey as SubjectKey;

      const chapterState = subject.chapters.reduce<SubjectState>(
        (chapterAcc, chapter) => {
          const topicsState = chapter.topics.reduce<Record<string, TopicState>>(
            (topicAcc, topic) => {
              topicAcc[topic.title] = { completed: false, comment: "" };
              return topicAcc;
            },
            {},
          );

          chapterAcc[chapter.title] = {
            completed: false,
            comment: "",
            topics: topicsState,
          };
          return chapterAcc;
        },
        {},
      );

      subjectAcc[typedSubjectKey] = chapterState;
      return subjectAcc;
    },
    {} as CoverageData,
  );
}

function buildStableId(
  prefix: string,
  label: string,
  counter: Map<string, number>,
): string {
  const base = slugify(label) || "item";
  const key = `${prefix}-${base}`;
  const seen = counter.get(key) ?? 0;
  counter.set(key, seen + 1);
  return seen === 0 ? key : `${key}-${seen + 1}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
