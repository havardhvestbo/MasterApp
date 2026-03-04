"use client";

import { useMemo, useState } from "react";
import type { DashboardData, DeadlineItem, TaskItem } from "@/app/lib/dashboard";

type DashboardHomeProps = {
  data: DashboardData;
};

const navigationLinks = [
  "Dashboard",
  "My Thesis",
  "Tasks",
  "Milestones",
  "Supervisor",
  "Resources",
  "Settings",
];

const urgencyStyles: Record<DeadlineItem["urgency"], string> = {
  high: "bg-[#C1603A]/15 text-[#8A3E22] border-[#C1603A]/30",
  medium: "bg-[#C9A87C]/20 text-[#6B4E2F] border-[#C9A87C]/40",
  low: "bg-[#4A6741]/15 text-[#355031] border-[#4A6741]/25",
};

const statusStyles: Record<TaskItem["status"], string> = {
  "Not Started": "bg-[#C9A87C]/20 text-[#6B4E2F]",
  "In Progress": "bg-[#4A6741]/15 text-[#355031]",
  Blocked: "bg-[#C1603A]/15 text-[#8A3E22]",
  Done: "bg-[#3B2A1A]/12 text-[#3B2A1A]",
};

function formatDate(dateString: string): string {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const past = new Date(timestamp).getTime();
  const diffHours = Math.max(1, Math.floor((now - past) / (60 * 60 * 1000)));

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getDaysUntil(dateString: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(`${dateString}T00:00:00`);
  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function SidebarContent() {
  return (
    <div className="flex h-full flex-col rounded-[1.75rem] border border-[#4A6741]/20 bg-[#F5F0E8] p-6 shadow-[0_14px_32px_rgba(59,42,26,0.13)]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B4E2F]">
          Master Thesis
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-[#3B2A1A]">
          Dashboard
        </h2>
      </div>

      <nav aria-label="Sidebar Navigation" className="mt-8">
        <ul className="space-y-2">
          {navigationLinks.map((link) => (
            <li key={link}>
              <a
                href="#"
                className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  link === "Dashboard"
                    ? "bg-[#4A6741] text-[#F5F0E8]"
                    : "text-[#3B2A1A] hover:bg-[#C9A87C]/30"
                }`}
              >
                {link}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto rounded-2xl border border-[#C9A87C]/35 bg-[#C9A87C]/15 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B4E2F]">
          Workspace
        </p>
        <p className="mt-1 text-sm text-[#3B2A1A]">
          Structured for weekly advisor check-ins and chapter-level progress.
        </p>
      </div>
    </div>
  );
}

export function DashboardHome({ data }: DashboardHomeProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const formattedCompletionDate = useMemo(
    () => formatDate(data.thesis.estimatedCompletionDate),
    [data.thesis.estimatedCompletionDate]
  );

  return (
    <div className="min-h-screen text-[#3B2A1A]">
      <header className="sticky top-0 z-30 border-b border-[#C9A87C]/35 bg-[#F5F0E8]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B4E2F]">
              Thesis Workspace
            </p>
            <p className="text-base font-semibold text-[#3B2A1A]">Dashboard</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((previous) => !previous)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#4A6741]/35 bg-[#F5F0E8] text-[#3B2A1A]"
            aria-label="Toggle sidebar"
          >
            <span className="relative block h-4 w-5">
              <span className="absolute left-0 top-0 block h-0.5 w-5 rounded bg-current" />
              <span className="absolute left-0 top-1.5 block h-0.5 w-5 rounded bg-current" />
              <span className="absolute left-0 top-3 block h-0.5 w-5 rounded bg-current" />
            </span>
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#3B2A1A]/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 p-4 transition-transform duration-300 lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <aside className="hidden w-72 shrink-0 lg:block">
          <SidebarContent />
        </aside>

        <main className="flex-1 space-y-6">
          <section className="rounded-[1.75rem] border border-[#C9A87C]/45 bg-[#F5F0E8] p-6 shadow-[0_18px_36px_rgba(59,42,26,0.11)] animate-[riseIn_0.55s_ease-out] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6B4E2F]">
              Thesis Dashboard
            </p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight text-[#3B2A1A] sm:text-3xl">
              {data.thesis.title}
            </h1>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#C9A87C]/45 bg-[#C9A87C]/14 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#6B4E2F]">
                  Student
                </p>
                <p className="mt-2 text-base font-semibold text-[#3B2A1A]">
                  {data.thesis.studentName}
                </p>
              </div>
              <div className="rounded-xl border border-[#4A6741]/30 bg-[#4A6741]/10 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#355031]">
                  Supervisor
                </p>
                <p className="mt-2 text-base font-semibold text-[#3B2A1A]">
                  {data.thesis.supervisorName}
                </p>
              </div>
              <div className="rounded-xl border border-[#C1603A]/30 bg-[#C1603A]/10 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#8A3E22]">
                  Estimated Completion
                </p>
                <p className="mt-2 text-base font-semibold text-[#3B2A1A]">
                  {formattedCompletionDate}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-xl bg-[#4A6741] px-5 py-2.5 text-sm font-semibold text-[#F5F0E8] transition hover:bg-[#415D39]"
              >
                + Add Task
              </button>
              <button
                type="button"
                className="rounded-xl border border-[#C1603A]/45 bg-[#F5F0E8] px-5 py-2.5 text-sm font-semibold text-[#8A3E22] transition hover:bg-[#C1603A]/10"
              >
                Upload Draft
              </button>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <section className="rounded-[1.5rem] border border-[#C9A87C]/45 bg-[#F5F0E8] p-6 shadow-[0_16px_32px_rgba(59,42,26,0.09)] animate-[riseIn_0.65s_ease-out]">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[#3B2A1A]">
                    Progress Tracker
                  </h2>
                  <p className="mt-1 text-sm text-[#6B4E2F]">
                    Overall completion, segmented by thesis chapter.
                  </p>
                </div>
                <p className="text-3xl font-semibold text-[#4A6741]">
                  {data.thesis.overallCompletionPercent}%
                </p>
              </div>

              <div className="mt-5 rounded-2xl border border-[#C9A87C]/45 bg-[#EADFCC] p-2">
                <div className="flex h-4 gap-1">
                  {data.thesis.chapterProgress.map((chapter, index) => (
                    <div
                      key={chapter.name}
                      className="h-full flex-1 overflow-hidden rounded-full bg-[#F5F0E8]/80"
                    >
                      <div
                        className={`h-full rounded-full ${
                          index % 2 === 0 ? "bg-[#4A6741]" : "bg-[#C1603A]"
                        }`}
                        style={{
                          width: `${
                            chapter.completionPercent > 0
                              ? chapter.completionPercent
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {data.thesis.chapterProgress.map((chapter, index) => (
                  <article
                    key={chapter.name}
                    className="rounded-xl border border-[#C9A87C]/35 bg-[#F5F0E8] p-3"
                  >
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <p className="font-medium text-[#3B2A1A]">{chapter.name}</p>
                      <p className="font-semibold text-[#6B4E2F]">
                        {chapter.completionPercent}%
                      </p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#EADFCC]">
                      <div
                        className={`h-full ${
                          index % 2 === 0 ? "bg-[#4A6741]" : "bg-[#C1603A]"
                        }`}
                        style={{ width: `${chapter.completionPercent}%` }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-[#C1603A]/35 bg-[#F5F0E8] p-6 shadow-[0_16px_32px_rgba(59,42,26,0.09)] animate-[riseIn_0.75s_ease-out]">
              <h2 className="text-xl font-semibold text-[#3B2A1A]">
                Upcoming Deadlines
              </h2>
              <p className="mt-1 text-sm text-[#6B4E2F]">
                Prioritized by urgency and due date.
              </p>

              <ul className="mt-4 space-y-3">
                {data.upcomingDeadlines.map((deadline) => {
                  const daysUntil = getDaysUntil(deadline.date);
                  const urgencyClass = urgencyStyles[deadline.urgency];

                  return (
                    <li
                      key={deadline.id}
                      className="rounded-xl border border-[#C9A87C]/30 bg-[#F5F0E8] p-4"
                    >
                      <p className="text-sm font-medium text-[#3B2A1A]">
                        {deadline.title}
                      </p>
                      <p className="mt-1 text-xs text-[#6B4E2F]">
                        {formatDate(deadline.date)} •{" "}
                        {daysUntil >= 0
                          ? `Due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`
                          : `Overdue by ${Math.abs(daysUntil)} day${
                              Math.abs(daysUntil) === 1 ? "" : "s"
                            }`}
                      </p>
                      <span
                        className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${urgencyClass}`}
                      >
                        {deadline.urgency}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-[1.5rem] border border-[#4A6741]/28 bg-[#F5F0E8] p-6 shadow-[0_16px_32px_rgba(59,42,26,0.09)] animate-[riseIn_0.85s_ease-out]">
              <h2 className="text-xl font-semibold text-[#3B2A1A]">
                Recent Activity
              </h2>
              <p className="mt-1 text-sm text-[#6B4E2F]">
                Latest edits, comments, and uploads.
              </p>

              <ul className="mt-5 space-y-4">
                {data.recentActivity.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                        item.type === "comment"
                          ? "bg-[#C1603A]"
                          : item.type === "upload"
                          ? "bg-[#C9A87C]"
                          : "bg-[#4A6741]"
                      }`}
                    />
                    <div>
                      <p className="text-sm leading-relaxed text-[#3B2A1A]">
                        {item.message}
                      </p>
                      <p className="mt-1 text-xs text-[#6B4E2F]">
                        {item.author} • {formatTimeAgo(item.timestamp)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[1.5rem] border border-[#C9A87C]/45 bg-[#F5F0E8] p-6 shadow-[0_16px_32px_rgba(59,42,26,0.09)] animate-[riseIn_0.95s_ease-out]">
              <h2 className="text-xl font-semibold text-[#3B2A1A]">
                Task Snapshot
              </h2>
              <p className="mt-1 text-sm text-[#6B4E2F]">
                Synced from the backend task list.
              </p>

              <ul className="mt-4 space-y-3">
                {data.tasks.map((task) => (
                  <li
                    key={task.id}
                    className="rounded-xl border border-[#C9A87C]/32 bg-[#F5F0E8] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-[#3B2A1A]">
                        {task.title}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${statusStyles[task.status]}`}
                      >
                        {task.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-[#6B4E2F]">
                      <span>{task.category}</span>
                      <span>•</span>
                      <span>Due {formatDate(task.dueDate)}</span>
                      {task.isPriority && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-[#8A3E22]">
                            Priority
                          </span>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
