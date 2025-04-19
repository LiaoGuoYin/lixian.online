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
import axios from "axios";
import { useToast } from "@/hooks/useToast";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Link as LinkIcon } from "lucide-react";

export default function DockerDownloader() {
  const [image, setImage] = useState("");
  const [tag, setTag] = useState("latest");
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDownloadUrl("");

    try {
      // 解析镜像名称
      const [registry, repository] = image.split("/");
      if (!repository) {
        throw new Error("无效的镜像名称");
      }

      // 获取镜像 manifest
      const manifestUrl = `https://${registry}/v2/${repository}/manifests/${tag}`;
      const manifestResponse = await axios.get(manifestUrl, {
        headers: {
          Accept: "application/vnd.docker.distribution.manifest.v2+json",
        },
      });

      // 获取下载 URL
      const downloadUrl = `https://${registry}/v2/${repository}/blobs/${manifestResponse.data.config.digest}`;
      setDownloadUrl(downloadUrl);

      toast({
        title: "解析成功",
        description: "已找到下载链接",
      });
    } catch (error) {
      toast({
        title: "解析失败",
        description:
          error instanceof Error ? error.message : "请检查镜像名称是否正确",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">镜像名称</label>
          <Input
            placeholder="请输入 Docker 镜像名称（例如：nginx）"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">标签</label>
          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger>
              <SelectValue placeholder="选择标签" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">latest</SelectItem>
              <SelectItem value="stable">stable</SelectItem>
              <SelectItem value="alpine">alpine</SelectItem>
            </SelectContent>
          </Select>
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
