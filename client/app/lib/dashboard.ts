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

export type ActivityItem = {
  id: string;
  type: "edit" | "comment" | "upload";
  message: string;
  timestamp: string;
  author: string;
};

export type DeadlineItem = {
  id: string;
  title: string;
  date: string;
  urgency: "high" | "medium" | "low";
};

export type TaskItem = {
  id: string;
  title: string;
  status: "Not Started" | "In Progress" | "Blocked" | "Done";
  dueDate: string;
  isPriority: boolean;
  category: string;
};

export type DashboardData = {
  thesis: ThesisMetadata;
  recentActivity: ActivityItem[];
  upcomingDeadlines: DeadlineItem[];
  tasks: TaskItem[];
};

const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:5199";

const mockDashboardData: DashboardData = {
  thesis: {
    title: "Adaptive Decision Support for Sustainable Construction Planning",
    studentName: "Havard Vestbo",
    supervisorName: "Dr. Ingrid Solheim",
    estimatedCompletionDate: "2026-12-18",
    overallCompletionPercent: 57,
    chapterProgress: [
      { name: "Introduction", completionPercent: 92 },
      { name: "Literature Review", completionPercent: 74 },
      { name: "Methodology", completionPercent: 81 },
      { name: "Results", completionPercent: 48 },
      { name: "Discussion", completionPercent: 31 },
      { name: "Conclusion", completionPercent: 18 },
    ],
  },
  recentActivity: [
    {
      id: "e0b6cc2a-fe33-4b4b-9f18-3552f2f665a6",
      type: "edit",
      message:
        "Revised Methodology section and clarified the data collection protocol.",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      author: "Havard Vestbo",
    },
    {
      id: "40e73792-ef66-4a66-8f80-47f264f19475",
      type: "comment",
      message:
        "Supervisor comment: tighten the framing around sustainability KPIs.",
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      author: "Dr. Ingrid Solheim",
    },
    {
      id: "79d4f315-13bf-46fa-882a-49d9bf6f69fe",
      type: "upload",
      message: "Uploaded Draft v0.6 for internal review.",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      author: "Havard Vestbo",
    },
  ],
  upcomingDeadlines: [
    {
      id: "4dbaf31d-03b2-4ffa-ab69-113f0e206df3",
      title: "Submit Results chapter draft",
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      urgency: "high",
    },
    {
      id: "9fce8b91-c03f-423b-bf88-b958167e8e44",
      title: "Supervisor meeting and feedback review",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      urgency: "medium",
    },
    {
      id: "9ec0a149-2e2d-4c36-b676-a08e6e5970ff",
      title: "Finalize reference library formatting",
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      urgency: "low",
    },
  ],
  tasks: [
    {
      id: "ac50945f-f0f5-4f04-b6b8-f6f8e7f0a2a8",
      title: "Refine mixed-methods rationale paragraph",
      status: "In Progress",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      isPriority: true,
      category: "Writing",
    },
    {
      id: "f1b77311-06ab-4538-96ea-f92864496cb9",
      title: "Tag interview transcripts for thematic coding",
      status: "Not Started",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      isPriority: false,
      category: "Analysis",
    },
    {
      id: "ea0aaeb4-d713-4fcb-9c73-a7a99f6765f5",
      title: "Address supervisor notes on literature matrix",
      status: "Done",
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      isPriority: false,
      category: "Review",
    },
    {
      id: "3556fef9-afb2-412d-b2ff-4b95699b2322",
      title: "Prepare visual template for Results figures",
      status: "Blocked",
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      isPriority: true,
      category: "Design",
    },
  ],
};

async function fetchApi<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as T;
    return payload;
  } catch {
    return null;
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const [dashboard, thesis, tasks] = await Promise.all([
    fetchApi<DashboardData>("/api/thesis/dashboard"),
    fetchApi<ThesisMetadata>("/api/thesis/metadata"),
    fetchApi<TaskItem[]>("/api/thesis/tasks"),
  ]);

  return {
    thesis: thesis ?? dashboard?.thesis ?? mockDashboardData.thesis,
    tasks: tasks ?? dashboard?.tasks ?? mockDashboardData.tasks,
    recentActivity: dashboard?.recentActivity ?? mockDashboardData.recentActivity,
    upcomingDeadlines:
      dashboard?.upcomingDeadlines ?? mockDashboardData.upcomingDeadlines,
  };
}
