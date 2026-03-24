"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Card, CardContent } from "@/shared/ui/card";
import VSCodeDownloader from "@/features/vscode/components/VSCodeDownloader";
import DockerDownloader from "@/features/docker/components/DockerDownloader";
import ChromeDownloader from "@/features/chrome/components/ChromeDownloader";
import { Blocks, Globe, Container, Github } from "lucide-react";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? "unknown";
const COMMIT_HASH = process.env.NEXT_PUBLIC_COMMIT_HASH ?? "unknown";

export default function Home() {
  const [activeTab, setActiveTab] = useState("vscode");

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
        {/* Hero Section */}
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3 tracking-tight">
            OffDown
          </h1>
          <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            离线下载 VSCode 插件、Chrome 扩展、Docker 镜像
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-apple-lg border-0 bg-card/80 backdrop-blur-xl rounded-apple-lg overflow-hidden animate-slide-up">
          <CardContent className="p-0">
            <div className="border-b border-border/40 px-6 pt-6 pb-0">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3 bg-secondary/60 backdrop-blur-sm rounded-apple p-1 border border-border/40 h-12">
                  <TabsTrigger
                    value="vscode"
                    className="rounded-apple-sm font-medium text-sm py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-apple-button data-[state=active]:text-foreground transition-all duration-200 gap-2"
                  >
                    <Blocks className="h-4 w-4" />
                    VSCode 插件
                  </TabsTrigger>
                  <TabsTrigger
                    value="chrome"
                    className="rounded-apple-sm font-medium text-sm py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-apple-button data-[state=active]:text-foreground transition-all duration-200 gap-2"
                  >
                    <Globe className="h-4 w-4" />
                    Chrome 扩展
                  </TabsTrigger>
                  <TabsTrigger
                    value="docker"
                    className="rounded-apple-sm font-medium text-sm py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-apple-button data-[state=active]:text-foreground transition-all duration-200 gap-2"
                  >
                    <Container className="h-4 w-4" />
                    Docker 镜像
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Tab Content */}
            <div className="p-6 md:p-8">
              {activeTab === "vscode" && <VSCodeDownloader />}
              {activeTab === "chrome" && <ChromeDownloader />}
              {activeTab === "docker" && <DockerDownloader />}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center mt-10 space-y-2 animate-fade-in">
          <p className="text-xs text-muted-foreground">解析一下，一下就好</p>
          <p
            className="text-xs text-muted-foreground/70"
            title={`构建时间: ${BUILD_TIME} | Commit: ${COMMIT_HASH}`}
          >
            版本 v{APP_VERSION}
          </p>
          <a
            href="https://github.com/liaoguoyin/offdown"
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
