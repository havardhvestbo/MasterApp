using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy
                .AllowAnyOrigin()
                .AllowAnyMethod()
                .AllowAnyHeader();
            return;
        }

        policy
            .WithOrigins("http://localhost:3000", "https://localhost:3000")
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors();

var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web)
{
    WriteIndented = true,
};

var dataDirectory = Path.Combine(app.Environment.ContentRootPath, "data");
Directory.CreateDirectory(dataDirectory);
var stateFilePath = Path.Combine(dataDirectory, "app-state.json");

var state = LoadOrCreateState(stateFilePath, jsonOptions);
var stateLock = new object();

app.MapGet("/api/thesis/dashboard", () =>
{
    lock (stateLock)
    {
        return BuildDashboardDto(state);
    }
})
.WithName("GetThesisDashboard");

app.MapGet("/api/thesis/metadata", () =>
{
    lock (stateLock)
    {
        return BuildComputedMetadata(state);
    }
})
.WithName("GetThesisMetadata");

app.MapPatch("/api/thesis/metadata", (UpdateThesisRequest request) =>
{
    lock (stateLock)
    {
        var updated = state.Thesis;

        if (!string.IsNullOrWhiteSpace(request.Title))
        {
            updated = updated with { Title = request.Title.Trim() };
        }

        if (!string.IsNullOrWhiteSpace(request.StudentName))
        {
            updated = updated with { StudentName = request.StudentName.Trim() };
        }

        if (!string.IsNullOrWhiteSpace(request.SupervisorName))
        {
            updated = updated with { SupervisorName = request.SupervisorName.Trim() };
        }

        if (request.EstimatedCompletionDate.HasValue)
        {
            updated = updated with { EstimatedCompletionDate = request.EstimatedCompletionDate.Value };
        }

        if (request.ChapterProgress is { Length: > 0 })
        {
            var chapters = request.ChapterProgress
                .Where(chapter => !string.IsNullOrWhiteSpace(chapter.Name))
                .Select(chapter => new ChapterProgressDto(
                    chapter.Name.Trim(),
                    Math.Clamp(chapter.CompletionPercent, 0, 100)
                ))
                .ToArray();

            if (chapters.Length > 0)
            {
                updated = updated with { ChapterProgress = chapters };
            }
        }

        state.Thesis = updated;
        var activity = AddActivity(state, "edit", "Updated thesis metadata.", "Havard Vestbo");
        PersistState(stateFilePath, state, jsonOptions);

        return Results.Ok(new MetadataMutationResponse(BuildComputedMetadata(state), activity));
    }
})
.WithName("UpdateThesisMetadata");

app.MapGet("/api/thesis/tasks", () =>
{
    lock (stateLock)
    {
        return state.Tasks
            .OrderBy(task => task.DueDate)
            .ToArray();
    }
})
.WithName("GetThesisTasks");

app.MapPost("/api/thesis/tasks", (CreateTaskRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new ErrorResponse("Task title is required."));
    }

    lock (stateLock)
    {
        var task = new TaskItemDto(
            Guid.NewGuid(),
            request.Title.Trim(),
            request.Description?.Trim() ?? string.Empty,
            "Not Started",
            request.DueDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            request.IsPriority ?? false,
            string.IsNullOrWhiteSpace(request.Category) ? "General" : request.Category.Trim()
        );

        state.Tasks.Add(task);

        var milestone = new MilestoneItemDto(
            Guid.NewGuid(),
            task.Title,
            task.DueDate,
            GetUrgency(task.DueDate),
            "Planned",
            task.Id
        );
        state.Milestones.Add(milestone);

        var activity = AddActivity(state, "edit", $"Added task \"{task.Title}\".", "Havard Vestbo");

        PersistState(stateFilePath, state, jsonOptions);

        return Results.Created(
            $"/api/thesis/tasks/{task.Id}",
            new TaskMutationResponse(task, activity, milestone)
        );
    }
})
.WithName("CreateThesisTask");

