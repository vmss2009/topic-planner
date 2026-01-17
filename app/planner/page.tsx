import PlannerFlow from "@/components/planner/PlannerFlow";
import { getAllSyllabus } from "@/lib/syllabus";

export const metadata = {
  title: "Syllabus Planner | Topic Tracker",
  description:
    "Create or update your IIT-JEE Class 11 & 12 syllabus coverage plan with an easy phone-based tracker.",
};

export default function PlannerPage() {
  const syllabusMap = getAllSyllabus();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <header className="space-y-4 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Planner
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Create or update your syllabus coverage
          </h1>
          <p className="text-base text-slate-600 sm:text-lg">
            Enter the student&rsquo;s phone number and select the class to load an
            existing plan or create a new one. Progress is saved automatically to
            the same number, so you can revisit and keep tracking anytime.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
          <PlannerFlow
            syllabusMap={syllabusMap}
            ctaLabel="Create or view coverage"
          />
        </section>

        <footer className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">
            Need to review comments or edit later?
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Just revisit this page and enter the same phone number. You&rsquo;ll be able
            to view completed topics, comments, and update progress without any
            additional login.
          </p>
        </footer>
      </div>
    </main>
  );
}
