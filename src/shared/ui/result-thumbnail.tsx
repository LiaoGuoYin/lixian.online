"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, type ComponentType } from "react";

import { cn } from "@/shared/lib/util";

interface ResultThumbnailProps {
  src?: string;
  alt?: string;
  fallback: ComponentType<{ className?: string }>;
  className?: string;
  iconClassName?: string;
}

export function ResultThumbnail({
  src,
  alt = "",
  fallback: Fallback,
  className,
  iconClassName,
}: ResultThumbnailProps) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-apple-sm border border-border/60 bg-background",
        className,
      )}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Fallback className={cn("h-5 w-5 text-muted-foreground", iconClassName)} />
      )}
    </span>
  );
}
