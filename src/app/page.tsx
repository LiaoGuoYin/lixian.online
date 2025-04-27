"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import VSCodeDownloader from "@/components/VSCodeDownloader";
import DockerDownloader from "@/components/DockerDownloader";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              OfflineDown - 开发插件下载
            </h1>
            <p className="text-lg text-gray-600">解析一下，一下就好</p>
          </div>

          <Card className="shadow-lg">
            <CardHeader></CardHeader>
            <CardContent>
              <Tabs defaultValue="vscode" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="vscode">VSCode 插件下载</TabsTrigger>
                  <TabsTrigger value="docker">TODO 拓展下载</TabsTrigger>
                </TabsList>
                <div className="mt-6">
                  <TabsContent value="vscode">
                    <Card className="border-0 shadow-none">
                      <CardContent>
                        <VSCodeDownloader />
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="docker">
                    <Card className="border-0 shadow-none">
                      <CardContent>
                        <DockerDownloader />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
