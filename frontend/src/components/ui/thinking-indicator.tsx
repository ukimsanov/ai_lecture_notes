"use client";

/**
 * Status Indicator - Clean text only
 * Shows current processing status without animations
 */

export function ThinkingIndicator({ status }: { status?: string }) {
  return (
    <div className="py-4">
      {/* Status text only */}
      {status && (
        <span className="text-sm text-muted-foreground">
          {status}
        </span>
      )}
    </div>
  );
}
