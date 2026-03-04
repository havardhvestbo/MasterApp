"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  createMilestone,
  createResource,
  createSupervisorNote,
  createTask,
  deleteMilestone,
  deleteResource,
  deleteSupervisorNote,
  deleteTask,
  type ActivityItem,
  type AppSettings,
  type ChapterProgress,
  type DashboardData,
  type MilestoneItem,
  type MilestoneStatus,
  type ResourceItem,
  type SupervisorNote,
  type TaskItem,
  type TaskStatus,
  updateMilestone,
  updateSettings,
  updateTaskStatus,
  updateThesisMetadata,
  uploadDraft,
} from "@/app/lib/dashboard";

type DashboardHomeProps = {
  data: DashboardData;
};

type TaskFilter = "All" | TaskStatus;

type BannerState = {
  type: "success" | "error";
  message: string;
} | null;

const navigationLinks = [
  { label: "Dashboard", href: "#dashboard" },
  { label: "My Thesis", href: "#my-thesis" },
  { label: "Tasks", href: "#tasks" },
  { label: "Milestones", href: "#milestones" },
  { label: "Supervisor", href: "#supervisor" },
  { label: "Resources", href: "#resources" },
  { label: "Settings", href: "#settings" },
];

const taskStatusOptions: TaskStatus[] = [
  "Not Started",
  "In Progress",
  "Blocked",
  "Done",
];

const taskFilterOptions: TaskFilter[] = ["All", ...taskStatusOptions];

const milestoneStatusOptions: MilestoneStatus[] = ["Planned", "Done"];

const defaultSettings: AppSettings = {
  notificationsEnabled: true,
  weeklyWritingGoalHours: 14,
  reminderTime: "09:00",
  preferredView: "Dashboard",
};

const urgencyStyles: Record<MilestoneItem["urgency"], string> = {
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

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function sortTasksByDueDate(items: TaskItem[] | null | undefined): TaskItem[] {
  return [...(items ?? [])].sort(
    (left, right) =>
      new Date(`${left.dueDate}T00:00:00`).getTime() -
      new Date(`${right.dueDate}T00:00:00`).getTime()
  );
}

function sortMilestonesByDate(
  items: MilestoneItem[] | null | undefined
): MilestoneItem[] {
  return [...(items ?? [])].sort(
    (left, right) =>
      new Date(`${left.date}T00:00:00`).getTime() -
      new Date(`${right.date}T00:00:00`).getTime()
  );
}

function sortNotes(items: SupervisorNote[] | null | undefined): SupervisorNote[] {
  return [...(items ?? [])].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return Number(right.isPinned) - Number(left.isPinned);
    }

    return (
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    );
  });
}

function sortResources(items: ResourceItem[] | null | undefined): ResourceItem[] {
  return [...(items ?? [])].sort(
    (left, right) =>
      new Date(right.addedAt).getTime() - new Date(left.addedAt).getTime()
  );
}

function getDefaultDueDate(): string {
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return nextWeek.toISOString().split("T")[0];
}

