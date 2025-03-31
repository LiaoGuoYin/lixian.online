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
  Select,
} from "@chakra-ui/react";
import axios from "axios";

export default function DockerDownloader() {
  const [image, setImage] = useState("");
  const [tag, setTag] = useState("latest");
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const toast = useToast();

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
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "解析失败",
        description:
          error instanceof Error ? error.message : "请检查镜像名称是否正确",
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
          placeholder="请输入 Docker 镜像名称（例如：nginx）"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          size="lg"
        />
        <Select value={tag} onChange={(e) => setTag(e.target.value)} size="lg">
          <option value="latest">latest</option>
          <option value="stable">stable</option>
          <option value="alpine">alpine</option>
        </Select>
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
