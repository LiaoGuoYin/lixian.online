import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/shared/ui/toaster";
import { site } from "@/shared/lib/site";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#007AFF",
};

export const metadata: Metadata = {
  title: `${site.name} - ${site.description}`,
  description: `在线获取 VSCode 插件、Chrome 扩展、Docker 镜像的离线安装包`,
  keywords: [...site.keywords],
  authors: [{ name: site.author }],
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
