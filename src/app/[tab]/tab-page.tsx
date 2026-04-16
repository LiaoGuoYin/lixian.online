"use client";

import { useState, useCallback, type ComponentType } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Card, CardContent } from "@/shared/ui/card";
import { Github } from "lucide-react";
import { LoadingSpinner } from "@/shared/ui/loading-spinner";
import { site } from "@/shared/lib/site";
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
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-3 pb-8 pt-6 sm:px-6 sm:pb-12 sm:pt-10 md:py-20 xl:max-w-5xl">
        {/* Hero Section */}
        <div className="mb-5 animate-fade-in text-center sm:mb-10 md:mb-12">
          <h1 className="mb-2 flex flex-wrap items-baseline justify-center gap-1 text-[1.75rem] font-bold tracking-tight text-foreground min-[360px]:text-3xl sm:mb-3 sm:text-4xl md:text-5xl">
            <span>Lixian</span>
            <Image
              src="/favicon.ico"
              alt=""
              width={16}
              height={16}
              className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4"
            />
            <span>Online</span>
          </h1>
          <p className="mx-auto max-w-md px-2 text-sm leading-relaxed text-muted-foreground sm:px-0 sm:text-base">
            {site.description}
          </p>
        </div>

        {/* Main Card */}
        <Card className="animate-slide-up overflow-visible rounded-[1.25rem] border-0 bg-card/80 shadow-apple-lg backdrop-blur-xl">
          <CardContent className="p-0">
            <div className="px-4 pb-0 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="w-full"
              >
                <TabsList className="grid h-auto w-full grid-cols-1 gap-1.5 rounded-apple border border-border/50 bg-secondary/60 p-1.5 backdrop-blur-sm min-[360px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {featureTabs.map((ft) => (
                    <TabsTrigger
                      key={ft.id}
                      value={ft.id}
                      data-testid={`tab-${ft.id}`}
                      className="h-full w-full min-w-0 gap-2 rounded-apple-sm px-3 py-2.5 text-sm font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-apple-button sm:px-4 sm:py-3"
                    >
                      <ft.icon className="h-4 w-4 flex-shrink-0" />
                      {ft.shortLabel ? (
                        <>
                          <span className="hidden xl:inline">{ft.label}</span>
                          <span className="xl:hidden">{ft.shortLabel}</span>
                        </>
                      ) : (
                        ft.label
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Tab Content */}
            <div className="p-4 sm:p-8 md:p-10">
              {featureTabs.map((ft) => {
                const Component = tabComponents[ft.id];
                return (
                  <div
                    key={ft.id}
                    className={activeTab !== ft.id ? "hidden" : undefined}
                  >
                    <Component
                      defaultValue={tab === ft.id ? initialQuery : undefined}
                      onQueryChange={handleQueryChange}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="mt-6 space-y-2 text-center animate-fade-in sm:mt-8 md:mt-12">
          <p
            className="text-[11px] text-muted-foreground/70 sm:text-xs"
            title={`构建时间: ${BUILD_TIME} | Commit: ${COMMIT_HASH}`}
          >
            版本 v{APP_VERSION}
          </p>
          <a
            href={site.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            <Github className="h-3.5 w-3.5" />
            GitHub
          </a>
        </footer>
      </div>
    </main>
  );
}