app.MapPatch("/api/thesis/tasks/{taskId:guid}", (Guid taskId, UpdateTaskRequest request) =>
{
    lock (stateLock)
    {
        var taskIndex = state.Tasks.FindIndex(task => task.Id == taskId);
        if (taskIndex < 0)
        {
            return Results.NotFound(new ErrorResponse("Task not found."));
        }

        var current = state.Tasks[taskIndex];
        var updated = current with
        {
            Title = string.IsNullOrWhiteSpace(request.Title) ? current.Title : request.Title.Trim(),
            Description = request.Description?.Trim() ?? current.Description,
            DueDate = request.DueDate ?? current.DueDate,
            Category = string.IsNullOrWhiteSpace(request.Category) ? current.Category : request.Category.Trim(),
            IsPriority = request.IsPriority ?? current.IsPriority,
        };

        state.Tasks[taskIndex] = updated;

        var milestoneIndex = state.Milestones.FindIndex(milestone => milestone.TaskId == updated.Id);
        MilestoneItemDto? milestone = null;
        if (milestoneIndex >= 0)
        {
            milestone = state.Milestones[milestoneIndex] with
            {
                Title = updated.Title,
                Date = updated.DueDate,
                Urgency = GetUrgency(updated.DueDate),
            };
            state.Milestones[milestoneIndex] = milestone;
        }

        var activity = AddActivity(state, "edit", $"Updated task \"{updated.Title}\" details.", "Havard Vestbo");
        PersistState(stateFilePath, state, jsonOptions);

        return Results.Ok(new TaskMutationResponse(updated, activity, milestone));
    }
})
.WithName("UpdateThesisTask");

app.MapPatch("/api/thesis/tasks/{taskId:guid}/status", (Guid taskId, UpdateTaskStatusRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Status))
    {
        return Results.BadRequest(new ErrorResponse("Task status is required."));
    }

    var normalizedStatus = NormalizeTaskStatus(request.Status);
    if (normalizedStatus is null)
    {
        return Results.BadRequest(
            new ErrorResponse("Status must be one of: Not Started, In Progress, Blocked, Done.")
        );
    }

    lock (stateLock)
    {
        var taskIndex = state.Tasks.FindIndex(task => task.Id == taskId);
        if (taskIndex < 0)
        {
            return Results.NotFound(new ErrorResponse("Task not found."));
        }

        var currentTask = state.Tasks[taskIndex];
        var updatedTask = currentTask with { Status = normalizedStatus };
        state.Tasks[taskIndex] = updatedTask;

        var milestoneIndex = state.Milestones.FindIndex(milestone => milestone.TaskId == updatedTask.Id);
        MilestoneItemDto? milestone = null;

        if (milestoneIndex >= 0)
        {
            milestone = state.Milestones[milestoneIndex] with
            {
                Title = updatedTask.Title,
                Date = updatedTask.DueDate,
                Urgency = GetUrgency(updatedTask.DueDate),
                Status = normalizedStatus == "Done" ? "Done" : "Planned",
            };
            state.Milestones[milestoneIndex] = milestone;
        }
        else
        {
            milestone = new MilestoneItemDto(
                Guid.NewGuid(),
                updatedTask.Title,
                updatedTask.DueDate,
                GetUrgency(updatedTask.DueDate),
                normalizedStatus == "Done" ? "Done" : "Planned",
                updatedTask.Id
            );
            state.Milestones.Add(milestone);
        }

        var activity = AddActivity(
            state,
            "edit",
            $"Updated task \"{updatedTask.Title}\" to {updatedTask.Status}.",
            "Havard Vestbo"
        );

        PersistState(stateFilePath, state, jsonOptions);

        return Results.Ok(new TaskMutationResponse(updatedTask, activity, milestone));
    }
})
.WithName("UpdateThesisTaskStatus");

app.MapDelete("/api/thesis/tasks/{taskId:guid}", (Guid taskId) =>
{
    lock (stateLock)
    {
        var task = state.Tasks.FirstOrDefault(item => item.Id == taskId);
        if (task is null)
        {
            return Results.NotFound(new ErrorResponse("Task not found."));
        }

        state.Tasks.RemoveAll(item => item.Id == taskId);
        state.Milestones.RemoveAll(item => item.TaskId == taskId);

        AddActivity(state, "edit", $"Deleted task \"{task.Title}\".", "Havard Vestbo");
        PersistState(stateFilePath, state, jsonOptions);

        return Results.NoContent();
    }
})
.WithName("DeleteThesisTask");

