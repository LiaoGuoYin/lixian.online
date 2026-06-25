import { type ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/shared/lib/util";

interface ProgressCardProps {
  title: ReactNode;
  value?: ReactNode;
  progress: number;
  error?: ReactNode;
  detail?: ReactNode;
  onCancel?: () => void;
  className?: string;
}

export function ProgressCard({
  title,
  value,
  progress,
  error,
  detail,
  onCancel,
  className,
}: ProgressCardProps) {
  return (
    <section
      className={cn(
        "rounded-apple-sm border border-border/70 bg-card/95 p-4 shadow-apple sm:p-5",
        className,
      )}
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium text-foreground">{title}</span>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            {value && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {value}
              </span>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex h-7 w-7 items-center justify-center rounded-apple-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                title="取消下载"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
          />
        </div>
        {detail && (
          <div className="text-xs tabular-nums text-muted-foreground">
            {detail}
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </section>
  );
}
