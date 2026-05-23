"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme, type Theme } from "@/hooks/useTheme";
import { cn } from "@/shared/lib/util";

const NEXT: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const LABEL: Record<Theme, string> = {
  light: "当前：亮色（点击切到暗色）",
  dark: "当前：暗色（点击切到跟随系统）",
  system: "当前：跟随系统（点击切到亮色）",
};

const ICON: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

interface Props {
  className?: string;
}

export function ThemeToggle({ className }: Props) {
  const { theme, setTheme } = useTheme();
  const Icon = ICON[theme];

  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[theme])}
      aria-label={LABEL[theme]}
      title={LABEL[theme]}
      data-testid="theme-toggle"
      data-theme={theme}
      className={cn(
        "inline-flex items-center justify-center rounded-full p-1.5 text-muted-foreground/60 transition-colors hover:text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}
