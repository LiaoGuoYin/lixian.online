import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/shared/ui/toaster";

export const metadata: Metadata = {
  title: "OffDown - 开发套件下载工具",
  description: "简洁、高效的开发套件下载工具，专为开发者打造",
  keywords: ["开发工具", "下载", "VSCode", "插件", "开发者工具"],
  authors: [{ name: "OffDown Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#007AFF",
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
