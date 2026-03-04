var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

var chapterProgress = new[]
{
    new ChapterProgressDto("Introduction", 92),
    new ChapterProgressDto("Literature Review", 74),
    new ChapterProgressDto("Methodology", 81),
    new ChapterProgressDto("Results", 48),
    new ChapterProgressDto("Discussion", 31),
    new ChapterProgressDto("Conclusion", 18),
};

var thesisMetadata = new ThesisMetadataDto(
    "Adaptive Decision Support for Sustainable Construction Planning",
    "Havard Vestbo",
    "Dr. Ingrid Solheim",
    new DateOnly(2026, 12, 18),
    (int)Math.Round(chapterProgress.Average(chapter => chapter.CompletionPercent)),
    chapterProgress
);

var recentActivity = new[]
{
    new ActivityItemDto(
        Guid.Parse("e0b6cc2a-fe33-4b4b-9f18-3552f2f665a6"),
        "edit",
        "Revised Methodology section and clarified the data collection protocol.",
        DateTimeOffset.UtcNow.AddHours(-2),
        "Havard Vestbo"
    ),
    new ActivityItemDto(
        Guid.Parse("40e73792-ef66-4a66-8f80-47f264f19475"),
        "comment",
        "Supervisor comment: tighten the framing around sustainability KPIs.",
        DateTimeOffset.UtcNow.AddHours(-8),
        "Dr. Ingrid Solheim"
    ),
    new ActivityItemDto(
        Guid.Parse("79d4f315-13bf-46fa-882a-49d9bf6f69fe"),
        "upload",
        "Uploaded Draft v0.6 for internal review.",
        DateTimeOffset.UtcNow.AddDays(-1),
        "Havard Vestbo"
    ),
};

var upcomingDeadlines = new[]
{
    new DeadlineItemDto(
        Guid.Parse("4dbaf31d-03b2-4ffa-ab69-113f0e206df3"),
        "Submit Results chapter draft",
        DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3)),
        "high"
    ),
    new DeadlineItemDto(
        Guid.Parse("9fce8b91-c03f-423b-bf88-b958167e8e44"),
        "Supervisor meeting and feedback review",
        DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
        "medium"
    ),
    new DeadlineItemDto(
        Guid.Parse("9ec0a149-2e2d-4c36-b676-a08e6e5970ff"),
        "Finalize reference library formatting",
        DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
        "low"
    ),
};

var tasks = new[]
{
    new TaskItemDto(
        Guid.Parse("ac50945f-f0f5-4f04-b6b8-f6f8e7f0a2a8"),
        "Refine mixed-methods rationale paragraph",
        "In Progress",
        DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2)),
        true,
        "Writing"
    ),
    new TaskItemDto(
        Guid.Parse("f1b77311-06ab-4538-96ea-f92864496cb9"),
        "Tag interview transcripts for thematic coding",
        "Not Started",
        DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)),
        false,
        "Analysis"
    ),
    new TaskItemDto(
        Guid.Parse("ea0aaeb4-d713-4fcb-9c73-a7a99f6765f5"),
        "Address supervisor notes on literature matrix",
        "Done",
        DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)),
        false,
        "Review"
    ),
    new TaskItemDto(
        Guid.Parse("3556fef9-afb2-412d-b2ff-4b95699b2322"),
        "Prepare visual template for Results figures",
        "Blocked",
        DateOnly.FromDateTime(DateTime.UtcNow.AddDays(4)),
        true,
        "Design"
    ),
};

app.MapGet("/api/thesis/dashboard", () =>
    new DashboardDto(thesisMetadata, recentActivity, upcomingDeadlines, tasks)
)
.WithName("GetThesisDashboard");

app.MapGet("/api/thesis/metadata", () => thesisMetadata)
.WithName("GetThesisMetadata");

app.MapGet("/api/thesis/tasks", () => tasks)
.WithName("GetThesisTasks");

app.Run();

record DashboardDto(
    ThesisMetadataDto Thesis,
    ActivityItemDto[] RecentActivity,
    DeadlineItemDto[] UpcomingDeadlines,
    TaskItemDto[] Tasks
);

record ThesisMetadataDto(
    string Title,
    string StudentName,
    string SupervisorName,
    DateOnly EstimatedCompletionDate,
    int OverallCompletionPercent,
    ChapterProgressDto[] ChapterProgress
);

record ChapterProgressDto(string Name, int CompletionPercent);

record ActivityItemDto(
    Guid Id,
    string Type,
    string Message,
    DateTimeOffset Timestamp,
    string Author
);

record DeadlineItemDto(
    Guid Id,
    string Title,
    DateOnly Date,
    string Urgency
);

record TaskItemDto(
    Guid Id,
    string Title,
    string Status,
    DateOnly DueDate,
    bool IsPriority,
    string Category
);
