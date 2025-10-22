"use client";

/**
 * Progress Tracker - Shows processing steps with status
 * Mimics Claude Code's todo list style of keeping users informed
 */

type StepStatus = "pending" | "in_progress" | "completed";

interface Step {
  id: string;
  label: string;
  status: StepStatus;
}

interface ProgressTrackerProps {
  steps: Step[];
}

export function ProgressTracker({ steps }: ProgressTrackerProps) {
  const completedCount = steps.filter(s => s.status === "completed").length;
  const totalSteps = steps.length;
  const progressPercentage = (completedCount / totalSteps) * 100;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Step {completedCount + 1} of {totalSteps}
          </span>
          <span className="text-muted-foreground">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Steps list */}
      <div className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 text-sm ${
              step.status === "pending" ? "text-muted-foreground/50" : ""
            }`}
          >
            {/* Status icon */}
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              {step.status === "completed" && (
                <span className="text-green-500">✅</span>
              )}
              {step.status === "in_progress" && (
                <span className="text-primary animate-pulse">🔄</span>
              )}
              {step.status === "pending" && (
                <span className="text-muted-foreground/50">⏳</span>
              )}
            </div>

            {/* Step label */}
            <span
              className={`${
                step.status === "in_progress"
                  ? "font-medium text-foreground animate-pulse"
                  : ""
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
