/* eslint-disable @next/next/no-img-element */
import {
  Fragment,
  type ComponentType,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { Download, ExternalLink, type LucideProps } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/util";

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

export interface DownloadResultMeta {
  icon?: ComponentType<LucideProps>;
  label: ReactNode;
  value: ReactNode;
  testId?: string;
}

interface Props extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  imageUrl?: string;
  imageAlt?: string;
  metadata?: DownloadResultMeta[];
  rows?: DownloadResultRow[];
  footer?: ReactNode;
}

export function DownloadResultCard({
  title,
  eyebrow,
  description,
  imageUrl,
  imageAlt = "",
  metadata = [],
  rows = [],
  footer,
  className,
  ...props
}: Props) {
  if (
    !title &&
    !eyebrow &&
    !description &&
    !imageUrl &&
    metadata.length === 0 &&
    rows.length === 0 &&
    !footer
  ) {
    return null;
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-apple-sm border border-border/70 bg-card/95 text-card-foreground shadow-apple",
        className,
      )}
      {...props}
    >
      {(title || eyebrow || description || imageUrl || metadata.length > 0) && (
        <div className="space-y-4 border-b border-border/60 p-4 sm:p-5">
          {(title || eyebrow || description || imageUrl) && (
            <div className="flex min-w-0 items-start gap-3">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={imageAlt}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 shrink-0 rounded-apple-sm border border-border/60 bg-background object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}
              <div className="min-w-0 space-y-1.5">
                {eyebrow && (
                  <div className="text-xs font-medium text-primary">
                    {eyebrow}
                  </div>
                )}
                {title && (
                  <h3 className="break-words text-base font-semibold leading-snug text-foreground sm:text-lg">
                    {title}
                  </h3>
                )}
                {description && (
                  <div className="text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </div>
                )}
              </div>
            </div>
          )}

          {metadata.length > 0 && (
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {metadata.map((item, index) => (
                <MetaItem
                  key={item.testId ?? index}
                  {...item}
                />
              ))}
            </dl>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-3 p-4 sm:p-5">
          <div className="text-xs font-medium text-muted-foreground">
            下载项
          </div>
          {rows.map((row, index) => (
            <Fragment key={row.testId ?? `${index}-${row.href}`}>
              {index > 0 && <div className="border-t border-border/40" />}
              <DownloadResultRow {...row} />
            </Fragment>
          ))}
        </div>
      )}

      {footer && (
        <div className="border-t border-border/60 bg-secondary/45 p-4 text-sm text-muted-foreground sm:p-5">
          {footer}
        </div>
      )}
    </section>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
  testId,
}: DownloadResultMeta) {
  return (
    <div
      className="min-w-0 rounded-apple-sm border border-border/60 bg-secondary/45 px-3 py-2.5"
      data-testid={testId}
    >
      <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </dt>
      <dd className="break-words text-sm font-medium leading-snug text-foreground">
        {value}
      </dd>
    </div>
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
          {external ? (
            <ExternalLink className="h-3.5 w-3.5" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {buttonLabel}
        </Button>
      </a>
    </div>
  );
}