app.MapPost("/api/thesis/drafts", (UploadDraftRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.FileName))
    {
        return Results.BadRequest(new ErrorResponse("A file name is required."));
    }

    lock (stateLock)
    {
        var version = string.IsNullOrWhiteSpace(request.Version) ? "unspecified" : request.Version.Trim();
        var notes = string.IsNullOrWhiteSpace(request.Notes) ? string.Empty : $" Notes: {request.Notes.Trim()}";

        var activity = AddActivity(
            state,
            "upload",
            $"Uploaded draft {request.FileName.Trim()} (v{version}).{notes}",
            "Havard Vestbo"
        );

        PersistState(stateFilePath, state, jsonOptions);

        return Results.Created(
            $"/api/thesis/activity/{activity.Id}",
            new DraftUploadResponse(activity)
        );
    }
})
.WithName("UploadThesisDraft");

app.MapGet("/api/thesis/milestones", () =>
{
    lock (stateLock)
    {
        return state.Milestones
            .OrderBy(item => item.Date)
            .ThenBy(item => item.Title)
            .ToArray();
    }
})
.WithName("GetThesisMilestones");

app.MapPost("/api/thesis/milestones", (CreateMilestoneRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new ErrorResponse("Milestone title is required."));
    }

    lock (stateLock)
    {
        var milestone = new MilestoneItemDto(
            Guid.NewGuid(),
            request.Title.Trim(),
            request.Date ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)),
            NormalizeUrgency(request.Urgency),
            NormalizeMilestoneStatus(request.Status),
            null
        );

        state.Milestones.Add(milestone);
        AddActivity(state, "edit", $"Added milestone \"{milestone.Title}\".", "Havard Vestbo");
        PersistState(stateFilePath, state, jsonOptions);

        return Results.Created($"/api/thesis/milestones/{milestone.Id}", milestone);
    }
})
.WithName("CreateThesisMilestone");

app.MapPatch("/api/thesis/milestones/{milestoneId:guid}", (Guid milestoneId, UpdateMilestoneRequest request) =>
{
    lock (stateLock)
    {
        var index = state.Milestones.FindIndex(item => item.Id == milestoneId);
        if (index < 0)
        {
            return Results.NotFound(new ErrorResponse("Milestone not found."));
        }

        var current = state.Milestones[index];
        var updated = current with
        {
            Title = string.IsNullOrWhiteSpace(request.Title) ? current.Title : request.Title.Trim(),
            Date = request.Date ?? current.Date,
            Urgency = request.Urgency is null ? current.Urgency : NormalizeUrgency(request.Urgency),
            Status = request.Status is null ? current.Status : NormalizeMilestoneStatus(request.Status),
        };

        state.Milestones[index] = updated;
        AddActivity(state, "edit", $"Updated milestone \"{updated.Title}\".", "Havard Vestbo");
        PersistState(stateFilePath, state, jsonOptions);

        return Results.Ok(updated);
    }
})
.WithName("UpdateThesisMilestone");

app.MapDelete("/api/thesis/milestones/{milestoneId:guid}", (Guid milestoneId) =>
{
    lock (stateLock)
    {
        var milestone = state.Milestones.FirstOrDefault(item => item.Id == milestoneId);
        if (milestone is null)
        {
            return Results.NotFound(new ErrorResponse("Milestone not found."));
        }

        state.Milestones.RemoveAll(item => item.Id == milestoneId);
        AddActivity(state, "edit", $"Deleted milestone \"{milestone.Title}\".", "Havard Vestbo");
        PersistState(stateFilePath, state, jsonOptions);

        return Results.NoContent();
    }
})
.WithName("DeleteThesisMilestone");

app.MapGet("/api/thesis/supervisor/notes", () =>
{
    lock (stateLock)
    {
        return state.SupervisorNotes
            .OrderByDescending(note => note.IsPinned)
            .ThenByDescending(note => note.Timestamp)
            .ToArray();
    }
})
.WithName("GetSupervisorNotes");

app.MapPost("/api/thesis/supervisor/notes", (CreateSupervisorNoteRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Message))
    {
        return Results.BadRequest(new ErrorResponse("Note message is required."));
    }

    lock (stateLock)
    {
        var note = new SupervisorNoteDto(
            Guid.NewGuid(),
            request.Message.Trim(),
            DateTimeOffset.UtcNow,
            string.IsNullOrWhiteSpace(request.Author) ? "Dr. Ingrid Solheim" : request.Author.Trim(),
            request.IsPinned ?? false
        );

        state.SupervisorNotes.Add(note);
        AddActivity(state, "comment", $"Supervisor note: {note.Message}", note.Author);
        PersistState(stateFilePath, state, jsonOptions);

        return Results.Created($"/api/thesis/supervisor/notes/{note.Id}", note);
    }
})
.WithName("CreateSupervisorNote");

