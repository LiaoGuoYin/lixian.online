"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Link as LinkIcon } from "lucide-react";

import { post } from "@/utils/http";
import { useStore } from "@/stores/useStore";

async function getVersionList(publisher: string, extension: string) {
  const url = `https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery`;
  const payload = {
    filters: [
      {
        criteria: [
          {
            filterType: 7,
            value: `${publisher}.${extension}`,
          },
        ],
        pageNumber: 1,
        pageSize: 100,
        sortBy: 0,
        sortOrder: 0,
      },
    ],
    flags: 402,
  };

  const response = await post(url, payload);
  const versions = response.data.results[0].extensions[0].versions.map(
    (each: any) => {
      return each.version;
    }
  );

  const {
    publisher: publisherDict,
    lastUpdated,
    shortDescription,
    versions: versionList,
  } = response.data.results[0].extensions[0];

  console.log(publisherDict, lastUpdated, shortDescription, versionList);

  return { lastUpdated, shortDescription, versionList };
}

export default function VSCodeDownloader() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [publisher, setPublisher] = useState("");
  const [extension, setExtension] = useState("");
  const { versionList, setVersionList } = useStore();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDownloadUrl("");
    // setVersions([]);
    setSelectedVersion("");

    try {
      // 从 URL 中提取发布者和扩展名
      const urlObj = new URL(url);
      const itemName = urlObj.searchParams.get("itemName");
      if (!itemName) {
        throw new Error("无效的插件 URL");
      }

      const [pub, ext] = itemName.split(".");
      setPublisher(pub);
      setExtension(ext);

      // 获取版本列表
      const { versionList } = await getVersionList(pub, ext);
      setVersionList(versionList);
      setSelectedVersion(versionList[0].version);

      if (versionList.length === 0) {
        throw new Error("未找到插件版本");
      }

      toast({
        title: "解析成功",
        description: "成功解析插件离线链接，并选中最新版本",
      });
    } catch (error) {
      toast({
        title: "解析失败",
        description:
          error instanceof Error ? error.message : "请检查 URL 是否正确",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVersionChange = (version: string) => {
    setSelectedVersion(version);
    const downloadUrl = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${extension}/${version}/vspackage`;
    setDownloadUrl(downloadUrl);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">插件 URL</label>
          <Input
            placeholder="请输入 VSCode 插件 URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              解析中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              解析下载链接
            </span>
          )}
        </Button>
      </div>

      {versionList.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">选择版本</label>
          <Select value={selectedVersion} onValueChange={handleVersionChange}>
            <SelectTrigger>
              <SelectValue placeholder="选择版本" />
            </SelectTrigger>
            <SelectContent>
              {versionList.map((vl) => (
                <SelectItem key={vl.version} value={vl.version}>
                  {vl.version} - {vl.lastUpdated}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {downloadUrl && (
        <Card className="border border-blue-100 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Download className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">
                下载链接
              </span>
            </div>
            <a
              href={downloadUrl}
              className="text-blue-600 hover:text-blue-800 hover:underline break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              {downloadUrl}
            </a>
          </CardContent>
        </Card>
      )}
    </form>
  );
}
