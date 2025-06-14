import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/util";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-apple text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-apple hover:bg-primary/90 active:shadow-apple-button-pressed font-semibold",
        destructive:
          "bg-destructive text-destructive-foreground shadow-apple hover:bg-destructive/90 active:shadow-apple-button-pressed font-semibold",
        outline:
          "border border-border bg-background/60 backdrop-blur-sm shadow-apple-button hover:bg-accent/50 hover:text-accent-foreground hover:border-border/60 active:bg-accent/70",
        secondary:
          "bg-secondary/80 text-secondary-foreground shadow-apple-button hover:bg-secondary active:bg-secondary/60 backdrop-blur-sm",
        ghost:
          "hover:bg-accent/50 hover:text-accent-foreground rounded-apple-sm active:bg-accent/70 transition-colors",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80 rounded-apple-sm",
        apple:
          "bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-apple hover:from-primary/90 hover:to-primary/80 active:shadow-apple-button-pressed font-semibold border border-primary/20",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-apple-sm px-4 text-xs font-medium",
        lg: "h-12 rounded-apple-lg px-8 text-base font-semibold",
        icon: "h-11 w-11",
        xl: "h-14 rounded-apple-lg px-10 text-lg font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