app.MapDelete("/api/thesis/supervisor/notes/{noteId:guid}", (Guid noteId) =>
{
    lock (stateLock)
    {
        var note = state.SupervisorNotes.FirstOrDefault(item => item.Id == noteId);
        if (note is null)
        {
            return Results.NotFound(new ErrorResponse("Supervisor note not found."));
        }

        state.SupervisorNotes.RemoveAll(item => item.Id == noteId);
        AddActivity(state, "edit", "Removed a supervisor note.", "Havard Vestbo");
        PersistState(stateFilePath, state, jsonOptions);

        return Results.NoContent();
    }
})
.WithName("DeleteSupervisorNote");

app.MapGet("/api/thesis/resources", () =>
{
    lock (stateLock)
    {
        return state.Resources
            .OrderByDescending(resource => resource.AddedAt)
            .ToArray();
    }
})
.WithName("GetResources");

app.MapPost("/api/thesis/resources", (CreateResourceRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new ErrorResponse("Resource title is required."));
    }

    lock (stateLock)
    {
        var resource = new ResourceItemDto(
            Guid.NewGuid(),
            request.Title.Trim(),
            string.IsNullOrWhiteSpace(request.Type) ? "Article" : request.Type.Trim(),
            request.Url?.Trim() ?? string.Empty,
            request.Description?.Trim() ?? string.Empty,
            DateTimeOffset.UtcNow
        );

        state.Resources.Add(resource);
        AddActivity(state, "edit", $"Added resource \"{resource.Title}\".", "Havard Vestbo");
        PersistState(stateFilePath, state, jsonOptions);

        return Results.Created($"/api/thesis/resources/{resource.Id}", resource);
    }
})
.WithName("CreateResource");

app.MapDelete("/api/thesis/resources/{resourceId:guid}", (Guid resourceId) =>
{
    lock (stateLock)
    {
        var resource = state.Resources.FirstOrDefault(item => item.Id == resourceId);
        if (resource is null)
        {
            return Results.NotFound(new ErrorResponse("Resource not found."));
        }

        state.Resources.RemoveAll(item => item.Id == resourceId);
        AddActivity(state, "edit", $"Deleted resource \"{resource.Title}\".", "Havard Vestbo");
        PersistState(stateFilePath, state, jsonOptions);

        return Results.NoContent();
    }
})
.WithName("DeleteResource");

app.MapGet("/api/thesis/settings", () =>
{
    lock (stateLock)
    {
        return state.Settings;
    }
})
.WithName("GetThesisSettings");

app.MapPatch("/api/thesis/settings", (UpdateSettingsRequest request) =>
{
    lock (stateLock)
    {
        var current = state.Settings;

        state.Settings = current with
        {
            NotificationsEnabled = request.NotificationsEnabled ?? current.NotificationsEnabled,
            WeeklyWritingGoalHours = request.WeeklyWritingGoalHours.HasValue
                ? Math.Clamp(request.WeeklyWritingGoalHours.Value, 1, 80)
                : current.WeeklyWritingGoalHours,
            ReminderTime = string.IsNullOrWhiteSpace(request.ReminderTime)
                ? current.ReminderTime
                : request.ReminderTime.Trim(),
            PreferredView = string.IsNullOrWhiteSpace(request.PreferredView)
                ? current.PreferredView
                : request.PreferredView.Trim(),
        };

        AddActivity(state, "edit", "Updated dashboard settings.", "Havard Vestbo");
        PersistState(stateFilePath, state, jsonOptions);

        return Results.Ok(state.Settings);
    }
})
.WithName("UpdateThesisSettings");

app.MapGet("/api/thesis/activity", () =>
{
    lock (stateLock)
    {
        return state.Activity
            .OrderByDescending(item => item.Timestamp)
            .Take(40)
            .ToArray();
    }
})
.WithName("GetThesisActivity");

app.Run();

