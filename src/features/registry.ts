import type { ComponentType } from "react";
import {
  VSCodeIcon,
  ChromeIcon,
  EdgeIcon,
  DockerIcon,
  MicrosoftStoreIcon,
} from "@/shared/ui/icons";

export type TabIcon = ComponentType<{ className?: string }>;

export interface DownloaderProps {
  defaultValue?: string;
  onQueryChange?: (q: string) => void;
}

export interface FeatureTabConfig {
  id: string;
  icon: TabIcon;
  label: string;
  shortLabel?: string;
}

/**
 * 新增功能时在此数组添加一条记录，
 * 然后在 tab-page.tsx 的 tabLoaders 中添加对应的动态 import。
 */
export const featureTabs: FeatureTabConfig[] = [
  { id: "vscode", icon: VSCodeIcon, label: "VSCode 插件", shortLabel: "VSCode" },
  { id: "chrome", icon: ChromeIcon, label: "Chrome 拓展", shortLabel: "Chrome" },
  { id: "edge", icon: EdgeIcon, label: "Edge 拓展", shortLabel: "Edge" },
  { id: "docker", icon: DockerIcon, label: "Docker 镜像", shortLabel: "Docker" },
  { id: "msstore", icon: MicrosoftStoreIcon, label: "Microsoft 商店", shortLabel: "MS商店" },
];

export const tabIds = featureTabs.map((t) => t.id);
export const defaultTab = tabIds[0]!;

export type TabLoader = () => Promise<{
  default: ComponentType<DownloaderProps>;
}>;