function SidebarContent({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
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
            <li key={link.label}>
              <a
                href={link.href}
                onClick={onNavigate}
                className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  link.label === "Dashboard"
                    ? "bg-[#4A6741] text-[#F5F0E8]"
                    : "text-[#3B2A1A] hover:bg-[#C9A87C]/30"
                }`}
              >
                {link.label}
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
          Structured for advisor check-ins, chapter progress, and delivery milestones.
        </p>
      </div>
    </div>
  );
}

function upsertMilestone(list: MilestoneItem[], milestone: MilestoneItem): MilestoneItem[] {
  const index = list.findIndex((item) => item.id === milestone.id);
  if (index < 0) {
    return sortMilestonesByDate([milestone, ...list]);
  }

  const updated = [...list];
  updated[index] = milestone;
  return sortMilestonesByDate(updated);
}

export function DashboardHome({ data }: DashboardHomeProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [thesis, setThesis] = useState(data.thesis);
  const [tasks, setTasks] = useState(() => sortTasksByDueDate(data.tasks));
  const [milestones, setMilestones] = useState(() =>
    sortMilestonesByDate(data.milestones)
  );
  const [recentActivity, setRecentActivity] = useState(
    data.recentActivity ?? []
  );
  const [supervisorNotes, setSupervisorNotes] = useState(() =>
    sortNotes(data.supervisorNotes)
  );
  const [resources, setResources] = useState(() =>
    sortResources(data.resources)
  );
  const [settings, setSettings] = useState<AppSettings>(
    data.settings ?? defaultSettings
  );

  const [taskFilter, setTaskFilter] = useState<TaskFilter>("All");
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [updatingMilestoneId, setUpdatingMilestoneId] = useState<string | null>(null);
  const [deletingMilestoneId, setDeletingMilestoneId] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [deletingResourceId, setDeletingResourceId] = useState<string | null>(null);

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isUploadDraftOpen, setIsUploadDraftOpen] = useState(false);
  const [isEditThesisOpen, setIsEditThesisOpen] = useState(false);
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [isAddResourceOpen, setIsAddResourceOpen] = useState(false);

  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isUploadingDraft, setIsUploadingDraft] = useState(false);
  const [isSavingThesis, setIsSavingThesis] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isAddingResource, setIsAddingResource] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("Writing");
  const [newTaskDueDate, setNewTaskDueDate] = useState(getDefaultDueDate());
  const [newTaskPriority, setNewTaskPriority] = useState(false);

  const [draftFileName, setDraftFileName] = useState("");
  const [draftVersion, setDraftVersion] = useState("0.7");
  const [draftNotes, setDraftNotes] = useState("");

  const [thesisTitle, setThesisTitle] = useState(thesis.title);
  const [thesisStudentName, setThesisStudentName] = useState(thesis.studentName);
  const [thesisSupervisorName, setThesisSupervisorName] = useState(
    thesis.supervisorName
  );
  const [thesisCompletionDate, setThesisCompletionDate] = useState(
    thesis.estimatedCompletionDate
  );
  const [chapterProgressDraft, setChapterProgressDraft] = useState<ChapterProgress[]>(
    thesis.chapterProgress
  );

  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState(getDefaultDueDate());
  const [newMilestoneUrgency, setNewMilestoneUrgency] = useState<
    "high" | "medium" | "low"
  >("medium");

  const [newNoteMessage, setNewNoteMessage] = useState("");
  const [newNoteAuthor, setNewNoteAuthor] = useState("Dr. Ingrid Solheim");
  const [newNotePinned, setNewNotePinned] = useState(false);

  const [newResourceTitle, setNewResourceTitle] = useState("");
  const [newResourceType, setNewResourceType] = useState("Article");
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [newResourceDescription, setNewResourceDescription] = useState("");

  const [settingsNotifications, setSettingsNotifications] = useState(
    settings.notificationsEnabled
  );
  const [settingsWeeklyHours, setSettingsWeeklyHours] = useState(
    settings.weeklyWritingGoalHours
  );
  const [settingsReminderTime, setSettingsReminderTime] = useState(
    settings.reminderTime
  );
  const [settingsPreferredView, setSettingsPreferredView] = useState(
    settings.preferredView
  );

  const [banner, setBanner] = useState<BannerState>(null);

  const overallCompletionPercent = useMemo(() => {
    const chapterAverage =
      thesis.chapterProgress.reduce(
        (total, chapter) => total + chapter.completionPercent,
        0
      ) / thesis.chapterProgress.length;
    const doneTasks = tasks.filter((task) => task.status === "Done").length;
    const taskCompletion = tasks.length > 0 ? (doneTasks * 100) / tasks.length : 0;

    return Math.round(Math.min(100, chapterAverage * 0.85 + taskCompletion * 0.15));
  }, [thesis.chapterProgress, tasks]);

  const formattedCompletionDate = useMemo(
    () => formatDate(thesis.estimatedCompletionDate),
    [thesis.estimatedCompletionDate]
  );

  const filteredTasks = useMemo(() => {
    if (taskFilter === "All") {
      return tasks;
    }

    return tasks.filter((task) => task.status === taskFilter);
  }, [taskFilter, tasks]);

  function addActivity(activity: ActivityItem) {
    setRecentActivity((previous) => [activity, ...previous].slice(0, 40));
  }

  function notifyError(error: unknown, fallbackMessage: string) {
    setBanner({
      type: "error",
      message: error instanceof Error ? error.message : fallbackMessage,
    });
  }

  function resetTaskForm() {
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskCategory("Writing");
    setNewTaskDueDate(getDefaultDueDate());
    setNewTaskPriority(false);
  }

  function resetThesisDrafts(nextThesis: typeof thesis) {
    setThesisTitle(nextThesis.title);
    setThesisStudentName(nextThesis.studentName);
    setThesisSupervisorName(nextThesis.supervisorName);
    setThesisCompletionDate(nextThesis.estimatedCompletionDate);
    setChapterProgressDraft(nextThesis.chapterProgress);
  }

  function resetMilestoneForm() {
    setNewMilestoneTitle("");
    setNewMilestoneDate(getDefaultDueDate());
    setNewMilestoneUrgency("medium");
  }

  function resetNoteForm() {
    setNewNoteMessage("");
    setNewNoteAuthor("Dr. Ingrid Solheim");
    setNewNotePinned(false);
  }

  function resetResourceForm() {
    setNewResourceTitle("");
    setNewResourceType("Article");
    setNewResourceUrl("");
    setNewResourceDescription("");
  }

  function closeAllDialogs() {
    setIsAddTaskOpen(false);
    setIsUploadDraftOpen(false);
    setIsEditThesisOpen(false);
    setIsAddMilestoneOpen(false);
    setIsAddNoteOpen(false);
    setIsAddResourceOpen(false);
  }

  async function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newTaskTitle.trim()) {
      setBanner({ type: "error", message: "Task title is required." });
      return;
    }

    setIsCreatingTask(true);
    try {
      const result = await createTask({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        dueDate: newTaskDueDate || undefined,
        category: newTaskCategory || undefined,
        isPriority: newTaskPriority,
      });

      setTasks((previous) => sortTasksByDueDate([result.task, ...previous]));
      if (result.milestone) {
        setMilestones((previous) => upsertMilestone(previous, result.milestone!));
      }
      addActivity(result.activity);
      setBanner({ type: "success", message: "Task added successfully." });
      resetTaskForm();
      setIsAddTaskOpen(false);
    } catch (error) {
      notifyError(error, "Could not create task.");
    } finally {
      setIsCreatingTask(false);
    }
  }

  async function handleTaskStatusChange(taskId: string, nextStatus: TaskStatus) {
    setUpdatingTaskId(taskId);
    try {
      const result = await updateTaskStatus(taskId, nextStatus);
      setTasks((previous) =>
        sortTasksByDueDate(
          previous.map((task) => (task.id === taskId ? result.task : task))
        )
      );

      if (result.milestone) {
        setMilestones((previous) => upsertMilestone(previous, result.milestone!));
      }

      addActivity(result.activity);
      setBanner({
        type: "success",
        message: `Task updated to "${result.task.status}".`,
      });
    } catch (error) {
      notifyError(error, "Could not update task status.");
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleDeleteTask(task: TaskItem) {
    setDeletingTaskId(task.id);
    try {
      await deleteTask(task.id);

      setTasks((previous) => previous.filter((item) => item.id !== task.id));
      setMilestones((previous) => previous.filter((item) => item.taskId !== task.id));
      addActivity({
        id: crypto.randomUUID(),
        type: "edit",
        message: `Deleted task "${task.title}".`,
        timestamp: new Date().toISOString(),
        author: "Havard Vestbo",
      });
      setBanner({ type: "success", message: "Task deleted." });
    } catch (error) {
      notifyError(error, "Could not delete task.");
    } finally {
      setDeletingTaskId(null);
    }
  }

  async function handleDraftUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draftFileName.trim()) {
      setBanner({ type: "error", message: "Select a file before uploading." });
      return;
    }

    setIsUploadingDraft(true);
    try {
      const result = await uploadDraft({
        fileName: draftFileName.trim(),
        version: draftVersion.trim() || undefined,
        notes: draftNotes.trim() || undefined,
      });

      addActivity(result.activity);
      setBanner({ type: "success", message: "Draft uploaded successfully." });
      setDraftFileName("");
      setDraftVersion("0.7");
      setDraftNotes("");
      setIsUploadDraftOpen(false);
    } catch (error) {
      notifyError(error, "Could not upload draft.");
    } finally {
      setIsUploadingDraft(false);
    }
  }

  async function handleSaveThesis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSavingThesis(true);
    try {
      const result = await updateThesisMetadata({
        title: thesisTitle.trim(),
        studentName: thesisStudentName.trim(),
        supervisorName: thesisSupervisorName.trim(),
        estimatedCompletionDate: thesisCompletionDate,
        chapterProgress: chapterProgressDraft.map((chapter) => ({
          name: chapter.name,
          completionPercent: Math.max(0, Math.min(100, chapter.completionPercent)),
        })),
      });

      setThesis(result.thesis);
      resetThesisDrafts(result.thesis);
      addActivity(result.activity);
      setBanner({ type: "success", message: "Thesis details updated." });
      setIsEditThesisOpen(false);
    } catch (error) {
      notifyError(error, "Could not update thesis metadata.");
    } finally {
      setIsSavingThesis(false);
    }
  }

  async function handleAddMilestone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newMilestoneTitle.trim()) {
      setBanner({ type: "error", message: "Milestone title is required." });
      return;
    }

    setIsAddingMilestone(true);
    try {
      const milestone = await createMilestone({
        title: newMilestoneTitle.trim(),
        date: newMilestoneDate,
        urgency: newMilestoneUrgency,
      });

      setMilestones((previous) => upsertMilestone(previous, milestone));
      addActivity({
        id: crypto.randomUUID(),
        type: "edit",
        message: `Added milestone "${milestone.title}".`,
        timestamp: new Date().toISOString(),
        author: "Havard Vestbo",
      });
      setBanner({ type: "success", message: "Milestone added." });
      resetMilestoneForm();
      setIsAddMilestoneOpen(false);
    } catch (error) {
      notifyError(error, "Could not create milestone.");
    } finally {
      setIsAddingMilestone(false);
    }
  }

  async function handleMilestoneStatusChange(
    milestoneId: string,
    status: MilestoneStatus
  ) {
    setUpdatingMilestoneId(milestoneId);
    try {
      const updated = await updateMilestone(milestoneId, { status });
      setMilestones((previous) => upsertMilestone(previous, updated));
      setBanner({ type: "success", message: "Milestone updated." });
    } catch (error) {
      notifyError(error, "Could not update milestone.");
    } finally {
      setUpdatingMilestoneId(null);
    }
  }

  async function handleDeleteMilestone(milestone: MilestoneItem) {
    setDeletingMilestoneId(milestone.id);
    try {
      await deleteMilestone(milestone.id);
      setMilestones((previous) => previous.filter((item) => item.id !== milestone.id));
      addActivity({
        id: crypto.randomUUID(),
        type: "edit",
        message: `Deleted milestone "${milestone.title}".`,
        timestamp: new Date().toISOString(),
        author: "Havard Vestbo",
      });
      setBanner({ type: "success", message: "Milestone deleted." });
    } catch (error) {
      notifyError(error, "Could not delete milestone.");
    } finally {
      setDeletingMilestoneId(null);
    }
  }

  async function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newNoteMessage.trim()) {
      setBanner({ type: "error", message: "Note message is required." });
      return;
    }

    setIsAddingNote(true);
    try {
      const note = await createSupervisorNote({
        message: newNoteMessage.trim(),
        author: newNoteAuthor.trim() || undefined,
        isPinned: newNotePinned,
      });

      setSupervisorNotes((previous) => sortNotes([note, ...previous]));
      addActivity({
        id: crypto.randomUUID(),
        type: "comment",
        message: `Supervisor note: ${note.message}`,
        timestamp: note.timestamp,
        author: note.author,
      });
      setBanner({ type: "success", message: "Supervisor note added." });
      resetNoteForm();
      setIsAddNoteOpen(false);
    } catch (error) {
      notifyError(error, "Could not add supervisor note.");
    } finally {
      setIsAddingNote(false);
    }
  }

  async function handleDeleteNote(note: SupervisorNote) {
    setDeletingNoteId(note.id);
    try {
      await deleteSupervisorNote(note.id);
      setSupervisorNotes((previous) => previous.filter((item) => item.id !== note.id));
      setBanner({ type: "success", message: "Supervisor note deleted." });
    } catch (error) {
      notifyError(error, "Could not delete supervisor note.");
    } finally {
      setDeletingNoteId(null);
    }
  }

  async function handleAddResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newResourceTitle.trim()) {
      setBanner({ type: "error", message: "Resource title is required." });
      return;
    }

    setIsAddingResource(true);
    try {
      const resource = await createResource({
        title: newResourceTitle.trim(),
        type: newResourceType.trim() || undefined,
        url: newResourceUrl.trim() || undefined,
        description: newResourceDescription.trim() || undefined,
      });

      setResources((previous) => sortResources([resource, ...previous]));
      addActivity({
        id: crypto.randomUUID(),
        type: "edit",
        message: `Added resource "${resource.title}".`,
        timestamp: resource.addedAt,
        author: "Havard Vestbo",
      });
      setBanner({ type: "success", message: "Resource added." });
      resetResourceForm();
      setIsAddResourceOpen(false);
    } catch (error) {
      notifyError(error, "Could not add resource.");
    } finally {
      setIsAddingResource(false);
    }
  }

  async function handleDeleteResource(resource: ResourceItem) {
    setDeletingResourceId(resource.id);
    try {
      await deleteResource(resource.id);
      setResources((previous) => previous.filter((item) => item.id !== resource.id));
      setBanner({ type: "success", message: "Resource deleted." });
    } catch (error) {
      notifyError(error, "Could not delete resource.");
    } finally {
      setDeletingResourceId(null);
    }
  }

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSavingSettings(true);
    try {
      const updated = await updateSettings({
        notificationsEnabled: settingsNotifications,
        weeklyWritingGoalHours: settingsWeeklyHours,
        reminderTime: settingsReminderTime,
        preferredView: settingsPreferredView,
      });

      setSettings(updated);
      setSettingsNotifications(updated.notificationsEnabled);
      setSettingsWeeklyHours(updated.weeklyWritingGoalHours);
      setSettingsReminderTime(updated.reminderTime);
      setSettingsPreferredView(updated.preferredView);
      setBanner({ type: "success", message: "Settings saved." });
      addActivity({
        id: crypto.randomUUID(),
        type: "edit",
        message: "Updated dashboard settings.",
        timestamp: new Date().toISOString(),
        author: "Havard Vestbo",
      });
    } catch (error) {
      notifyError(error, "Could not save settings.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  const anyDialogOpen =
    isAddTaskOpen ||
    isUploadDraftOpen ||
    isEditThesisOpen ||
    isAddMilestoneOpen ||
    isAddNoteOpen ||
    isAddResourceOpen;

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
        <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
      </div>

      <div className="mx-auto flex w-full max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <aside className="hidden w-72 shrink-0 lg:block">
          <SidebarContent />
        </aside>

        <main className="flex-1 space-y-6">
          {banner && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                banner.type === "success"
                  ? "border-[#4A6741]/35 bg-[#4A6741]/10 text-[#355031]"
                  : "border-[#C1603A]/35 bg-[#C1603A]/10 text-[#8A3E22]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span>{banner.message}</span>
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-xs font-semibold hover:bg-black/5"
                  onClick={() => setBanner(null)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <section
            id="dashboard"
            className="rounded-[1.75rem] border border-[#C9A87C]/45 bg-[#F5F0E8] p-6 shadow-[0_18px_36px_rgba(59,42,26,0.11)] animate-[riseIn_0.55s_ease-out] sm:p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6B4E2F]">
                  Thesis Dashboard
                </p>
                <h1 className="mt-3 text-2xl font-semibold leading-tight text-[#3B2A1A] sm:text-3xl">
                  {thesis.title}
                </h1>
              </div>
              <button
                type="button"
                className="rounded-xl border border-[#C9A87C]/45 bg-[#F5F0E8] px-4 py-2 text-sm font-semibold text-[#6B4E2F] hover:bg-[#C9A87C]/15"
                onClick={() => {
                  resetThesisDrafts(thesis);
                  setIsEditThesisOpen(true);
                }}
              >
                Edit Thesis
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#C9A87C]/45 bg-[#C9A87C]/14 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#6B4E2F]">
                  Student
                </p>
                <p className="mt-2 text-base font-semibold text-[#3B2A1A]">
                  {thesis.studentName}
                </p>
              </div>
              <div className="rounded-xl border border-[#4A6741]/30 bg-[#4A6741]/10 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#355031]">
                  Supervisor
                </p>
                <p className="mt-2 text-base font-semibold text-[#3B2A1A]">
                  {thesis.supervisorName}
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
                onClick={() => setIsAddTaskOpen(true)}
                className="rounded-xl bg-[#4A6741] px-5 py-2.5 text-sm font-semibold text-[#F5F0E8] transition hover:bg-[#415D39]"
              >
                + Add Task
              </button>
              <button
                type="button"
                onClick={() => setIsUploadDraftOpen(true)}
                className="rounded-xl border border-[#C1603A]/45 bg-[#F5F0E8] px-5 py-2.5 text-sm font-semibold text-[#8A3E22] transition hover:bg-[#C1603A]/10"
              >
                Upload Draft
              </button>
              <button
                type="button"
                onClick={() => setIsAddMilestoneOpen(true)}
                className="rounded-xl border border-[#C9A87C]/45 bg-[#F5F0E8] px-5 py-2.5 text-sm font-semibold text-[#6B4E2F] transition hover:bg-[#C9A87C]/15"
              >
                + Add Milestone
              </button>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            <section
              id="my-thesis"
              className="rounded-[1.5rem] border border-[#C9A87C]/45 bg-[#F5F0E8] p-6 shadow-[0_16px_32px_rgba(59,42,26,0.09)] animate-[riseIn_0.65s_ease-out]"
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[#3B2A1A]">
                    Progress Tracker
                  </h2>
                  <p className="mt-1 text-sm text-[#6B4E2F]">
                    Weighted by chapter completion and completed tasks.
                  </p>
                </div>
                <p className="text-3xl font-semibold text-[#4A6741]">
                  {overallCompletionPercent}%
                </p>
              </div>

              <div className="mt-5 rounded-2xl border border-[#C9A87C]/45 bg-[#EADFCC] p-2">
                <div className="flex h-4 gap-1">
                  {thesis.chapterProgress.map((chapter, index) => (
                    <div
                      key={chapter.name}
                      className="h-full flex-1 overflow-hidden rounded-full bg-[#F5F0E8]/80"
                    >
                      <div
                        className={`h-full rounded-full ${
                          index % 2 === 0 ? "bg-[#4A6741]" : "bg-[#C1603A]"
                        }`}
                        style={{ width: `${chapter.completionPercent}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {thesis.chapterProgress.map((chapter, index) => (
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

            <section
              id="milestones"
              className="rounded-[1.5rem] border border-[#C1603A]/35 bg-[#F5F0E8] p-6 shadow-[0_16px_32px_rgba(59,42,26,0.09)] animate-[riseIn_0.75s_ease-out]"
            >
              <h2 className="text-xl font-semibold text-[#3B2A1A]">Milestones</h2>
              <p className="mt-1 text-sm text-[#6B4E2F]">
                Due dates, urgency, and completion status.
              </p>

              <ul className="mt-4 space-y-3">
                {milestones.map((milestone) => {
                  const daysUntil = getDaysUntil(milestone.date);
                  const urgencyClass = urgencyStyles[milestone.urgency];

                  return (
                    <li
                      key={milestone.id}
                      className="rounded-xl border border-[#C9A87C]/30 bg-[#F5F0E8] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-[#3B2A1A]">
                          {milestone.title}
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleDeleteMilestone(milestone)}
                          disabled={deletingMilestoneId === milestone.id}
                          className="rounded-md px-2 py-1 text-xs text-[#8A3E22] hover:bg-[#C1603A]/10 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>

                      <p className="mt-1 text-xs text-[#6B4E2F]">
                        {formatDate(milestone.date)} •{" "}
                        {daysUntil >= 0
                          ? `Due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`
                          : `Overdue by ${Math.abs(daysUntil)} day${
                              Math.abs(daysUntil) === 1 ? "" : "s"
                            }`}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${urgencyClass}`}
                        >
                          {milestone.urgency}
                        </span>
                        <select
                          value={milestone.status}
                          onChange={(event) =>
                            void handleMilestoneStatusChange(
                              milestone.id,
                              event.target.value as MilestoneStatus
                            )
                          }
                          disabled={updatingMilestoneId === milestone.id}
                          className="rounded-md border border-[#C9A87C]/45 bg-[#F5F0E8] px-2 py-1 text-xs text-[#3B2A1A] outline-none focus:border-[#4A6741] disabled:opacity-60"
                        >
                          {milestoneStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section
              id="tasks"
              className="rounded-[1.5rem] border border-[#C9A87C]/45 bg-[#F5F0E8] p-6 shadow-[0_16px_32px_rgba(59,42,26,0.09)] animate-[riseIn_0.85s_ease-out]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[#3B2A1A]">
                    Tasks
                  </h2>
                  <p className="mt-1 text-sm text-[#6B4E2F]">
                    Manage task statuses and thesis workload.
                  </p>
                </div>
                <select
                  value={taskFilter}
                  onChange={(event) =>
                    setTaskFilter(event.target.value as TaskFilter)
                  }
                  className="rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm text-[#3B2A1A] outline-none focus:border-[#4A6741]"
                >
                  {taskFilterOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <ul className="mt-4 space-y-3">
                {filteredTasks.map((task) => (
                  <li
                    key={task.id}
                    className="rounded-xl border border-[#C9A87C]/32 bg-[#F5F0E8] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-[#3B2A1A]">{task.title}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${statusStyles[task.status]}`}
                      >
                        {task.status}
                      </span>
                    </div>

                    {task.description && (
                      <p className="mt-2 text-xs text-[#6B4E2F]">{task.description}</p>
                    )}

                    <div className="mt-2 flex items-center gap-2 text-xs text-[#6B4E2F]">
                      <span>{task.category}</span>
                      <span>•</span>
                      <span>Due {formatDate(task.dueDate)}</span>
                      {task.isPriority && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-[#8A3E22]">Priority</span>
                        </>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <label htmlFor={`status-${task.id}`} className="text-xs text-[#6B4E2F]">
                        Status:
                      </label>
                      <select
                        id={`status-${task.id}`}
                        value={task.status}
                        disabled={updatingTaskId === task.id}
                        onChange={(event) =>
                          void handleTaskStatusChange(
                            task.id,
                            event.target.value as TaskStatus
                          )
                        }
                        className="rounded-md border border-[#C9A87C]/45 bg-[#F5F0E8] px-2 py-1 text-xs text-[#3B2A1A] outline-none focus:border-[#4A6741] disabled:opacity-60"
                      >
                        {taskStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => void handleDeleteTask(task)}
                        disabled={deletingTaskId === task.id}
                        className="rounded-md px-2 py-1 text-xs text-[#8A3E22] hover:bg-[#C1603A]/10 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {filteredTasks.length === 0 && (
                <p className="mt-4 rounded-lg border border-[#C9A87C]/30 bg-[#C9A87C]/10 px-3 py-2 text-sm text-[#6B4E2F]">
                  No tasks found for this filter.
                </p>
              )}
            </section>

            <section
              id="supervisor"
              className="rounded-[1.5rem] border border-[#4A6741]/28 bg-[#F5F0E8] p-6 shadow-[0_16px_32px_rgba(59,42,26,0.09)] animate-[riseIn_0.95s_ease-out]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[#3B2A1A]">
                    Supervisor Notes
                  </h2>
                  <p className="mt-1 text-sm text-[#6B4E2F]">
                    Comments, guidance, and review checkpoints.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-[#4A6741]/35 bg-[#F5F0E8] px-3 py-2 text-sm font-semibold text-[#355031] hover:bg-[#4A6741]/10"
                  onClick={() => setIsAddNoteOpen(true)}
                >
                  + Add Note
                </button>
              </div>

              <ul className="mt-4 space-y-3">
                {supervisorNotes.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-xl border border-[#C9A87C]/30 bg-[#F5F0E8] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-[#3B2A1A]">{note.message}</p>
                      <button
                        type="button"
                        onClick={() => void handleDeleteNote(note)}
                        disabled={deletingNoteId === note.id}
                        className="rounded-md px-2 py-1 text-xs text-[#8A3E22] hover:bg-[#C1603A]/10 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>

                    <p className="mt-2 text-xs text-[#6B4E2F]">
                      {note.author} • {formatDateTime(note.timestamp)}
                    </p>
                    {note.isPinned && (
                      <span className="mt-2 inline-flex rounded-full bg-[#4A6741]/12 px-2.5 py-1 text-xs font-semibold text-[#355031]">
                        Pinned
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section
              id="resources"
              className="rounded-[1.5rem] border border-[#C9A87C]/45 bg-[#F5F0E8] p-6 shadow-[0_16px_32px_rgba(59,42,26,0.09)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[#3B2A1A]">Resources</h2>
                  <p className="mt-1 text-sm text-[#6B4E2F]">
                    Keep references, links, and templates organized.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm font-semibold text-[#6B4E2F] hover:bg-[#C9A87C]/15"
                  onClick={() => setIsAddResourceOpen(true)}
                >
                  + Add Resource
                </button>
              </div>

              <ul className="mt-4 space-y-3">
                {resources.map((resource) => (
                  <li
                    key={resource.id}
                    className="rounded-xl border border-[#C9A87C]/30 bg-[#F5F0E8] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#3B2A1A]">{resource.title}</p>
                        <p className="mt-1 text-xs text-[#6B4E2F]">
                          {resource.type} • Added {formatDateTime(resource.addedAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteResource(resource)}
                        disabled={deletingResourceId === resource.id}
                        className="rounded-md px-2 py-1 text-xs text-[#8A3E22] hover:bg-[#C1603A]/10 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                    {resource.description && (
                      <p className="mt-2 text-xs text-[#6B4E2F]">{resource.description}</p>
                    )}
                    {resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs font-semibold text-[#355031] underline-offset-2 hover:underline"
                      >
                        Open resource
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[1.5rem] border border-[#4A6741]/28 bg-[#F5F0E8] p-6 shadow-[0_16px_32px_rgba(59,42,26,0.09)]">
              <h2 className="text-xl font-semibold text-[#3B2A1A]">Recent Activity</h2>
              <p className="mt-1 text-sm text-[#6B4E2F]">
                Live feed of thesis updates and collaboration events.
              </p>

              <ul className="mt-5 space-y-4">
                {recentActivity.map((item) => (
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
          </div>

          <section
            id="settings"
            className="rounded-[1.5rem] border border-[#C9A87C]/45 bg-[#F5F0E8] p-6 shadow-[0_12px_26px_rgba(59,42,26,0.07)]"
          >
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-[#3B2A1A]">Settings</h2>
              <p className="mt-1 text-sm text-[#6B4E2F]">
                Notification and workflow preferences for your thesis routine.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="grid gap-4 lg:grid-cols-2">
              <label className="inline-flex items-center gap-2 text-sm text-[#3B2A1A]">
                <input
                  type="checkbox"
                  checked={settingsNotifications}
                  onChange={(event) => setSettingsNotifications(event.target.checked)}
                  className="h-4 w-4 rounded border-[#C9A87C]/45 text-[#4A6741]"
                />
                Enable notifications
              </label>

              <label className="text-sm text-[#3B2A1A]">
                Weekly Writing Goal (hours)
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={settingsWeeklyHours}
                  onChange={(event) =>
                    setSettingsWeeklyHours(Number(event.target.value || "1"))
                  }
                  className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                />
              </label>

              <label className="text-sm text-[#3B2A1A]">
                Reminder Time
                <input
                  type="time"
                  value={settingsReminderTime}
                  onChange={(event) => setSettingsReminderTime(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                />
              </label>

              <label className="text-sm text-[#3B2A1A]">
                Preferred View
                <select
                  value={settingsPreferredView}
                  onChange={(event) => setSettingsPreferredView(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                >
                  <option value="Dashboard">Dashboard</option>
                  <option value="Tasks">Tasks</option>
                  <option value="Milestones">Milestones</option>
                </select>
              </label>

              <div className="lg:col-span-2">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="rounded-lg bg-[#4A6741] px-4 py-2 text-sm font-semibold text-[#F5F0E8] disabled:opacity-60"
                >
                  {isSavingSettings ? "Saving..." : "Save Settings"}
                </button>
                <p className="mt-2 text-xs text-[#6B4E2F]">
                  Current server profile: notifications {settings.notificationsEnabled ? "on" : "off"},
                  goal {settings.weeklyWritingGoalHours}h/week, reminder {settings.reminderTime}.
                </p>
              </div>
            </form>
          </section>
        </main>
      </div>

      {anyDialogOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#3B2A1A]/45"
          aria-label="Close dialog overlay"
          onClick={closeAllDialogs}
        />
      )}

      {isAddTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#C9A87C]/45 bg-[#F5F0E8] p-6 shadow-[0_20px_40px_rgba(59,42,26,0.2)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-[#3B2A1A]">Add Task</h3>
                <p className="mt-1 text-sm text-[#6B4E2F]">
                  Create a new thesis task and attach a milestone.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-[#6B4E2F] hover:bg-[#C9A87C]/20"
                onClick={() => setIsAddTaskOpen(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-4">
              <label className="block text-sm font-medium text-[#3B2A1A]">
                Task Title
                <input
                  value={newTaskTitle}
                  onChange={(event) => setNewTaskTitle(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-[#3B2A1A]">
                Description
                <textarea
                  value={newTaskDescription}
                  onChange={(event) => setNewTaskDescription(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-[#3B2A1A]">
                  Due Date
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(event) => setNewTaskDueDate(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-[#3B2A1A]">
                  Category
                  <input
                    value={newTaskCategory}
                    onChange={(event) => setNewTaskCategory(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                  />
                </label>
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#3B2A1A]">
                <input
                  type="checkbox"
                  checked={newTaskPriority}
                  onChange={(event) => setNewTaskPriority(event.target.checked)}
                  className="h-4 w-4 rounded border-[#C9A87C]/45 text-[#4A6741]"
                />
                Mark as priority task
              </label>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddTaskOpen(false)}
                  className="rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-4 py-2 text-sm font-medium text-[#6B4E2F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTask}
                  className="rounded-lg bg-[#4A6741] px-4 py-2 text-sm font-semibold text-[#F5F0E8] disabled:opacity-60"
                >
                  {isCreatingTask ? "Creating..." : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUploadDraftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#C9A87C]/45 bg-[#F5F0E8] p-6 shadow-[0_20px_40px_rgba(59,42,26,0.2)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-[#3B2A1A]">Upload Draft</h3>
                <p className="mt-1 text-sm text-[#6B4E2F]">
                  Log a draft upload in recent activity.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-[#6B4E2F] hover:bg-[#C9A87C]/20"
                onClick={() => setIsUploadDraftOpen(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleDraftUpload} className="space-y-4">
              <label className="block text-sm font-medium text-[#3B2A1A]">
                Select File
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.md"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setDraftFileName(file?.name ?? "");
                  }}
                  className="mt-1 block w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#C9A87C]/25 file:px-3 file:py-1"
                />
              </label>

              <label className="block text-sm font-medium text-[#3B2A1A]">
                File Name
                <input
                  value={draftFileName}
                  onChange={(event) => setDraftFileName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-[#3B2A1A]">
                  Version
                  <input
                    value={draftVersion}
                    onChange={(event) => setDraftVersion(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                  />
                </label>
                <label className="text-sm font-medium text-[#3B2A1A]">
                  Notes
                  <input
                    value={draftNotes}
                    onChange={(event) => setDraftNotes(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUploadDraftOpen(false)}
                  className="rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-4 py-2 text-sm font-medium text-[#6B4E2F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingDraft}
                  className="rounded-lg bg-[#C1603A] px-4 py-2 text-sm font-semibold text-[#F5F0E8] disabled:opacity-60"
                >
                  {isUploadingDraft ? "Uploading..." : "Upload Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditThesisOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[#C9A87C]/45 bg-[#F5F0E8] p-6 shadow-[0_20px_40px_rgba(59,42,26,0.2)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-[#3B2A1A]">Edit Thesis</h3>
                <p className="mt-1 text-sm text-[#6B4E2F]">
                  Update metadata and chapter completion values.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-[#6B4E2F] hover:bg-[#C9A87C]/20"
                onClick={() => setIsEditThesisOpen(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveThesis} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-[#3B2A1A] sm:col-span-2">
                  Thesis Title
                  <input
                    value={thesisTitle}
                    onChange={(event) => setThesisTitle(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-[#3B2A1A]">
                  Student
                  <input
                    value={thesisStudentName}
                    onChange={(event) => setThesisStudentName(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-[#3B2A1A]">
                  Supervisor
                  <input
                    value={thesisSupervisorName}
                    onChange={(event) => setThesisSupervisorName(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-[#3B2A1A]">
                  Estimated Completion Date
                  <input
                    type="date"
                    value={thesisCompletionDate}
                    onChange={(event) => setThesisCompletionDate(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                    required
                  />
                </label>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-[#3B2A1A]">Chapter Progress</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {chapterProgressDraft.map((chapter, index) => (
                    <label key={chapter.name} className="text-xs text-[#6B4E2F]">
                      {chapter.name}
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={chapter.completionPercent}
                        onChange={(event) => {
                          const value = Number(event.target.value || "0");
                          setChapterProgressDraft((previous) => {
                            const updated = [...previous];
                            updated[index] = {
                              ...updated[index],
                              completionPercent: Math.max(0, Math.min(100, value)),
                            };
                            return updated;
                          });
                        }}
                        className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm text-[#3B2A1A] outline-none focus:border-[#4A6741]"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditThesisOpen(false)}
                  className="rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-4 py-2 text-sm font-medium text-[#6B4E2F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingThesis}
                  className="rounded-lg bg-[#4A6741] px-4 py-2 text-sm font-semibold text-[#F5F0E8] disabled:opacity-60"
                >
                  {isSavingThesis ? "Saving..." : "Save Thesis"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddMilestoneOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#C9A87C]/45 bg-[#F5F0E8] p-6 shadow-[0_20px_40px_rgba(59,42,26,0.2)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-[#3B2A1A]">Add Milestone</h3>
                <p className="mt-1 text-sm text-[#6B4E2F]">Create a new milestone.</p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-[#6B4E2F] hover:bg-[#C9A87C]/20"
                onClick={() => setIsAddMilestoneOpen(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-4">
              <label className="block text-sm font-medium text-[#3B2A1A]">
                Milestone Title
                <input
                  value={newMilestoneTitle}
                  onChange={(event) => setNewMilestoneTitle(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-[#3B2A1A]">
                  Date
                  <input
                    type="date"
                    value={newMilestoneDate}
                    onChange={(event) => setNewMilestoneDate(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-[#3B2A1A]">
                  Urgency
                  <select
                    value={newMilestoneUrgency}
                    onChange={(event) =>
                      setNewMilestoneUrgency(
                        event.target.value as "high" | "medium" | "low"
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                  >
                    <option value="high">high</option>
                    <option value="medium">medium</option>
                    <option value="low">low</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddMilestoneOpen(false)}
                  className="rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-4 py-2 text-sm font-medium text-[#6B4E2F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingMilestone}
                  className="rounded-lg bg-[#4A6741] px-4 py-2 text-sm font-semibold text-[#F5F0E8] disabled:opacity-60"
                >
                  {isAddingMilestone ? "Adding..." : "Add Milestone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddNoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#C9A87C]/45 bg-[#F5F0E8] p-6 shadow-[0_20px_40px_rgba(59,42,26,0.2)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-[#3B2A1A]">Add Supervisor Note</h3>
                <p className="mt-1 text-sm text-[#6B4E2F]">Log advisor feedback.</p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-[#6B4E2F] hover:bg-[#C9A87C]/20"
                onClick={() => setIsAddNoteOpen(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddNote} className="space-y-4">
              <label className="block text-sm font-medium text-[#3B2A1A]">
                Message
                <textarea
                  value={newNoteMessage}
                  onChange={(event) => setNewNoteMessage(event.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-[#3B2A1A]">
                Author
                <input
                  value={newNoteAuthor}
                  onChange={(event) => setNewNoteAuthor(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-[#3B2A1A]">
                <input
                  type="checkbox"
                  checked={newNotePinned}
                  onChange={(event) => setNewNotePinned(event.target.checked)}
                  className="h-4 w-4 rounded border-[#C9A87C]/45 text-[#4A6741]"
                />
                Pin this note
              </label>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddNoteOpen(false)}
                  className="rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-4 py-2 text-sm font-medium text-[#6B4E2F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingNote}
                  className="rounded-lg bg-[#4A6741] px-4 py-2 text-sm font-semibold text-[#F5F0E8] disabled:opacity-60"
                >
                  {isAddingNote ? "Adding..." : "Add Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddResourceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#C9A87C]/45 bg-[#F5F0E8] p-6 shadow-[0_20px_40px_rgba(59,42,26,0.2)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-[#3B2A1A]">Add Resource</h3>
                <p className="mt-1 text-sm text-[#6B4E2F]">
                  Save links, templates, or references.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-[#6B4E2F] hover:bg-[#C9A87C]/20"
                onClick={() => setIsAddResourceOpen(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddResource} className="space-y-4">
              <label className="block text-sm font-medium text-[#3B2A1A]">
                Title
                <input
                  value={newResourceTitle}
                  onChange={(event) => setNewResourceTitle(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-[#3B2A1A]">
                  Type
                  <input
                    value={newResourceType}
                    onChange={(event) => setNewResourceType(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                  />
                </label>
                <label className="text-sm font-medium text-[#3B2A1A]">
                  URL
                  <input
                    value={newResourceUrl}
                    onChange={(event) => setNewResourceUrl(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-[#3B2A1A]">
                Description
                <textarea
                  rows={3}
                  value={newResourceDescription}
                  onChange={(event) => setNewResourceDescription(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-3 py-2 text-sm outline-none focus:border-[#4A6741]"
                />
              </label>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddResourceOpen(false)}
                  className="rounded-lg border border-[#C9A87C]/45 bg-[#F5F0E8] px-4 py-2 text-sm font-medium text-[#6B4E2F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingResource}
                  className="rounded-lg bg-[#4A6741] px-4 py-2 text-sm font-semibold text-[#F5F0E8] disabled:opacity-60"
                >
                  {isAddingResource ? "Adding..." : "Add Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
