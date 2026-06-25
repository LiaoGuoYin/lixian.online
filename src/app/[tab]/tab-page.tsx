"use client";

import { useState, useCallback, type ComponentType } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Github } from "lucide-react";
import { LoadingSpinner } from "@/shared/ui/loading-spinner";
import { site } from "@/shared/lib/site";
import { AgentAccessDialog } from "@/shared/ui/agent-access-dialog";
import {
  featureTabs,
  type DownloaderProps,
  type TabLoader,
} from "@/features/registry";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? "unknown";
const COMMIT_HASH = process.env.NEXT_PUBLIC_COMMIT_HASH ?? "unknown";

const DynamicFallback = () => (
  <div className="flex items-center justify-center py-12">
    <LoadingSpinner />
  </div>
);

const tabLoaders: Record<string, TabLoader> = {
  vscode: () => import("@/features/vscode/components/VSCodeDownloader"),
  chrome: () => import("@/features/chrome/components/ChromeDownloader"),
  msedge: () => import("@/features/edge/components/EdgeDownloader"),
  docker: () => import("@/features/docker/components/DockerDownloader"),
  msstore: () => import("@/features/msstore/components/MSStoreDownloader"),
};

const tabComponents: Record<
  string,
  ComponentType<DownloaderProps>
> = Object.fromEntries(
  featureTabs.map((tab) => [
    tab.id,
    dynamic(tabLoaders[tab.id], { ssr: false, loading: DynamicFallback }),
  ]),
);

function getInitialQuery() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

interface Props {
  tab: string;
}

export default function TabPage({ tab }: Props) {
  const [initialQuery] = useState(getInitialQuery);
  const [activeTab, setActiveTab] = useState(tab);

  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    window.history.replaceState(null, "", `/${newTab}`);
  }, []);

  const handleQueryChange = useCallback((q: string) => {
    const url = new URL(window.location.href);
    if (q) {
      url.searchParams.set("q", q);
    } else {
      url.searchParams.delete("q");
    }
    window.history.replaceState(null, "", url.toString());
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="animate-fade-in border-b border-border/70 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-apple-sm border border-border/70 bg-card shadow-apple">
                  <Image
                    src="/favicon.ico"
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7"
                    priority
                  />
                </span>
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                    Lixian Online
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {site.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <AgentAccessDialog />
              <a
                href={site.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-apple-sm border border-border/70 bg-card px-2.5 py-1.5 shadow-apple-button hover:text-foreground"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub
              </a>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-6 py-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8">
          <aside className="lg:sticky lg:top-5 lg:self-start">
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-apple-sm border border-border/70 bg-card/85 p-1.5 shadow-apple backdrop-blur-sm sm:grid-cols-3 lg:grid-cols-1">
                {featureTabs.map((ft) => (
                  <TabsTrigger
                    key={ft.id}
                    value={ft.id}
                    data-testid={`tab-${ft.id}`}
                    className="h-11 w-full min-w-0 justify-start gap-2 rounded-apple-sm px-3 text-sm font-medium whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-apple-button lg:h-12"
                  >
                    <ft.icon className="h-4 w-4 flex-shrink-0" />
                    {ft.shortLabel ? (
                      <>
                        <span className="hidden sm:inline lg:hidden xl:inline">
                          {ft.label}
                        </span>
                        <span className="sm:hidden lg:inline xl:hidden">
                          {ft.shortLabel}
                        </span>
                      </>
                    ) : (
                      ft.label
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </aside>

          <section className="min-w-0 animate-slide-up">
            {featureTabs.map((ft) => {
              const Component = tabComponents[ft.id];
              return (
                <div
                  key={ft.id}
                  data-testid={`panel-${ft.id}`}
                  className={activeTab !== ft.id ? "hidden" : undefined}
                >
                  <Component
                    defaultValue={tab === ft.id ? initialQuery : undefined}
                    onQueryChange={handleQueryChange}
                  />
                </div>
              );
            })}
          </section>
        </div>

        <footer className="border-t border-border/70 py-4 text-xs text-muted-foreground">
          <span title={`构建时间: ${BUILD_TIME} | Commit: ${COMMIT_HASH}`}>
            v{APP_VERSION}
          </span>
        </footer>
      </div>
    </main>
  );
}
