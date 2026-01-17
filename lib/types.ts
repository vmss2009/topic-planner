export type StudentClass = "11" | "12";

export const SUBJECTS = [
  { key: "physics", label: "Physics" },
  { key: "maths", label: "Maths" },
  { key: "physical_chem", label: "Physical Chemistry" },
  { key: "organic_chem", label: "Organic Chemistry" },
  { key: "inorganic_chem", label: "Inorganic Chemistry" },
] as const;

export type SubjectKey = (typeof SUBJECTS)[number]["key"];

export interface TopicState {
  completed: boolean;
  comment: string;
}

export interface ChapterState {
  completed: boolean;
  comment: string;
  topics: Record<string, TopicState>;
}

export type SubjectState = Record<string, ChapterState>;

export type CoverageData = Record<SubjectKey, SubjectState>;

export interface CoverageRecord {
  id: number;
  phone: string;
  studentClass: StudentClass;
  data: CoverageData;
  createdAt: string;
  updatedAt: string;
}
