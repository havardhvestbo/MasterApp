export type ChapterProgress = {
  name: string;
  completionPercent: number;
};

export type ThesisMetadata = {
  title: string;
  studentName: string;
  supervisorName: string;
  estimatedCompletionDate: string;
  overallCompletionPercent: number;
  chapterProgress: ChapterProgress[];
};

export type TaskStatus = "Not Started" | "In Progress" | "Blocked" | "Done";

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string;
  isPriority: boolean;
  category: string;
};

export type MilestoneStatus = "Planned" | "Done";

export type MilestoneItem = {
  id: string;
  title: string;
  date: string;
  urgency: "high" | "medium" | "low";
  status: MilestoneStatus;
  taskId: string | null;
};

export type ActivityType = "edit" | "comment" | "upload";

export type ActivityItem = {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: string;
  author: string;
};

export type SupervisorNote = {
  id: string;
  message: string;
  timestamp: string;
  author: string;
  isPinned: boolean;
};

export type ResourceItem = {
  id: string;
  title: string;
  type: string;
  url: string;
  description: string;
  addedAt: string;
};

export type AppSettings = {
  notificationsEnabled: boolean;
  weeklyWritingGoalHours: number;
  reminderTime: string;
  preferredView: string;
};

export type DashboardData = {
  thesis: ThesisMetadata;
  tasks: TaskItem[];
  milestones: MilestoneItem[];
  recentActivity: ActivityItem[];
  supervisorNotes: SupervisorNote[];
  resources: ResourceItem[];
  settings: AppSettings;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  dueDate?: string;
  category?: string;
  isPriority?: boolean;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string;
  dueDate?: string;
  category?: string;
  isPriority?: boolean;
};

export type TaskMutationResponse = {
  task: TaskItem;
  activity: ActivityItem;
  milestone: MilestoneItem | null;
};

export type UploadDraftInput = {
  fileName: string;
  version?: string;
  notes?: string;
};

export type DraftUploadResponse = {
  activity: ActivityItem;
};

export type CreateMilestoneInput = {
  title: string;
  date?: string;
  urgency?: "high" | "medium" | "low";
  status?: MilestoneStatus;
};

export type UpdateMilestoneInput = {
  title?: string;
  date?: string;
  urgency?: "high" | "medium" | "low";
  status?: MilestoneStatus;
};

export type CreateSupervisorNoteInput = {
  message: string;
  author?: string;
  isPinned?: boolean;
};

export type CreateResourceInput = {
  title: string;
  type?: string;
  url?: string;
  description?: string;
};

export type UpdateSettingsInput = {
  notificationsEnabled?: boolean;
  weeklyWritingGoalHours?: number;
  reminderTime?: string;
  preferredView?: string;
};

export type UpdateThesisInput = {
  title?: string;
  studentName?: string;
  supervisorName?: string;
  estimatedCompletionDate?: string;
  chapterProgress?: ChapterProgress[];
};

export type MetadataMutationResponse = {
  thesis: ThesisMetadata;
  activity: ActivityItem;
};

type ApiErrorPayload = {
  error?: string;
};

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

const SERVER_API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:5199";

function getBrowserApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5199";
}

async function readApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (payload.error) {
      return payload.error;
    }
  } catch {
    // Ignore parse errors and fallback below.
  }

  return `Request failed with status ${response.status}.`;
}

