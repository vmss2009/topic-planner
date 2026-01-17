import AdminDashboard from "@/components/admin/AdminDashboard";
import { getAllSyllabus } from "@/lib/syllabus";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | Syllabus Coverage Dashboard",
  description:
    "Review, edit, or delete syllabus coverage records for all registered phone numbers.",
};

export default function AdminPage() {
  const syllabusMap = getAllSyllabus();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <header className="space-y-4 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Admin Panel
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Syllabus coverage management
          </h1>
          <p className="text-base text-slate-600 sm:text-lg">
            Sign in with the admin credentials to view every phone-based
            coverage plan, update progress, or delete entries when required.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
          <AdminDashboard syllabusMap={syllabusMap} />
        </section>
      </div>
    </main>
  );
}
