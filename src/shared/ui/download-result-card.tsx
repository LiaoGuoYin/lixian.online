import { Fragment, type ComponentType, type ReactNode } from "react";
import { Download, type LucideProps } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

export interface DownloadResultRow {
  icon: ComponentType<LucideProps>;
  title: ReactNode;
  description?: ReactNode;
  href: string;
  download?: string;
  external?: boolean;
  testId?: string;
  buttonLabel?: string;
}

interface Props {
  rows: DownloadResultRow[];
}

export function DownloadResultCard({ rows }: Props) {
  if (rows.length === 0) return null;

  return (
    <Card className="border border-primary/30 bg-primary/5 shadow-apple">
      <CardContent className="p-4 sm:p-5 space-y-3">
        {rows.map((row, index) => (
          <Fragment key={row.testId ?? `${index}-${row.href}`}>
            {index > 0 && <div className="border-t border-border/40" />}
            <DownloadResultRow {...row} />
          </Fragment>
        ))}
      </CardContent>
    </Card>
  );
}

function DownloadResultRow({
  icon: Icon,
  title,
  description,
  href,
  download,
  external,
  testId,
  buttonLabel = "下载",
}: DownloadResultRow) {
  const linkProps: Record<string, string> = {};
  if (download !== undefined) linkProps.download = download;
  if (external) {
    linkProps.target = "_blank";
    linkProps.rel = "noopener noreferrer";
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3 sm:items-center">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-apple-sm bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="break-all text-sm font-medium text-foreground sm:truncate">
            {title}
          </p>
          {description && (
            <div className="text-xs text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      <a
        href={href}
        {...linkProps}
        className="w-full flex-shrink-0 sm:w-auto"
        data-testid={testId}
      >
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full gap-1.5 sm:w-auto"
        >
          <Download className="h-3.5 w-3.5" />
          {buttonLabel}
        </Button>
      </a>
    </div>
  );
}
