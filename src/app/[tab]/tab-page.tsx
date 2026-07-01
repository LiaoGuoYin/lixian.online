"use client";

import { useState, useCallback, type ComponentType } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Bot, Github, Tag } from "lucide-react";
import { LoadingSpinner } from "@/shared/ui/loading-spinner";
import { site } from "@/shared/lib/site";
import { Button } from "@/shared/ui/button";
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
  const [agentPanelVisible, setAgentPanelVisible] = useState(false);

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
        <header className="animate-fade-in">
          <div className="space-y-3">
            <div className="min-w-0 px-1">
              <h1 className="flex flex-wrap items-baseline gap-x-1.5 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                <span>Lixian</span>
                <Image
                  src="/favicon.ico"
                  alt=""
                  width={12}
                  height={12}
                  className="h-2.5 w-2.5 shrink-0 self-baseline rounded-full sm:h-3 sm:w-3"
                  priority
                />
                <span>Online</span>
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {site.description}
              </p>
            </div>

            <div className="-mx-4 overflow-x-auto border-y border-border/70 bg-card/60 px-4 py-2 shadow-[0_1px_0_rgba(15,23,42,0.03)] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="min-w-full"
              >
                <TabsList
                  aria-label="下载类型"
                  className="grid h-auto w-max min-w-full grid-cols-[repeat(5,minmax(7.5rem,1fr))] gap-1 bg-transparent p-0 text-muted-foreground"
                >
                  {featureTabs.map((ft) => (
                    <TabsTrigger
                      key={ft.id}
                      value={ft.id}
                      data-testid={`tab-${ft.id}`}
                      className="h-10 w-full min-w-0 justify-center gap-2 rounded-apple-sm border border-transparent bg-transparent px-3 text-sm font-medium whitespace-nowrap shadow-none transition-colors hover:bg-card/70 hover:text-foreground data-[state=active]:border-border/80 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-apple-button sm:h-11"
                    >
                      <ft.icon className="h-4 w-4 flex-shrink-0" />
                      {ft.shortLabel ? (
                        <>
                          <span className="hidden sm:inline">
                            {ft.label}
                          </span>
                          <span className="sm:hidden">{ft.shortLabel}</span>
                        </>
                      ) : (
                        ft.label
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col py-5">
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
                    agentPanelVisible={agentPanelVisible}
                  />
                </div>
              );
            })}
          </section>
        </div>

        <div className="pb-4">
          <AgentEnableBar
            visible={agentPanelVisible}
            onToggle={() => setAgentPanelVisible((visible) => !visible)}
          />
        </div>

        <footer className="border-t border-border/70 py-4 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-start gap-3 sm:justify-end">
            <span
              title={`构建时间: ${BUILD_TIME} | Commit: ${COMMIT_HASH}`}
              className="inline-flex items-center gap-1"
            >
              <Tag className="h-3.5 w-3.5" />
              v{APP_VERSION}
            </span>
            <a
              href={site.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}

function AgentEnableBar({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <section
      className="flex flex-col gap-3 rounded-apple-sm border border-border/70 bg-card/70 px-4 py-3 text-sm shadow-apple-button sm:flex-row sm:items-center sm:justify-between"
      aria-label="Agent 接入"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-apple-sm bg-primary/10 text-primary">
          <Bot className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-foreground">Agent 模式</div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {visible
              ? "已显示当前工具的 Prompt/API 复制卡片。"
              : "需要自动化接入时，再显示右侧 Prompt/API 卡片。"}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant={visible ? "outline" : "secondary"}
        size="sm"
        aria-pressed={visible}
        data-testid="agent-panel-toggle"
        onClick={onToggle}
        className="w-full gap-1.5 sm:w-auto"
      >
        <Bot className="h-3.5 w-3.5" />
        {visible ? "隐藏 Agent" : "启用 Agent"}
      </Button>
    </section>
  );
}
