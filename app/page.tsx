import PlannerFlow from "@/components/planner/PlannerFlow";
import { getAllSyllabus } from "@/lib/syllabus";

export default function HomePage() {
  const syllabusMap = getAllSyllabus();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <section
          id="planner"
          className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8"
        >
          <PlannerFlow
            syllabusMap={syllabusMap}
            ctaLabel="Create or view coverage"
          />
        </section>
      </div>
    </main>
  );
}
