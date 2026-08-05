"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";

interface Snapshot {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
}

const SERVER_SNAPSHOT: Snapshot = { theme: "system", resolvedTheme: "light" };

function readStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // localStorage 被禁用
  }
  return "system";
}

function resolve(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyDomClass(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

const listeners = new Set<() => void>();
let cache: Snapshot | null = null;

function notify() {
  cache = null;
  listeners.forEach((l) => l());
}

function getSnapshot(): Snapshot {
  if (cache) return cache;
  const theme = readStoredTheme();
  const resolvedTheme = resolve(theme);
  cache = { theme, resolvedTheme };
  return cache;
}

function subscribe(cb: () => void) {
  listeners.add(cb);

  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onMq = () => {
    const theme = readStoredTheme();
    if (theme === "system") applyDomClass(mq.matches ? "dark" : "light");
    notify();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    applyDomClass(resolve(readStoredTheme()));
    notify();
  };

  mq.addEventListener("change", onMq);
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", onMq);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTheme() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => SERVER_SNAPSHOT,
  );

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage 被禁用时仍应用到 DOM
    }
    applyDomClass(resolve(next));
    notify();
  }, []);

  return { ...snapshot, setTheme };
}
