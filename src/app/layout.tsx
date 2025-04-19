import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OffDown - 离线下载工具",
  description: "一个简单的离线下载工具，支持 VSCode 插件和 Docker 镜像下载",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
