"use client";

import { useSyncExternalStore } from "react";

import { site } from "@/shared/lib/site";

const listeners = new Set<() => void>();
let browserUrlBase: string = site.url;

function subscribe(listener: () => void) {
  listeners.add(listener);

  const nextUrlBase = window.location.origin;
  if (browserUrlBase !== nextUrlBase) {
    browserUrlBase = nextUrlBase;
    queueMicrotask(() => {
      listeners.forEach((notify) => notify());
    });
  }

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return browserUrlBase;
}

function getServerSnapshot() {
  return site.url;
}

export function useRuntimeUrlBase() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function buildRuntimeUrl(path: string, urlBase: string) {
  return new URL(path, urlBase).toString();
}
