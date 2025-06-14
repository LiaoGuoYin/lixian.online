import * as React from "react";

import { cn } from "@/shared/lib/util";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-apple border border-border bg-background/60 backdrop-blur-sm px-4 py-3 text-base font-medium shadow-apple-button transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-ring/50 focus-visible:bg-background focus-visible:shadow-apple hover:border-border/80 hover:bg-background/80 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