static DashboardDto BuildDashboardDto(AppState state)
{
    var metadata = BuildComputedMetadata(state);

    return new DashboardDto(
        metadata,
        state.Tasks
            .OrderBy(task => task.DueDate)
            .ToArray(),
        state.Milestones
            .OrderBy(milestone => milestone.Date)
            .ToArray(),
        state.Activity
            .OrderByDescending(activity => activity.Timestamp)
            .Take(20)
            .ToArray(),
        state.SupervisorNotes
            .OrderByDescending(note => note.IsPinned)
            .ThenByDescending(note => note.Timestamp)
            .ToArray(),
        state.Resources
            .OrderByDescending(resource => resource.AddedAt)
            .ToArray(),
        state.Settings
    );
}

static ThesisMetadataDto BuildComputedMetadata(AppState state)
{
    if (state.Tasks.Count == 0)
    {
        return state.Thesis;
    }

    var chapterAverage = state.Thesis.ChapterProgress.Average(chapter => chapter.CompletionPercent);
    var doneCount = state.Tasks.Count(task => string.Equals(task.Status, "Done", StringComparison.OrdinalIgnoreCase));
    var taskCompletionPercent = doneCount * 100.0 / state.Tasks.Count;
    var weightedCompletion = (chapterAverage * 0.85) + (taskCompletionPercent * 0.15);

    return state.Thesis with
    {
        OverallCompletionPercent = (int)Math.Round(Math.Clamp(weightedCompletion, 0, 100)),
    };
}

static string GetUrgency(DateOnly date)
{
    var daysUntil = date.DayNumber - DateOnly.FromDateTime(DateTime.UtcNow).DayNumber;
    if (daysUntil <= 3)
    {
        return "high";
    }

    if (daysUntil <= 10)
    {
        return "medium";
    }

    return "low";
}

static string? NormalizeTaskStatus(string status) =>
    status.Trim().ToLowerInvariant() switch
    {
        "not started" => "Not Started",
        "in progress" => "In Progress",
        "blocked" => "Blocked",
        "done" => "Done",
        _ => null,
    };

static string NormalizeUrgency(string? urgency)
{
    if (string.IsNullOrWhiteSpace(urgency))
    {
        return "medium";
    }

    return urgency.Trim().ToLowerInvariant() switch
    {
        "high" => "high",
        "medium" => "medium",
        "low" => "low",
        _ => "medium",
    };
}

static string NormalizeMilestoneStatus(string? status)
{
    if (string.IsNullOrWhiteSpace(status))
    {
        return "Planned";
    }

    return status.Trim().ToLowerInvariant() switch
    {
        "done" => "Done",
        _ => "Planned",
    };
}

static ActivityItemDto AddActivity(AppState state, string type, string message, string author)
{
    var activity = new ActivityItemDto(Guid.NewGuid(), type, message, DateTimeOffset.UtcNow, author);
    state.Activity.Insert(0, activity);
    return activity;
}

static AppState LoadOrCreateState(string filePath, JsonSerializerOptions options)
{
    if (File.Exists(filePath))
    {
        var rawJson = File.ReadAllText(filePath);
        var existing = JsonSerializer.Deserialize<AppState>(rawJson, options);
        if (existing is not null)
        {
            return NormalizeState(existing);
        }
    }

    var seeded = CreateSeedState();
    PersistState(filePath, seeded, options);
    return seeded;
}

static AppState NormalizeState(AppState state)
{
    state.Tasks ??= new List<TaskItemDto>();
    state.Milestones ??= new List<MilestoneItemDto>();
    state.Activity ??= new List<ActivityItemDto>();
    state.SupervisorNotes ??= new List<SupervisorNoteDto>();
    state.Resources ??= new List<ResourceItemDto>();

    state.Settings ??= new AppSettingsDto(
        NotificationsEnabled: true,
        WeeklyWritingGoalHours: 14,
        ReminderTime: "09:00",
        PreferredView: "Dashboard"
    );

    state.Thesis ??= new ThesisMetadataDto(
        "Adaptive Decision Support for Sustainable Construction Planning",
        "Havard Vestbo",
        "Dr. Ingrid Solheim",
        new DateOnly(2026, 12, 18),
        0,
        new[]
        {
            new ChapterProgressDto("Introduction", 92),
            new ChapterProgressDto("Literature Review", 74),
            new ChapterProgressDto("Methodology", 81),
            new ChapterProgressDto("Results", 48),
            new ChapterProgressDto("Discussion", 31),
            new ChapterProgressDto("Conclusion", 18),
        }
    );

    return state;
}