async function fetchApi<T>(
  path: string,
  options?: RequestInit,
  baseUrl = SERVER_API_BASE_URL
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiRequestError(
      "Could not reach the backend API. Start the server and try again."
    );
  }

  if (!response.ok) {
    throw new ApiRequestError(await readApiError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function getDashboardData(): Promise<DashboardData> {
  return fetchApi<DashboardData>("/api/thesis/dashboard");
}

export async function updateThesisMetadata(
  input: UpdateThesisInput
): Promise<MetadataMutationResponse> {
  return fetchApi<MetadataMutationResponse>(
    "/api/thesis/metadata",
    {
      method: "PATCH",
      body: JSON.stringify({
        title: input.title ?? null,
        studentName: input.studentName ?? null,
        supervisorName: input.supervisorName ?? null,
        estimatedCompletionDate: input.estimatedCompletionDate ?? null,
        chapterProgress: input.chapterProgress ?? null,
      }),
    },
    getBrowserApiBaseUrl()
  );
}

export async function createTask(input: CreateTaskInput): Promise<TaskMutationResponse> {
  return fetchApi<TaskMutationResponse>(
    "/api/thesis/tasks",
    {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        description: input.description || null,
        dueDate: input.dueDate || null,
        category: input.category || null,
        isPriority: input.isPriority ?? false,
      }),
    },
    getBrowserApiBaseUrl()
  );
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskInput
): Promise<TaskMutationResponse> {
  return fetchApi<TaskMutationResponse>(
    `/api/thesis/tasks/${taskId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        title: input.title ?? null,
        description: input.description ?? null,
        dueDate: input.dueDate ?? null,
        category: input.category ?? null,
        isPriority: input.isPriority ?? null,
      }),
    },
    getBrowserApiBaseUrl()
  );
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<TaskMutationResponse> {
  return fetchApi<TaskMutationResponse>(
    `/api/thesis/tasks/${taskId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
    getBrowserApiBaseUrl()
  );
}

export async function deleteTask(taskId: string): Promise<void> {
  await fetchApi<void>(
    `/api/thesis/tasks/${taskId}`,
    { method: "DELETE" },
    getBrowserApiBaseUrl()
  );
}

export async function uploadDraft(input: UploadDraftInput): Promise<DraftUploadResponse> {
  return fetchApi<DraftUploadResponse>(
    "/api/thesis/drafts",
    {
      method: "POST",
      body: JSON.stringify({
        fileName: input.fileName,
        version: input.version || null,
        notes: input.notes || null,
      }),
    },
    getBrowserApiBaseUrl()
  );
}

export async function createMilestone(
  input: CreateMilestoneInput
): Promise<MilestoneItem> {
  return fetchApi<MilestoneItem>(
    "/api/thesis/milestones",
    {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        date: input.date || null,
        urgency: input.urgency || null,
        status: input.status || null,
      }),
    },
    getBrowserApiBaseUrl()
  );
}

export async function updateMilestone(
  milestoneId: string,
  input: UpdateMilestoneInput
): Promise<MilestoneItem> {
  return fetchApi<MilestoneItem>(
    `/api/thesis/milestones/${milestoneId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        title: input.title ?? null,
        date: input.date ?? null,
        urgency: input.urgency ?? null,
        status: input.status ?? null,
      }),
    },
    getBrowserApiBaseUrl()
  );
}

export async function deleteMilestone(milestoneId: string): Promise<void> {
  await fetchApi<void>(
    `/api/thesis/milestones/${milestoneId}`,
    { method: "DELETE" },
    getBrowserApiBaseUrl()
  );
}

export async function createSupervisorNote(
  input: CreateSupervisorNoteInput
): Promise<SupervisorNote> {
  return fetchApi<SupervisorNote>(
    "/api/thesis/supervisor/notes",
    {
      method: "POST",
      body: JSON.stringify({
        message: input.message,
        author: input.author || null,
        isPinned: input.isPinned ?? false,
      }),
    },
    getBrowserApiBaseUrl()
  );
}

export async function deleteSupervisorNote(noteId: string): Promise<void> {
  await fetchApi<void>(
    `/api/thesis/supervisor/notes/${noteId}`,
    { method: "DELETE" },
    getBrowserApiBaseUrl()
  );
}

export async function createResource(input: CreateResourceInput): Promise<ResourceItem> {
  return fetchApi<ResourceItem>(
    "/api/thesis/resources",
    {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        type: input.type || null,
        url: input.url || null,
        description: input.description || null,
      }),
    },
    getBrowserApiBaseUrl()
  );
}

export async function deleteResource(resourceId: string): Promise<void> {
  await fetchApi<void>(
    `/api/thesis/resources/${resourceId}`,
    { method: "DELETE" },
    getBrowserApiBaseUrl()
  );
}

export async function updateSettings(input: UpdateSettingsInput): Promise<AppSettings> {
  return fetchApi<AppSettings>(
    "/api/thesis/settings",
    {
      method: "PATCH",
      body: JSON.stringify({
        notificationsEnabled: input.notificationsEnabled ?? null,
        weeklyWritingGoalHours: input.weeklyWritingGoalHours ?? null,
        reminderTime: input.reminderTime ?? null,
        preferredView: input.preferredView ?? null,
      }),
    },
    getBrowserApiBaseUrl()
  );
}
