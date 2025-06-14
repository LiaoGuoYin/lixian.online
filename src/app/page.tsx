"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Card, CardContent } from "@/shared/ui/card";
import VSCodeDownloader from "@/features/vscode/components/VSCodeDownloader";
import DockerDownloader from "@/features/docker/components/DockerDownloader";

export default function Home() {
  const [activeTab, setActiveTab] = useState("vscode");

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-headline font-semibold text-foreground mb-6 tracking-tight">
              OffDown
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              开发套件下载工具
            </p>
          </div>

          {/* Main Card */}
          <Card className="shadow-apple-lg border-0 bg-card/80 backdrop-blur-xl rounded-apple-lg overflow-hidden animate-slide-up">
            <CardContent className="p-0">
              <div className="bg-gradient-to-b from-apple-gray-6/50 to-transparent p-8 pb-0">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 bg-secondary/60 backdrop-blur-sm rounded-apple p-1 border border-border/40 h-50">
                    <TabsTrigger
                      value="vscode"
                      className="rounded-apple-sm font-medium text-sm py-3 px-6 data-[state=active]:bg-background data-[state=active]:shadow-apple-button data-[state=active]:text-foreground transition-all duration-200"
                    >
                      VSCode 插件下载
                    </TabsTrigger>
                    <TabsTrigger
                      value="docker"
                      className="rounded-apple-sm font-medium text-sm py-3 px-6 data-[state=active]:bg-background data-[state=active]:shadow-apple-button data-[state=active]:text-foreground transition-all duration-200"
                    >
                      更多工具
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Tab Content */}
              <div className="p-8 pt-6">
                <div
                  className={`transition-all duration-300 ${
                    activeTab === "vscode"
                      ? "opacity-100 transform translate-y-0"
                      : "opacity-0 transform translate-y-2 pointer-events-none absolute"
                  }`}
                >
                  <VSCodeDownloader />
                </div>
                <div
                  className={`transition-all duration-300 ${
                    activeTab === "docker"
                      ? "opacity-100 transform translate-y-0"
                      : "opacity-0 transform translate-y-2 pointer-events-none absolute"
                  }`}
                >
                  <DockerDownloader />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-16 animate-fade-in">
            <p className="text-caption text-apple-gray-2">解析一下，一下就好</p>
          </div>
        </div>
      </div>
    </main>
  );
}