static void PersistState(string filePath, AppState state, JsonSerializerOptions options)
{
    var tempPath = $"{filePath}.tmp";
    File.WriteAllText(tempPath, JsonSerializer.Serialize(state, options));
    File.Move(tempPath, filePath, true);
}

static AppState CreateSeedState()
{
    var chapterProgress = new[]
    {
        new ChapterProgressDto("Introduction", 92),
        new ChapterProgressDto("Literature Review", 74),
        new ChapterProgressDto("Methodology", 81),
        new ChapterProgressDto("Results", 48),
        new ChapterProgressDto("Discussion", 31),
        new ChapterProgressDto("Conclusion", 18),
    };

    var tasks = new List<TaskItemDto>
    {
        new(
            Guid.Parse("ac50945f-f0f5-4f04-b6b8-f6f8e7f0a2a8"),
            "Refine mixed-methods rationale paragraph",
            "Clarify triangulation rationale and add citation.",
            "In Progress",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2)),
            true,
            "Writing"
        ),
        new(
            Guid.Parse("f1b77311-06ab-4538-96ea-f92864496cb9"),
            "Tag interview transcripts for thematic coding",
            "Code interviews from pilot batch.",
            "Not Started",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)),
            false,
            "Analysis"
        ),
        new(
            Guid.Parse("ea0aaeb4-d713-4fcb-9c73-a7a99f6765f5"),
            "Address supervisor notes on literature matrix",
            "Update matrix sections 2.1 to 2.4.",
            "Done",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)),
            false,
            "Review"
        ),
        new(
            Guid.Parse("3556fef9-afb2-412d-b2ff-4b95699b2322"),
            "Prepare visual template for Results figures",
            "Create chart baseline for chapter 4.",
            "Blocked",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(4)),
            true,
            "Design"
        ),
    };

    return new AppState
    {
        Thesis = new ThesisMetadataDto(
            "Adaptive Decision Support for Sustainable Construction Planning",
            "Havard Vestbo",
            "Dr. Ingrid Solheim",
            new DateOnly(2026, 12, 18),
            0,
            chapterProgress
        ),
        Tasks = tasks,
        Milestones = new List<MilestoneItemDto>
        {
            new(
                Guid.Parse("4dbaf31d-03b2-4ffa-ab69-113f0e206df3"),
                "Submit Results chapter draft",
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3)),
                "high",
                "Planned",
                Guid.Parse("3556fef9-afb2-412d-b2ff-4b95699b2322")
            ),
            new(
                Guid.Parse("9fce8b91-c03f-423b-bf88-b958167e8e44"),
                "Supervisor meeting and feedback review",
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
                "medium",
                "Planned",
                null
            ),
        },
        Activity = new List<ActivityItemDto>
        {
            new(
                Guid.Parse("e0b6cc2a-fe33-4b4b-9f18-3552f2f665a6"),
                "edit",
                "Revised Methodology section and clarified the data collection protocol.",
                DateTimeOffset.UtcNow.AddHours(-2),
                "Havard Vestbo"
            ),
            new(
                Guid.Parse("40e73792-ef66-4a66-8f80-47f264f19475"),
                "comment",
                "Supervisor comment: tighten the framing around sustainability KPIs.",
                DateTimeOffset.UtcNow.AddHours(-8),
                "Dr. Ingrid Solheim"
            ),
            new(
                Guid.Parse("79d4f315-13bf-46fa-882a-49d9bf6f69fe"),
                "upload",
                "Uploaded Draft v0.6 for internal review.",
                DateTimeOffset.UtcNow.AddDays(-1),
                "Havard Vestbo"
            ),
        },
        SupervisorNotes = new List<SupervisorNoteDto>
        {
            new(
                Guid.Parse("d86a3498-4ceb-4ee7-bf13-e9a4639dca7a"),
                "Focus Discussion on practical implications for sustainability KPIs.",
                DateTimeOffset.UtcNow.AddDays(-2),
                "Dr. Ingrid Solheim",
                true
            ),
            new(
                Guid.Parse("6b19f46d-8d73-4f5f-b290-cf2aa8d6e2c4"),
                "Keep Appendix A short; move details to supplementary material.",
                DateTimeOffset.UtcNow.AddDays(-5),
                "Dr. Ingrid Solheim",
                false
            ),
        },
        Resources = new List<ResourceItemDto>
        {
            new(
                Guid.Parse("3748c30a-9628-4f0b-b6bb-6dc97aa6d432"),
                "Writing Checklist",
                "Template",
                "https://example.org/thesis-checklist",
                "Weekly checklist for draft quality reviews.",
                DateTimeOffset.UtcNow.AddDays(-6)
            ),
            new(
                Guid.Parse("e1eb994f-43bd-4c6d-9200-e0fc59601e53"),
                "Sustainability KPI Reference",
                "Article",
                "https://example.org/sustainability-kpi",
                "Reference paper used in chapter 2.",
                DateTimeOffset.UtcNow.AddDays(-3)
            ),
        },
        Settings = new AppSettingsDto(
            NotificationsEnabled: true,
            WeeklyWritingGoalHours: 14,
            ReminderTime: "09:00",
            PreferredView: "Dashboard"
        ),
    };
}

