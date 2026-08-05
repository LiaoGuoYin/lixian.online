import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/shared/ui/toaster";
import { Analytics } from "@vercel/analytics/react";
import { site } from "@/shared/lib/site";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F03050",
};

export const metadata: Metadata = {
  title: `${site.description} - ${site.name}`,
  description: `在线获取 VSCode 插件、Chrome 扩展、Docker 镜像的离线安装包`,
  keywords: [...site.keywords],
  authors: [{ name: site.author }],
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var sysDark=matchMedia('(prefers-color-scheme: dark)').matches;var dark=t==='dark'||((t==='system'||!t)&&sysDark);if(dark)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className="antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans">
        <div className="min-h-screen bg-background text-foreground">
          {children}
        </div>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
