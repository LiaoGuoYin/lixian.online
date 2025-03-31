"use client";

import { useState } from "react";
import {
  Box,
  Input,
  Button,
  VStack,
  Text,
  useToast,
  Link,
} from "@chakra-ui/react";
import axios from "axios";
import { get } from "lodash";

// https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery
function getVersionList(
  publisher: string,
  extension: string
): Promise<string[]> {
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
    flags: 8704,
  };
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json;api-version=3.0-preview.1",
  };

  // request with headers
  return axios
    .post(url, payload, { headers })
    .then((response) => {
      const versions = response.data.results[0].extensions.map(
        (extension: any) => extension.versions[0].version
      );
      return versions;
    })
    .catch((error) => {
      console.error("Error fetching version list:", error);
      throw error;
    });
}

export default function VSCodeDownloader() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDownloadUrl("");

    try {
      // 从 URL 中提取发布者和扩展名
      const urlObj = new URL(url);
      const itemName = urlObj.searchParams.get("itemName");
      if (!itemName) {
        throw new Error("无效的插件 URL");
      }

      const [publisher, extension] = itemName.split(".");

      getVersionList(publisher, extension)
        .then((versions) => {
          if (versions.length === 0) {
            throw new Error("未找到插件版本");
          }
          // 选择最新版本
          const latestVersion = versions[0];
          // 构建下载 URL
          const downloadUrl = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${extension}/${latestVersion}/vspackage`;
          setDownloadUrl(downloadUrl);
          console.log(downloadUrl);
          toast({
            title: "解析成功",
            description: "已找到下载链接",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        })
        .catch((error) => {
          toast({
            title: "解析失败",
            description:
              error instanceof Error ? error.message : "请检查 URL 是否正确",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
        });
    } catch (error) {
      toast({
        title: "解析失败",
        description:
          error instanceof Error ? error.message : "请检查 URL 是否正确",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack spacing={4}>
        <Input
          placeholder="请输入 VSCode 插件 URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          size="lg"
        />
        <Button
          type="submit"
          colorScheme="blue"
          isLoading={loading}
          loadingText="解析中..."
        >
          解析下载链接
        </Button>

        {downloadUrl && (
          <Box w="100%" p={4} borderWidth={1} borderRadius="md">
            <Text mb={2}>下载链接：</Text>
            <Link href={downloadUrl} color="blue.500" isExternal>
              {downloadUrl}
            </Link>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
