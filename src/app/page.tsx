"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Card, CardContent } from "@/shared/ui/card";
import VSCodeDownloader from "@/features/vscode/components/VSCodeDownloader";
import DockerDownloader from "@/features/docker/components/DockerDownloader";
import ChromeDownloader from "@/features/chrome/components/ChromeDownloader";
import { Blocks, Globe, Container, ExternalLink } from "lucide-react";
import { site } from "@/shared/lib/site";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? "unknown";
const COMMIT_HASH = process.env.NEXT_PUBLIC_COMMIT_HASH ?? "unknown";

export default function Home() {
  const [activeTab, setActiveTab] = useState("vscode");

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-12 md:py-24">
        {/* Hero Section */}
        <div className="text-center mb-8 md:mb-12 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 md:mb-3 tracking-tight">
            {site.name}
          </h1>
          <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            {site.description}
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-apple-lg border-0 bg-card/80 backdrop-blur-xl rounded-apple-lg overflow-hidden animate-slide-up">
          <CardContent className="p-0">
            <div className="border-b border-border/40 px-3 sm:px-6 pt-4 sm:pt-6 pb-0">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3 bg-secondary/60 backdrop-blur-sm rounded-apple p-1 border border-border/40 h-10 sm:h-12">
                  <TabsTrigger
                    value="vscode"
                    className="rounded-apple-sm font-medium text-xs sm:text-sm py-2 sm:py-2.5 px-2 sm:px-4 data-[state=active]:bg-background data-[state=active]:shadow-apple-button data-[state=active]:text-foreground transition-all duration-200 gap-1.5 sm:gap-2"
                  >
                    <Blocks className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">VSCode 插件</span>
                    <span className="sm:hidden">VSCode</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="chrome"
                    className="rounded-apple-sm font-medium text-xs sm:text-sm py-2 sm:py-2.5 px-2 sm:px-4 data-[state=active]:bg-background data-[state=active]:shadow-apple-button data-[state=active]:text-foreground transition-all duration-200 gap-1.5 sm:gap-2"
                  >
                    <Globe className="h-4 w-4 flex-shrink-0" />
                    Chrome 拓展
                  </TabsTrigger>
                  <TabsTrigger
                    value="docker"
                    className="rounded-apple-sm font-medium text-xs sm:text-sm py-2 sm:py-2.5 px-2 sm:px-4 data-[state=active]:bg-background data-[state=active]:shadow-apple-button data-[state=active]:text-foreground transition-all duration-200 gap-1.5 sm:gap-2"
                  >
                    <Container className="h-4 w-4 flex-shrink-0" />
                    Docker 镜像
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Tab Content */}
            <div className="p-5 sm:p-8 md:p-10">
              {activeTab === "vscode" && <VSCodeDownloader />}
              {activeTab === "chrome" && <ChromeDownloader />}
              {activeTab === "docker" && <DockerDownloader />}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center mt-8 md:mt-12 space-y-2 animate-fade-in">
          <p
            className="text-xs text-muted-foreground/70"
            title={`构建时间: ${BUILD_TIME} | Commit: ${COMMIT_HASH}`}
          >
            版本 v{APP_VERSION}
          </p>
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {site.domain}
          </a>
        </footer>
      </div>
    </main>
  );
}
