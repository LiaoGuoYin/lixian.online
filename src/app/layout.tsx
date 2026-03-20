import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/shared/ui/toaster";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#007AFF",
};

export const metadata: Metadata = {
  title: "OffDown - 开发套件下载助手",
  description: "离线下载 VSCode 插件、Chrome 扩展、Docker 镜像",
  keywords: ["开发工具", "下载", "VSCode", "插件", "开发者工具"],
  authors: [{ name: "OffDown Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className="antialiased">
      <body className="font-sans">
        <div className="min-h-screen bg-background text-foreground">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