sealed class AppState
{
    public ThesisMetadataDto Thesis { get; set; } = default!;
    public List<TaskItemDto> Tasks { get; set; } = [];
    public List<MilestoneItemDto> Milestones { get; set; } = [];
    public List<ActivityItemDto> Activity { get; set; } = [];
    public List<SupervisorNoteDto> SupervisorNotes { get; set; } = [];
    public List<ResourceItemDto> Resources { get; set; } = [];
    public AppSettingsDto Settings { get; set; } = default!;
}

record DashboardDto(
    ThesisMetadataDto Thesis,
    TaskItemDto[] Tasks,
    MilestoneItemDto[] Milestones,
    ActivityItemDto[] RecentActivity,
    SupervisorNoteDto[] SupervisorNotes,
    ResourceItemDto[] Resources,
    AppSettingsDto Settings
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

record TaskItemDto(
    Guid Id,
    string Title,
    string Description,
    string Status,
    DateOnly DueDate,
    bool IsPriority,
    string Category
);

record MilestoneItemDto(
    Guid Id,
    string Title,
    DateOnly Date,
    string Urgency,
    string Status,
    Guid? TaskId
);

record ActivityItemDto(
    Guid Id,
    string Type,
    string Message,
    DateTimeOffset Timestamp,
    string Author
);

record SupervisorNoteDto(
    Guid Id,
    string Message,
    DateTimeOffset Timestamp,
    string Author,
    bool IsPinned
);

record ResourceItemDto(
    Guid Id,
    string Title,
    string Type,
    string Url,
    string Description,
    DateTimeOffset AddedAt
);

record AppSettingsDto(
    bool NotificationsEnabled,
    int WeeklyWritingGoalHours,
    string ReminderTime,
    string PreferredView
);

record CreateTaskRequest(
    string Title,
    string? Description,
    DateOnly? DueDate,
    string? Category,
    bool? IsPriority
);

record UpdateTaskRequest(
    string? Title,
    string? Description,
    DateOnly? DueDate,
    string? Category,
    bool? IsPriority
);

record UpdateTaskStatusRequest(string Status);

record UploadDraftRequest(string FileName, string? Version, string? Notes);

record CreateMilestoneRequest(string Title, DateOnly? Date, string? Urgency, string? Status);

record UpdateMilestoneRequest(string? Title, DateOnly? Date, string? Urgency, string? Status);

record CreateSupervisorNoteRequest(string Message, string? Author, bool? IsPinned);

record CreateResourceRequest(string Title, string? Type, string? Url, string? Description);

record UpdateSettingsRequest(
    bool? NotificationsEnabled,
    int? WeeklyWritingGoalHours,
    string? ReminderTime,
    string? PreferredView
);

record UpdateThesisRequest(
    string? Title,
    string? StudentName,
    string? SupervisorName,
    DateOnly? EstimatedCompletionDate,
    ChapterProgressDto[]? ChapterProgress
);

record TaskMutationResponse(TaskItemDto Task, ActivityItemDto Activity, MilestoneItemDto? Milestone);

record DraftUploadResponse(ActivityItemDto Activity);

record MetadataMutationResponse(ThesisMetadataDto Thesis, ActivityItemDto Activity);

record ErrorResponse(string Error);
